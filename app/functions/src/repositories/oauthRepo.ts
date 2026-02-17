import { getPool } from "../shared/db";
import { encryptString, decryptString } from "../shared/crypto";

export type StoredToken = {
  id: string;
  provider: string;
  account_email: string | null;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  scopes: string[];
};

export const oauthRepo = {
  async getGoogleToken(): Promise<StoredToken | null> {
    const pool = getPool();
    const res = await pool.query(`SELECT * FROM oauth_tokens WHERE provider='google' ORDER BY updated_at DESC LIMIT 1`);
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      provider: row.provider,
      account_email: row.account_email,
      refresh_token: decryptString(row.encrypted_refresh_token),
      access_token: row.encrypted_access_token ? decryptString(row.encrypted_access_token) : null,
      access_token_expires_at: row.access_token_expires_at ? (row.access_token_expires_at.toISOString?.() ?? String(row.access_token_expires_at)) : null,
      scopes: row.scopes ?? [],
    };
  },

  async saveGoogleToken(dto: { account_email?: string | null; refresh_token: string; access_token?: string | null; expires_at?: string | null; scopes: string[] }) {
    const pool = getPool();
    const encRefresh = encryptString(dto.refresh_token);
    const encAccess = dto.access_token ? encryptString(dto.access_token) : null;

    await pool.query("BEGIN");
    try {
      await pool.query(`DELETE FROM oauth_tokens WHERE provider='google'`);
      const res = await pool.query(
        `
        INSERT INTO oauth_tokens (provider, account_email, encrypted_refresh_token, encrypted_access_token, access_token_expires_at, scopes)
        VALUES ('google',$1,$2,$3,$4,$5)
        RETURNING *
        `,
        [dto.account_email ?? null, encRefresh, encAccess, dto.expires_at ? new Date(dto.expires_at).toISOString() : null, dto.scopes]
      );
      await pool.query("COMMIT");
      return res.rows[0];
    } catch (e) {
      await pool.query("ROLLBACK");
      throw e;
    }
  },

  async clearGoogleToken() {
    const pool = getPool();
    await pool.query(`DELETE FROM oauth_tokens WHERE provider='google'`);
  },
};
