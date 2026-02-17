import { getPool } from "../shared/db";

type ContactDTO = {
  full_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;

  primary_email?: string | null;
  primary_phone?: string | null;
  emails?: string[] | null;
  phones?: string[] | null;

  street?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;

  company?: string | null;
  title?: string | null;
  organization?: string | null;
  website?: string | null;

  birthday?: string | null; // stored as text/date depending on schema
  metadata?: any;
};

const ALLOWED_SORT = new Set(["created_at", "updated_at", "full_name"]);

function cleanStr(v: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function cleanStrArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

export const contactsRepo = {
  /**
   * Overlay 09 "new" list method (kept).
   */
  async list(params: any) {
    const pool = getPool();
    const page = Math.max(1, Number(params.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.page_size ?? 25)));
    const offset = (page - 1) * pageSize;

    const q = (params.q ?? "").trim();
    const tag = (params.tag ?? "").trim();
    const state = (params.state ?? "").trim();
    const sourceType = (params.source_type ?? "").trim();

    const sort = (params.sort ?? "created_at").trim();
    const order = (params.order ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const where: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (q) {
      where.push(`(
        full_name ILIKE $${idx} OR
        primary_email ILIKE $${idx} OR
        primary_phone ILIKE $${idx}
      )`);
      values.push(`%${q}%`);
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
    const sortCol = ALLOWED_SORT.has(sort) ? sort : "created_at";

    const res = await pool.query(
      `SELECT * FROM contacts ${whereSql} ORDER BY ${sortCol} ${order} LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, pageSize, offset]
    );

    return res.rows;
  },

  /**
   * Back-compat method name (expected by older services).
   */
  async listContacts(params: any) {
    return await contactsRepo.list(params);
  },

  /**
   * Overlay 09 "new" bundle method (kept).
   */
  async getBundle(contactId: string) {
    const pool = getPool();
    const c = await pool.query(`SELECT * FROM contacts WHERE id=$1`, [contactId]);
    const contact = c.rows[0];
    if (!contact) return null;

    const sources = (
      await pool.query(`SELECT * FROM contact_sources WHERE contact_id=$1 ORDER BY created_at DESC`, [contactId])
    ).rows;

    const tags = (
      await pool.query(
        `
        SELECT t.* FROM tags t
        JOIN contact_tags ct ON ct.tag_id = t.id
        WHERE ct.contact_id=$1
        ORDER BY t.name
        `,
        [contactId]
      )
    ).rows;

    const notes = (await pool.query(`SELECT * FROM notes WHERE contact_id=$1 ORDER BY created_at DESC`, [contactId])).rows;

    const dupes = (
      await pool.query(`SELECT * FROM duplicate_suggestions WHERE contact_id=$1 ORDER BY created_at DESC`, [contactId])
    ).rows;

    const merges = (
      await pool.query(
        `SELECT * FROM merge_history WHERE survivor_contact_id=$1 OR merged_contact_id=$1 ORDER BY created_at DESC`,
        [contactId]
      )
    ).rows;

    return { contact, sources, tags, notes, duplicate_suggestions: dupes, merge_history: merges };
  },

  /**
   * Back-compat method name (expected by older services).
   */
  async getContactBundle(contactId: string) {
    return await contactsRepo.getBundle(contactId);
  },

  /**
   * Overlay 09 "new" searchCandidates (kept).
   */
  async searchCandidates(query: string, limit: number) {
    const pool = getPool();
    const q = `%${query.trim()}%`;
    const exact = query.trim();

    const res = await pool.query(
      `
      SELECT id, full_name, primary_email, primary_phone, city, state, organization, company, title, created_at
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
      [q, exact, limit]
    );

    return res.rows;
  },

  /**
   * Restored CRUD — required by routes/services already in the project.
   */
  async createContact(dto: ContactDTO) {
    const pool = getPool();

    const fullName = cleanStr(dto.full_name) ?? "(unknown)";
    const first = cleanStr(dto.first_name);
    const middle = cleanStr(dto.middle_name);
    const last = cleanStr(dto.last_name);
    const suffix = cleanStr(dto.suffix);

    const primaryEmail = cleanStr(dto.primary_email);
    const primaryPhone = cleanStr(dto.primary_phone);

    const emails = cleanStrArray(dto.emails ?? (primaryEmail ? [primaryEmail] : []));
    const phones = cleanStrArray(dto.phones ?? (primaryPhone ? [primaryPhone] : []));

    const street = cleanStr(dto.street);
    const street2 = cleanStr(dto.street2);
    const city = cleanStr(dto.city);
    const state = cleanStr(dto.state);
    const postal = cleanStr(dto.postal_code);
    const country = cleanStr(dto.country) ?? "USA";

    const company = cleanStr(dto.company);
    const title = cleanStr(dto.title);
    const org = cleanStr(dto.organization);
    const website = cleanStr(dto.website);
    const birthday = cleanStr(dto.birthday);

    const metadata = dto.metadata ?? null;

    const res = await pool.query(
      `
      INSERT INTO contacts (
        full_name, first_name, middle_name, last_name, suffix,
        primary_email, primary_phone, emails, phones,
        street, street2, city, state, postal_code, country,
        company, title, organization, website, birthday,
        metadata
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,
        $21
      )
      RETURNING *
      `,
      [
        fullName,
        first,
        middle,
        last,
        suffix,
        primaryEmail,
        primaryPhone,
        emails,
        phones,
        street,
        street2,
        city,
        state,
        postal,
        country,
        company,
        title,
        org,
        website,
        birthday,
        metadata,
      ]
    );

    return res.rows[0];
  },

  async updateContact(id: string, patch: ContactDTO) {
    const pool = getPool();

    const allowed: Array<keyof ContactDTO> = [
      "full_name",
      "first_name",
      "middle_name",
      "last_name",
      "suffix",
      "primary_email",
      "primary_phone",
      "emails",
      "phones",
      "street",
      "street2",
      "city",
      "state",
      "postal_code",
      "country",
      "company",
      "title",
      "organization",
      "website",
      "birthday",
      "metadata",
    ];

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    for (const k of allowed) {
      if (!(k in patch)) continue;

      if (k === "emails") {
        sets.push(`${k} = $${i}`);
        values.push(cleanStrArray((patch as any)[k]));
        i++;
        continue;
      }

      if (k === "phones") {
        sets.push(`${k} = $${i}`);
        values.push(cleanStrArray((patch as any)[k]));
        i++;
        continue;
      }

      if (k === "metadata") {
        sets.push(`${k} = $${i}`);
        values.push((patch as any)[k] ?? null);
        i++;
        continue;
      }

      sets.push(`${k} = $${i}`);
      values.push(cleanStr((patch as any)[k]));
      i++;
    }

    if (sets.length === 0) {
      const cur = await pool.query(`SELECT * FROM contacts WHERE id=$1`, [id]);
      return cur.rows[0] ?? null;
    }

    // Keep updated_at fresh if your schema supports it
    sets.push(`updated_at = NOW()`);

    const res = await pool.query(
      `UPDATE contacts SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      [...values, id]
    );

    return res.rows[0] ?? null;
  },

  async deleteContact(id: string) {
    const pool = getPool();
    const res = await pool.query(`DELETE FROM contacts WHERE id=$1`, [id]);
    return (res.rowCount ?? 0) > 0;
  },
};
