import { getPool } from "../shared/db";

export const tagsRepo = {
  async list() {
    const pool = getPool();
    const res = await pool.query(`SELECT * FROM tags ORDER BY name`);
    return res.rows;
  },

  async upsert(dto: { name: string; category?: string | null; description?: string | null }) {
    const pool = getPool();
    const res = await pool.query(
      `
      INSERT INTO tags (name, category, description)
      VALUES ($1, $2, $3)
      ON CONFLICT (name) DO UPDATE
      SET category = EXCLUDED.category,
          description = EXCLUDED.description
      RETURNING *
      `,
      [dto.name.trim(), dto.category ?? null, dto.description ?? null]
    );
    return res.rows[0];
  },

  async assign(contactId: string, dto: { tag_ids: string[]; assigned_by?: string; confidence?: number; import_batch_id?: string | null }) {
    const pool = getPool();
    const assignedBy = dto.assigned_by ?? "manual";
    const confidence = typeof dto.confidence === "number" ? dto.confidence : 1;
    const batchId = dto.import_batch_id ?? null;

    const c = await pool.query(`SELECT id FROM contacts WHERE id=$1`, [contactId]);
    if (c.rowCount === 0) throw new Error("Contact not found");

    await pool.query("BEGIN");
    try {
      for (const tagId of dto.tag_ids) {
        await pool.query(
          `
          INSERT INTO contact_tags (contact_id, tag_id, assigned_by, confidence, import_batch_id)
          VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (contact_id, tag_id) DO UPDATE
          SET assigned_by = EXCLUDED.assigned_by,
              confidence = EXCLUDED.confidence,
              import_batch_id = EXCLUDED.import_batch_id
          `,
          [contactId, tagId, assignedBy, confidence, batchId]
        );
      }
      await pool.query("COMMIT");
    } catch (e) {
      await pool.query("ROLLBACK");
      throw e;
    }
  },

  async remove(contactId: string, tagId: string) {
    const pool = getPool();
    const res = await pool.query(`DELETE FROM contact_tags WHERE contact_id=$1 AND tag_id=$2`, [contactId, tagId]);
    return res.rowCount > 0;
  },
};
