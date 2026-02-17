import { q, DbClient } from "./_client";

export const notesRepo = {
  async list(contactId: string, client: DbClient | null = null) {
    const res = await q(client, `SELECT * FROM notes WHERE contact_id=$1 ORDER BY created_at DESC`, [contactId]);
    return res.rows;
  },

  async add(
    contactId: string,
    dto: { note_type?: string; body: string; created_by?: string | null },
    client: DbClient | null = null
  ) {
    const res = await q(
      client,
      `
      INSERT INTO notes (contact_id, note_type, body, created_by)
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [contactId, dto.note_type ?? "general", dto.body, dto.created_by ?? null]
    );
    return res.rows[0];
  },

  // Back-compat alias (services expect notesRepo.create)
  async create(
    contactId: string,
    dto: { note_type?: string; body: string; created_by?: string | null },
    client: DbClient | null = null
  ) {
    return await notesRepo.add(contactId, dto, client);
  },
};
