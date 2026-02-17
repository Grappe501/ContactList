import { parseCsv, decodeBase64ToUtf8 as decodeCsvB64 } from "../shared/csv";
import { sha256Hex } from "../shared/fingerprint";
import { importsRepo } from "../repositories/importsRepo";
import { parseVcards, decodeBase64ToUtf8 as decodeVcardB64, type VCard } from "../shared/vcard";

type PreviewReq = {
  file_name?: string | null;
  csv_text?: string;
  csv_base64?: string;
  vcard_text?: string;
  vcard_base64?: string;
  delimiter?: string;
  has_header?: boolean;
  source_label?: string | null;
  max_preview_rows?: number;
};

type CommitReq = PreviewReq & {
  source_type?: "google" | "csv" | "vcard" | "donated" | "manual";
  source_label: string;
  donor_name?: string | null;
  donor_org?: string | null;
  operator_label?: string | null;

  // CSV
  mapping?: Record<string, string | null>;
  defaults?: Record<string, string | null>;
};

const CANON_FIELDS = [
  "full_name","first_name","middle_name","last_name","suffix",
  "primary_email","primary_phone","street","street2","city","state","postal_code","country",
  "company","title","organization","website","birthday"
] as const;

function getCsvText(req: PreviewReq): string {
  if (req.csv_text && typeof req.csv_text === "string") return req.csv_text;
  if (req.csv_base64 && typeof req.csv_base64 === "string") return decodeCsvB64(req.csv_base64);
  throw new Error("csv_text or csv_base64 is required");
}

function getVcardText(req: PreviewReq): string {
  if (req.vcard_text && typeof req.vcard_text === "string") return req.vcard_text;
  if (req.vcard_base64 && typeof req.vcard_base64 === "string") return decodeVcardB64(req.vcard_base64);
  throw new Error("vcard_text or vcard_base64 is required");
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "");
}

function guessMapping(headers: string[]): Record<string, string | null> {
  const norm = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  const pick = (candidates: string[]): string | null => {
    for (const cand of candidates) {
      const n = normalizeHeader(cand);
      const hit = norm.find((x) => x.norm === n) ?? norm.find((x) => x.norm.includes(n));
      if (hit) return hit.raw;
    }
    return null;
  };

  return {
    full_name: pick(["full name","name","contact name"]),
    first_name: pick(["first name","firstname","given name","given"]),
    last_name: pick(["last name","lastname","surname","family name","family"]),
    primary_email: pick(["email","email address","e-mail","e mail","primary email"]),
    primary_phone: pick(["phone","phone number","mobile","cell","cell phone","mobile phone"]),
    street: pick(["address","street","street address","address 1","address1"]),
    street2: pick(["address 2","address2","apt","unit","suite"]),
    city: pick(["city","town"]),
    state: pick(["state","province","region"]),
    postal_code: pick(["zip","zipcode","postal","postal code"]),
    country: pick(["country"]),
    company: pick(["company","employer","business"]),
    title: pick(["title","job title"]),
    organization: pick(["organization","org"]),
    website: pick(["website","url"]),
    birthday: pick(["birthday","birthdate","dob"]),
    middle_name: pick(["middle name","middlename"]),
    suffix: pick(["suffix"]),
  };
}

function profileColumns(rows: Record<string, string>[], headers: string[]) {
  const prof: Record<string, any> = {};
  for (const h of headers) {
    const vals = rows.map((r) => (r[h] ?? "").trim()).filter(Boolean);
    const unique = new Set(vals);
    prof[h] = {
      non_empty: vals.length,
      unique: unique.size,
      example: vals.slice(0, 3),
      max_len: vals.reduce((m, v) => Math.max(m, v.length), 0),
    };
  }
  return prof;
}

function toRowObjects(table: string[][], hasHeader: boolean) {
  if (table.length === 0) return { headers: [] as string[], rows: [] as Record<string, string>[] };

  let headers: string[] = [];
  let startIdx = 0;

  if (hasHeader) {
    headers = table[0].map((h, i) => (h && h.trim() ? h.trim() : `column_${i+1}`));
    startIdx = 1;
  } else {
    const cols = Math.max(...table.map((r) => r.length));
    headers = Array.from({ length: cols }, (_, i) => `column_${i+1}`);
  }

  const rows: Record<string, string>[] = [];
  for (let i = startIdx; i < table.length; i++) {
    const r = table[i];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = (r[c] ?? "").trim();
    rows.push(obj);
  }
  return { headers, rows };
}

function buildNormalizedContactFromCsv(row: Record<string, string>, mapping: Record<string, string | null>, defaults?: Record<string, string | null>) {
  const get = (field: string): string | null => {
    const col = mapping[field];
    const v = col ? (row[col] ?? "").trim() : "";
    const d = defaults?.[field] ?? null;
    return v || (d ? String(d) : null);
  };

  let full_name = get("full_name");
  const first = get("first_name");
  const last = get("last_name");
  if (!full_name) {
    const parts = [first, last].filter(Boolean);
    if (parts.length) full_name = parts.join(" ");
  }
  if (!full_name) full_name = "(unknown)";

  const primary_email = get("primary_email");
  const primary_phone = get("primary_phone");

  // Unmapped -> metadata.custom_fields
  const mappedCols = new Set(Object.values(mapping).filter(Boolean) as string[]);
  const custom_fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!mappedCols.has(k) && v) custom_fields[k] = v;
  }

  const meta = {
    alt_names: [] as string[],
    nicknames: [] as string[],
    socials: {} as Record<string,string>,
    custom_fields,
    flags: { needs_review: false, do_not_contact: false },
  };

  return {
    full_name,
    first_name: first,
    middle_name: get("middle_name"),
    last_name: last,
    suffix: get("suffix"),
    primary_email,
    primary_phone,
    emails: primary_email ? [primary_email] : [],
    phones: primary_phone ? [primary_phone] : [],
    street: get("street"),
    street2: get("street2"),
    city: get("city"),
    state: get("state"),
    postal_code: get("postal_code"),
    country: get("country") ?? "USA",
    company: get("company"),
    title: get("title"),
    organization: get("organization"),
    website: get("website"),
    birthday: get("birthday"),
    metadata: meta,
  };
}

function buildNormalizedContactFromVcard(card: VCard, defaults?: Record<string, string | null>) {
  const first = card.n?.first ?? null;
  const last = card.n?.last ?? null;
  const middle = card.n?.middle ?? null;
  const suffix = card.n?.suffix ?? null;

  const full_name = card.fn ?? [first, last].filter(Boolean).join(" ") ?? "(unknown)";

  const primary_email = card.emails[0] ?? null;
  const primary_phone = card.tels[0] ?? null;

  const meta = {
    alt_names: [] as string[],
    nicknames: [] as string[],
    socials: {} as Record<string,string>,
    custom_fields: {
      ...(card.note ? { note: card.note } : {}),
    },
    flags: { needs_review: false, do_not_contact: false },
  };

  return {
    full_name,
    first_name: first,
    middle_name: middle,
    last_name: last,
    suffix,
    primary_email,
    primary_phone,
    emails: card.emails ?? [],
    phones: card.tels ?? [],
    street: card.adr?.street ?? null,
    street2: null,
    city: card.adr?.city ?? null,
    state: card.adr?.region ?? null,
    postal_code: card.adr?.postal ?? null,
    country: card.adr?.country ?? (defaults?.country ?? "USA"),
    company: card.org ?? null,
    title: card.title ?? null,
    organization: card.org ?? null,
    website: card.url ?? null,
    birthday: card.bday ?? null,
    metadata: meta,
  };
}

export const importService = {
  async csvPreview(req: PreviewReq) {
    const csvText = getCsvText(req);
    const delimiter = req.delimiter ?? ",";
    const hasHeader = req.has_header ?? true;
    const maxPreview = Math.min(req.max_preview_rows ?? 25, 200);

    const table = parseCsv(csvText, { delimiter, maxRows: maxPreview + (hasHeader ? 1 : 0) });
    const { headers, rows } = toRowObjects(table.rows, hasHeader);

    const sample = rows.slice(0, maxPreview);
    const mapping_suggestion = guessMapping(headers);
    const column_profile = profileColumns(sample, headers);

    return {
      file_name: req.file_name ?? null,
      delimiter,
      has_header: hasHeader,
      headers,
      sample_rows: sample.slice(0, 10),
      column_profile,
      mapping_suggestion,
      supported_canonical_fields: CANON_FIELDS,
      warnings: headers.length === 0 ? ["No headers detected."] : [],
    };
  },

  async csvCommit(req: CommitReq) {
    if (!req.source_label) throw new Error("source_label is required");
    if (!req.mapping) throw new Error("mapping is required for csvCommit");

    const csvText = getCsvText(req);
    const delimiter = req.delimiter ?? ",";
    const hasHeader = req.has_header ?? true;

    const table = parseCsv(csvText, { delimiter });
    const { headers, rows } = toRowObjects(table.rows, hasHeader);

    for (const [, header] of Object.entries(req.mapping ?? {})) {
      if (header && !headers.includes(header)) {
        throw new Error(`Mapping header not found: ${header}`);
      }
    }

    const batchMeta = { delimiter, has_header: hasHeader, headers, mapping: req.mapping, defaults: req.defaults ?? {} };

    const batch = await importsRepo.createBatch({
      source_type: (req.source_type ?? "csv") as any,
      source_label: req.source_label,
      file_name: req.file_name ?? null,
      donor_name: req.donor_name ?? null,
      donor_org: req.donor_org ?? null,
      operator_label: req.operator_label ?? null,
      meta: batchMeta,
      record_count: rows.length,
    });

    const normalized = rows.map((r, idx) => {
      const normalizedContact = buildNormalizedContactFromCsv(r, req.mapping!, req.defaults);
      const rowFingerprint = sha256Hex(JSON.stringify({ headers, row: r }));
      return { idx, raw: r, normalized: normalizedContact, rowFingerprint };
    });

    const result = await importsRepo.commitCsvBatch(batch.id, {
      source_label: req.source_label,
      source_type: (req.source_type ?? "csv") as any,
      rows: normalized,
    });

    return result;
  },

  async vcardPreview(req: PreviewReq) {
    const text = getVcardText(req);
    const cards = parseVcards(text);
    const sample = cards.slice(0, 10).map((c) => ({
      fn: c.fn ?? null,
      n: c.n ?? null,
      email: c.emails[0] ?? null,
      tel: c.tels[0] ?? null,
      org: c.org ?? null,
      title: c.title ?? null,
      city: c.adr?.city ?? null,
      state: c.adr?.region ?? null,
    }));

    return {
      file_name: req.file_name ?? null,
      card_count: cards.length,
      sample_cards: sample,
      mapping_note: "vCard is mapped via standard fields (FN/N/EMAIL/TEL/ADR/ORG/TITLE/URL/BDAY/NOTE). Unrecognized fields are ignored in this overlay.",
    };
  },

  async vcardCommit(req: CommitReq) {
    if (!req.source_label) throw new Error("source_label is required");
    const text = getVcardText(req);
    const cards = parseVcards(text);

    const batch = await importsRepo.createBatch({
      source_type: "vcard",
      source_label: req.source_label,
      file_name: req.file_name ?? null,
      donor_name: req.donor_name ?? null,
      donor_org: req.donor_org ?? null,
      operator_label: req.operator_label ?? null,
      meta: { format: "vcard", defaults: req.defaults ?? {} },
      record_count: cards.length,
    });

    const normalized = cards.map((c, idx) => {
      const normalizedContact = buildNormalizedContactFromVcard(c, req.defaults);
      const rowFingerprint = sha256Hex(JSON.stringify({ fn: c.fn, n: c.n, emails: c.emails, tels: c.tels, adr: c.adr, org: c.org, title: c.title, url: c.url, bday: c.bday }));
      return { idx, raw: c, normalized: normalizedContact, rowFingerprint };
    });

    const result = await importsRepo.commitVcardBatch(batch.id, {
      source_label: req.source_label,
      source_type: "vcard",
      rows: normalized,
    });

    return result;
  },

  async listBatches() {
    return await importsRepo.listBatches();
  },
};
