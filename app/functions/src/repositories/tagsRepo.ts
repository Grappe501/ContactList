import { q, DbClient } from "./_client";

export const tagsRepo = {
  async list(client: DbClient | null = null) {
    const res = await q(client, `SELECT * FROM tags ORDER BY name ASC`, []);
    return res.rows;
  },

  async upsert(dto: { name: string }, client: DbClient | null = null) {
    const res = await q(
      client,
      `
      INSERT INTO tags (name)
      VALUES ($1)
      ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name
      RETURNING *
      `,
      [dto.name]
    );
    return res.rows[0];
  },

  async assign(
    contactId: string,
    dto: { tag_ids: string[]; assigned_by?: string; confidence?: number },
    client: DbClient | null = null
  ) {
    const ids = dto.tag_ids ?? [];
    for (const id of ids) {
      await q(
        client,
        `
        INSERT INTO contact_tags (contact_id, tag_id, assigned_by, confidence)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (contact_id, tag_id) DO NOTHING
        `,
        [contactId, id, dto.assigned_by ?? "user", dto.confidence ?? 1.0]
      );
    }
    return { assigned: ids.length };
  },

  // Back-compat alias (services expect tagsRepo.remove)
  async remove(contactId: string, tagId: string, client: DbClient | null = null) {
    const res = await q(client, `DELETE FROM contact_tags WHERE contact_id=$1 AND tag_id=$2`, [contactId, tagId]);
    return (res.rowCount ?? 0) > 0;
  },
};
