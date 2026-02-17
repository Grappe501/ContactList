import { q, DbClient } from "./_client";

export const contactsRepo = {
  async list(params: any, client: DbClient | null = null) {
    const page = Math.max(1, Number(params.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.page_size ?? 25)));
    const offset = (page - 1) * pageSize;

    const query = (params.q ?? "").trim();
    const tag = (params.tag ?? "").trim();
    const state = (params.state ?? "").trim();
    const sourceType = (params.source_type ?? "").trim();

    const sort = (params.sort ?? "created_at").trim();
    const order = (params.order ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const where: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (query) {
      where.push(`(
        full_name ILIKE $${idx} OR
        primary_email ILIKE $${idx} OR
        primary_phone ILIKE $${idx}
      )`);
      values.push(`%${query}%`);
      idx++;
    }

    if (state) {
      where.push(`state = $${idx}`);
      values.push(state);
      idx++;
    }

    if (sourceType) {
      where.push(`id IN (SELECT contact_id FROM contact_sources WHERE source_type = $${idx})`);
      values.push(sourceType);
      idx++;
    }

    if (tag) {
      where.push(`id IN (
        SELECT ct.contact_id FROM contact_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE t.name = $${idx}
      )`);
      values.push(tag);
      idx++;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sortCol = ["created_at", "updated_at", "full_name"].includes(sort) ? sort : "created_at";

    const res = await q(
      client,
      `SELECT * FROM contacts ${whereSql} ORDER BY ${sortCol} ${order} LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, pageSize, offset]
    );

    return res.rows;
  },

  async getBundle(contactId: string, client: DbClient | null = null) {
    const c = await q(client, `SELECT * FROM contacts WHERE id=$1`, [contactId]);
    const contact = c.rows[0];
    if (!contact) return null;

    const sources = (
      await q(client, `SELECT * FROM contact_sources WHERE contact_id=$1 ORDER BY created_at DESC`, [contactId])
    ).rows;

    const tags = (
      await q(
        client,
        `
      SELECT t.* FROM tags t
      JOIN contact_tags ct ON ct.tag_id = t.id
      WHERE ct.contact_id=$1
      ORDER BY t.name
    `,
        [contactId]
      )
    ).rows;

    const notes = (await q(client, `SELECT * FROM notes WHERE contact_id=$1 ORDER BY created_at DESC`, [contactId]))
      .rows;

    const dupes = (
      await q(client, `SELECT * FROM duplicate_suggestions WHERE contact_id=$1 ORDER BY created_at DESC`, [contactId])
    ).rows;

    const merges = (
      await q(
        client,
        `SELECT * FROM merge_history WHERE survivor_contact_id=$1 OR merged_contact_id=$1 ORDER BY created_at DESC`,
        [contactId]
      )
    ).rows;

    return { contact, sources, tags, notes, duplicate_suggestions: dupes, merge_history: merges };
  },

  async searchCandidates(query: string, limit: number, client: DbClient | null = null) {
    const qLike = `%${query.trim()}%`;
    const exact = query.trim();
    const res = await q(
      client,
      `
      SELECT id, full_name, primary_email, primary_phone, city, state, organization, company, title, created_at, updated_at
      FROM contacts
      WHERE
        full_name ILIKE $1 OR
        primary_email ILIKE $1 OR
        primary_phone ILIKE $1 OR
        organization ILIKE $1 OR
        company ILIKE $1
      ORDER BY
        CASE
          WHEN full_name ILIKE $2 THEN 0
          WHEN primary_email ILIKE $2 THEN 0
          WHEN primary_phone ILIKE $2 THEN 0
          ELSE 1
        END,
        updated_at DESC
      LIMIT $3
      `,
      [qLike, exact, limit]
    );
    return res.rows;
  },

  // ---------------------------------------------------------------------------
  // Back-compat method names expected by services / older modules
  // ---------------------------------------------------------------------------

  async listContacts(params: any, client: DbClient | null = null) {
    return await contactsRepo.list(params, client);
  },

  async getContactBundle(contactId: string, client: DbClient | null = null) {
    return await contactsRepo.getBundle(contactId, client);
  },

  // ---------------------------------------------------------------------------
  // CRUD helpers: services still call these even if routes moved to repo-style
  // ---------------------------------------------------------------------------

  async createContact(dto: any, client: DbClient | null = null) {
    const res = await q(
      client,
      `
      INSERT INTO contacts (
        full_name,
        first_name,
        last_name,
        organization,
        company,
        title,
        primary_email,
        primary_phone,
        emails,
        phones,
        city,
        state,
        metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
      `,
      [
        dto.full_name ?? null,
        dto.first_name ?? null,
        dto.last_name ?? null,
        dto.organization ?? null,
        dto.company ?? null,
        dto.title ?? null,
        dto.primary_email ?? null,
        dto.primary_phone ?? null,
        dto.emails ?? [],
        dto.phones ?? [],
        dto.city ?? null,
        dto.state ?? null,
        dto.metadata ?? {},
      ]
    );
    return res.rows[0];
  },

  async updateContact(id: string, patch: any, client: DbClient | null = null) {
    const res = await q(
      client,
      `
      UPDATE contacts SET
        full_name      = COALESCE($2, full_name),
        first_name     = COALESCE($3, first_name),
        last_name      = COALESCE($4, last_name),
        organization   = COALESCE($5, organization),
        company        = COALESCE($6, company),
        title          = COALESCE($7, title),
        primary_email  = COALESCE($8, primary_email),
        primary_phone  = COALESCE($9, primary_phone),
        emails         = COALESCE($10, emails),
        phones         = COALESCE($11, phones),
        city           = COALESCE($12, city),
        state          = COALESCE($13, state),
        metadata       = COALESCE($14, metadata),
        updated_at     = now()
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        patch.full_name ?? null,
        patch.first_name ?? null,
        patch.last_name ?? null,
        patch.organization ?? null,
        patch.company ?? null,
        patch.title ?? null,
        patch.primary_email ?? null,
        patch.primary_phone ?? null,
        patch.emails ?? null,
        patch.phones ?? null,
        patch.city ?? null,
        patch.state ?? null,
        patch.metadata ?? null,
      ]
    );
    return res.rows[0];
  },

  async deleteContact(id: string, client: DbClient | null = null) {
    const res = await q(client, `DELETE FROM contacts WHERE id=$1`, [id]);
    return (res.rowCount ?? 0) > 0;
  },
};
