import { getPool } from "../shared/db";

type Role = "owner" | "admin" | "organizer" | "data_entry" | "viewer";

export const usersAdminRepo = {
  async list(limit: number) {
    const pool = getPool();
    const res = await pool.query(
      `SELECT id, auth_subject, email, display_name, role::text as role, status, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  },

  async setRole(userId: string, role: Role) {
    const pool = getPool();
    const res = await pool.query(
      `UPDATE users SET role=$2::user_role, updated_at=now() WHERE id=$1 RETURNING id, email, role::text as role, status`,
      [userId, role]
    );
    return res.rows[0] ?? null;
  },

  async setStatus(userId: string, status: string) {
    const pool = getPool();
    const res = await pool.query(
      `UPDATE users SET status=$2, updated_at=now() WHERE id=$1 RETURNING id, email, role::text as role, status`,
      [userId, status]
    );
    return res.rows[0] ?? null;
  },

  async get(userId: string) {
    const pool = getPool();
    const res = await pool.query(`SELECT id, email, role::text as role, status FROM users WHERE id=$1`, [userId]);
    return res.rows[0] ?? null;
  },

  async countOwners() {
    const pool = getPool();
    const res = await pool.query(`SELECT count(*)::int as n FROM users WHERE role='owner'::user_role AND status='active'`);
    return res.rows[0]?.n ?? 0;
  }
};
