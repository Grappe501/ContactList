import { getPool } from "../shared/db";

function coalesceMetadata(m: any) {
  // Ensure metadata object exists and contains required keys per contract.
  const meta = m ?? {};
  return {
    alt_names: meta.alt_names ?? [],
    nicknames: meta.nicknames ?? [],
    socials: meta.socials ?? {},
    custom_fields: meta.custom_fields ?? {},
    flags: {
      needs_review: meta.flags?.needs_review ?? false,
      do_not_contact: meta.flags?.do_not_contact ?? false,
    },
  };
}

export const contactsRepo = {
  async listContacts(params: {
    q: string | null;
    tag: string | null;
    source_type: string | null;
    state: string | null;
    sort: string;
    order: string;
    page: number;
    page_size: number;
  }) {
    const pool = getPool();
    const offset = (params.page - 1) * params.page_size;

    const where: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (params.q) {
      where.push(`(
        full_name ILIKE $${i} OR
        coalesce(primary_email,'') ILIKE $${i} OR
        coalesce(primary_phone,'') ILIKE $${i} OR
        coalesce(company,'') ILIKE $${i} OR
        coalesce(city,'') ILIKE $${i} OR
        coalesce(state,'') ILIKE $${i}
      )`);
      values.push(`%${params.q}%`);
      i++;
    }

    if (params.state) {
      where.push(`state = $${i}`);
      values.push(params.state);
      i++;
    }

    if (params.tag) {
      where.push(`EXISTS (
        SELECT 1 FROM contact_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.contact_id = contacts.id AND t.name = $${i}
      )`);
      values.push(params.tag);
      i++;
    }

    if (params.source_type) {
      where.push(`EXISTS (
        SELECT 1 FROM contact_sources cs
        WHERE cs.contact_id = contacts.id AND cs.source_type = $${i}
      )`);
      values.push(params.source_type);
      i++;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sortKey = params.sort === "updated_at" ? "updated_at" : params.sort === "created_at" ? "created_at" : "full_name";
    const order = params.order?.toLowerCase() === "desc" ? "DESC" : "ASC";

    const listSql = `
      SELECT
        c.id,
        c.full_name,
        c.primary_email,
        c.primary_phone,
        c.city,
        c.state,
        c.updated_at,
        COALESCE(tg.tag_names, ARRAY[]::text[]) AS tag_names,
        COALESCE(src.source_types, ARRAY[]::text[]) AS source_types
      FROM contacts c
      LEFT JOIN LATERAL (
        SELECT array_agg(t.name ORDER BY t.name) AS tag_names
        FROM contact_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.contact_id = c.id
      ) tg ON TRUE
      LEFT JOIN LATERAL (
        SELECT array_agg(DISTINCT cs.source_type ORDER BY cs.source_type) AS source_types
        FROM contact_sources cs
        WHERE cs.contact_id = c.id
      ) src ON TRUE
      ${whereSql.replaceAll("contacts.", "c.")}
      ORDER BY ${sortKey === "full_name" ? "lower(c.full_name)" : "c." + sortKey} ${order}
      LIMIT $${i} OFFSET $${i + 1}
    `;

    const countSql = `SELECT count(*)::int AS total FROM contacts c ${whereSql.replaceAll("contacts.", "c.")}`;

    const listValues = [...values, params.page_size, offset];
    const [listRes, countRes] = await Promise.all([pool.query(listSql, listValues), pool.query(countSql, values)]);

    return {
      data: listRes.rows.map((r: any) => ({
        id: r.id,
        full_name: r.full_name,
        primary_email: r.primary_email,
        primary_phone: r.primary_phone,
        city: r.city,
        state: r.state,
        tag_names: r.tag_names ?? [],
        source_types: r.source_types ?? [],
        updated_at: r.updated_at,
      })),
      page: params.page,
      page_size: params.page_size,
      total: countRes.rows[0]?.total ?? 0,
    };
  },

  async createContact(dto: any) {
    const pool = getPool();
    const meta = coalesceMetadata(dto.metadata);

    const sql = `
      INSERT INTO contacts (
        full_name, first_name, middle_name, last_name, suffix,
        primary_email, primary_phone, emails, phones,
        street, street2, city, state, postal_code, country,
        company, title, organization, website, birthday,
        metadata
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,
        $21
      )
      RETURNING *
    `;

    const values = [
      dto.full_name,
      dto.first_name ?? null,
      dto.middle_name ?? null,
      dto.last_name ?? null,
      dto.suffix ?? null,
      dto.primary_email ?? null,
      dto.primary_phone ?? null,
      dto.emails ?? [],
      dto.phones ?? [],
      dto.street ?? null,
      dto.street2 ?? null,
      dto.city ?? null,
      dto.state ?? null,
      dto.postal_code ?? null,
      dto.country ?? "USA",
      dto.company ?? null,
      dto.title ?? null,
      dto.organization ?? null,
      dto.website ?? null,
      dto.birthday ?? null,
      meta,
    ];

    const res = await pool.query(sql, values);
    return res.rows[0];
  },

  async updateContact(id: string, patch: any) {
    const pool = getPool();

    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    const set = (col: string, val: any) => {
      fields.push(`${col} = $${i}`);
      values.push(val);
      i++;
    };

    for (const [k, v] of Object.entries(patch)) {
      if (k === "metadata") set("metadata", coalesceMetadata(v));
      else if (k === "emails") set("emails", v ?? []);
      else if (k === "phones") set("phones", v ?? []);
      else set(k, v);
    }

    if (fields.length === 0) return await this.getContact(id);

    values.push(id);
    const sql = `UPDATE contacts SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`;
    const res = await pool.query(sql, values);
    return res.rows[0] ?? null;
  },

  async deleteContact(id: string) {
    const pool = getPool();
    const res = await pool.query(`DELETE FROM contacts WHERE id=$1`, [id]);
    return (res.rowCount ?? 0) > 0;
  },

  async getContact(id: string) {
    const pool = getPool();
    const res = await pool.query(`SELECT * FROM contacts WHERE id=$1`, [id]);
    return res.rows[0] ?? null;
  },

  async getContactBundle(id: string) {
    const pool = getPool();
    const contactRes = await pool.query(`SELECT * FROM contacts WHERE id=$1`, [id]);
    const contact = contactRes.rows[0];
    if (!contact) return null;

    const [sourcesRes, tagsRes, notesRes, dupesRes, mergesRes] = await Promise.all([
      pool.query(`SELECT * FROM contact_sources WHERE contact_id=$1 ORDER BY created_at DESC`, [id]),
      pool.query(
        `
        SELECT t.* FROM contact_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.contact_id=$1
        ORDER BY t.name
      `,
        [id],
      ),
      pool.query(`SELECT * FROM notes WHERE contact_id=$1 ORDER BY created_at DESC`, [id]),
      pool.query(
        `
        SELECT * FROM duplicate_suggestions
        WHERE (contact_id_a=$1 OR contact_id_b=$1)
        ORDER BY status ASC, score DESC, created_at DESC
      `,
        [id],
      ),
      pool.query(
        `
        SELECT * FROM merges
        WHERE survivor_contact_id=$1 OR merged_contact_id=$1
        ORDER BY created_at DESC
      `,
        [id],
      ),
    ]);

    return {
      contact,
      sources: sourcesRes.rows ?? [],
      tags: tagsRes.rows ?? [],
      notes: notesRes.rows ?? [],
      duplicate_suggestions: dupesRes.rows ?? [],
      merge_history: mergesRes.rows ?? [],
    };
  },
};
