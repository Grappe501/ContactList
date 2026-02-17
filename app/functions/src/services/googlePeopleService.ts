import { requireEnv, optionalEnv } from "../shared/env";
import { oauthRepo } from "../repositories/oauthRepo";
import { sha256Hex } from "../shared/fingerprint";
import { importsRepo } from "../repositories/importsRepo";

const PEOPLE_SCOPE = "https://www.googleapis.com/auth/contacts.readonly";

function redirectUri(): string {
  const base = requireEnv("APP_BASE_URL").replace(/\/$/, "");
  const path = optionalEnv("GOOGLE_OAUTH_REDIRECT_PATH") ?? "/.netlify/functions/api/integrations/google/callback";
  return `${base}${path}`;
}

export function googleAuthUrl(state: string): string {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const ru = encodeURIComponent(redirectUri());
  const scope = encodeURIComponent(PEOPLE_SCOPE);
  const s = encodeURIComponent(state);
  return `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${ru}&scope=${scope}&access_type=offline&prompt=consent&state=${s}`;
}

export async function exchangeCodeForTokens(code: string) {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Token exchange failed: ${resp.status} ${t}`);
  }

  return await resp.json() as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
    token_type: string;
    id_token?: string;
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Token refresh failed: ${resp.status} ${t}`);
  }

  return await resp.json() as {
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type: string;
  };
}

async function fetchConnections(accessToken: string) {
  const results: any[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
    const url = new URL("https://people.googleapis.com/v1/people/me/connections");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("personFields", "names,emailAddresses,phoneNumbers,organizations,addresses,urls,birthdays");
    if (nextPageToken) url.searchParams.set("pageToken", nextPageToken);

    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`People API failed: ${resp.status} ${t}`);
    }

    const data = await resp.json() as any;
    results.push(...(data.connections ?? []));
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return results;
}

function normalizePerson(p: any) {
  const name = p.names?.[0];
  const full_name = name?.displayName ?? "(unknown)";
  const first_name = name?.givenName ?? null;
  const last_name = name?.familyName ?? null;

  const primary_email = p.emailAddresses?.[0]?.value ?? null;
  const primary_phone = p.phoneNumbers?.[0]?.value ?? null;

  const addr = p.addresses?.[0];
  const street = addr?.streetAddress ?? null;
  const city = addr?.city ?? null;
  const state = addr?.region ?? null;
  const postal_code = addr?.postalCode ?? null;
  const country = addr?.country ?? "USA";

  const org = p.organizations?.[0];
  const company = org?.name ?? null;
  const title = org?.title ?? null;

  const website = p.urls?.[0]?.value ?? null;

  const b = p.birthdays?.[0];
  const birthday = b?.date ? `${b.date.year ?? ""}-${String(b.date.month ?? "").padStart(2,"0")}-${String(b.date.day ?? "").padStart(2,"0")}` : null;

  const meta = {
    alt_names: [] as string[],
    nicknames: [] as string[],
    socials: {} as Record<string,string>,
    custom_fields: {} as Record<string, any>,
    flags: { needs_review: false, do_not_contact: false },
  };

  return {
    full_name,
    first_name,
    middle_name: null,
    last_name,
    suffix: null,
    primary_email,
    primary_phone,
    emails: primary_email ? [primary_email] : [],
    phones: primary_phone ? [primary_phone] : [],
    street,
    street2: null,
    city,
    state,
    postal_code,
    country,
    company,
    title,
    organization: company,
    website,
    birthday,
    metadata: meta,
  };
}

export const googlePeopleService = {
  async status() {
    const tok = await oauthRepo.getGoogleToken();
    return { connected: Boolean(tok), account_email: tok?.account_email ?? null, scopes: tok?.scopes ?? [] };
  },

  async saveTokens(tokens: { access_token: string; refresh_token?: string; expires_in: number; scope?: string }) {
    if (!tokens.refresh_token) {
      // Google may omit refresh_token if already granted & prompt not consent.
      // We always request prompt=consent; still guard here.
      throw new Error("Google did not return a refresh_token. Reconnect with prompt=consent.");
    }
    const expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const scopes = (tokens.scope ?? "").split(" ").filter(Boolean);
    await oauthRepo.saveGoogleToken({
      account_email: null,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expires_at,
      scopes,
    });
  },

  async sync(dto: { source_label: string; donor_name?: string | null; donor_org?: string | null; operator_label?: string | null }) {
    const tok = await oauthRepo.getGoogleToken();
    if (!tok) throw new Error("Google is not connected");

    // Refresh access token every sync (safe).
    const refreshed = await refreshAccessToken(tok.refresh_token);
    const access_token = refreshed.access_token;
    const expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await oauthRepo.saveGoogleToken({
      account_email: tok.account_email,
      refresh_token: tok.refresh_token,
      access_token,
      expires_at,
      scopes: tok.scopes.length ? tok.scopes : (refreshed.scope ?? "").split(" ").filter(Boolean),
    });

    const people = await fetchConnections(access_token);

    const batch = await importsRepo.createBatch({
      source_type: "google",
      source_label: dto.source_label,
      file_name: null,
      donor_name: dto.donor_name ?? null,
      donor_org: dto.donor_org ?? null,
      operator_label: dto.operator_label ?? "google_sync",
      meta: { provider: "google_people", personFields: "names,emailAddresses,phoneNumbers,organizations,addresses,urls,birthdays" },
      record_count: people.length,
    });

    // Reuse importsRepo commitCsvBatch style by creating rows; but source_type differs. We'll call a dedicated repo method.
    const rows = people.map((p, idx) => {
      const norm = normalizePerson(p);
      const fingerprint = sha256Hex(JSON.stringify({ resourceName: p.resourceName, etag: p.etag, emails: p.emailAddresses, phones: p.phoneNumbers }));
      return { idx, raw: p, normalized: norm, rowFingerprint: fingerprint, external_id: p.resourceName ?? null };
    });

    const result = await importsRepo.commitGoogleBatch(batch.id, {
      source_label: dto.source_label,
      rows,
    });

    return result;
  },
};
