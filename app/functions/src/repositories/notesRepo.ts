import { getPool } from "../shared/db";

export const notesRepo = {
  async list(contactId: string) {
    const pool = getPool();
    const res = await pool.query(`SELECT * FROM notes WHERE contact_id=$1 ORDER BY created_at DESC`, [contactId]);
    return res.rows;
  },

  async create(contactId: string, dto: { note_type: string; body: string; import_batch_id?: string | null }) {
    const pool = getPool();
    const res = await pool.query(
      `
      INSERT INTO notes (contact_id, import_batch_id, note_type, body)
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [contactId, dto.import_batch_id ?? null, dto.note_type, dto.body]
    );
    return res.rows[0];
  },
};
