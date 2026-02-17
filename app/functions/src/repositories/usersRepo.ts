import { getPool } from "../shared/db";

type Role = "owner" | "admin" | "organizer" | "data_entry" | "viewer";

export const usersRepo = {
  async findBySubject(auth_subject: string) {
    const pool = getPool();
    const res = await pool.query(`SELECT * FROM users WHERE auth_subject=$1 LIMIT 1`, [auth_subject]);
    return res.rows[0] ?? null;
  },

  async findByEmail(email: string) {
    const pool = getPool();
    const res = await pool.query(`SELECT * FROM users WHERE lower(email)=lower($1) LIMIT 1`, [email]);
    return res.rows[0] ?? null;
  },

  async create(dto: { auth_subject: string; email: string; display_name: string | null; role: Role }) {
    const pool = getPool();
    const res = await pool.query(
      `
      INSERT INTO users (auth_subject, email, display_name, role)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (auth_subject)
      DO UPDATE SET email=EXCLUDED.email, display_name=COALESCE(EXCLUDED.display_name, users.display_name)
      RETURNING *
      `,
      [dto.auth_subject, dto.email, dto.display_name, dto.role]
    );
    return res.rows[0];
  },

  async bootstrapComplete(): Promise<boolean> {
    const pool = getPool();
    const res = await pool.query(`SELECT value->>'bootstrap_complete' AS done FROM app_settings WHERE key='auth'`);
    const done = res.rows[0]?.done;
    return String(done).toLowerCase() === "true";
  },

  async setBootstrapComplete(): Promise<void> {
    const pool = getPool();
    await pool.query(
      `
      INSERT INTO app_settings (key, value)
      VALUES ('auth', '{"bootstrap_complete": true}'::jsonb)
      ON CONFLICT (key)
      DO UPDATE SET value = jsonb_set(app_settings.value, '{bootstrap_complete}', 'true'::jsonb, true)
      `
    );
  },
};
