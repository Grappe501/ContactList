import { getPool } from "../shared/db";

function uniq(arr: string[]): string[] {
  const s = new Set(arr.filter(Boolean));
  return Array.from(s);
}

function mergeCustomFields(a: any, b: any) {
  const out: any = { ...(a ?? {}) };
  for (const [k, v] of Object.entries(b ?? {})) {
    if (out[k] === undefined || out[k] === null || out[k] === "") out[k] = v;
  }
  return out;
}

export const mergeRepo = {
  async merge(dto: { survivor_contact_id: string; merged_contact_id: string; suggestion_id?: string | null; merged_by: string }) {
    const pool = getPool();
    await pool.query("BEGIN");
    try {
      const sRes = await pool.query(`SELECT * FROM contacts WHERE id=$1 FOR UPDATE`, [dto.survivor_contact_id]);
      const mRes = await pool.query(`SELECT * FROM contacts WHERE id=$1 FOR UPDATE`, [dto.merged_contact_id]);
      const survivor = sRes.rows[0];
      const merged = mRes.rows[0];
      if (!survivor || !merged) throw new Error("Contact not found");

      // compute merged contact record
      const emails = uniq([...(survivor.emails ?? []), ...(merged.emails ?? [])]);
      const phones = uniq([...(survivor.phones ?? []), ...(merged.phones ?? [])]);

      const sMeta = survivor.metadata ?? {};
      const mMeta = merged.metadata ?? {};
      const mergedCustom = mergeCustomFields(sMeta.custom_fields, mMeta.custom_fields);
      const metadata = { ...sMeta, custom_fields: mergedCustom };

      const pick = (field: string) => survivor[field] ?? merged[field] ?? null;

      const updated = {
        full_name: pick("full_name"),
        first_name: pick("first_name"),
        middle_name: pick("middle_name"),
        last_name: pick("last_name"),
        suffix: pick("suffix"),
        primary_email: survivor.primary_email ?? merged.primary_email ?? (emails[0] ?? null),
        primary_phone: survivor.primary_phone ?? merged.primary_phone ?? (phones[0] ?? null),
        emails,
        phones,
        street: pick("street"),
        street2: pick("street2"),
        city: pick("city"),
        state: pick("state"),
        postal_code: pick("postal_code"),
        country: pick("country"),
        company: pick("company"),
        title: pick("title"),
        organization: pick("organization"),
        website: pick("website"),
        birthday: survivor.birthday ?? merged.birthday ?? null,
        metadata,
      };

      await pool.query(
        `
        UPDATE contacts SET
          full_name=$2, first_name=$3, middle_name=$4, last_name=$5, suffix=$6,
          primary_email=$7, primary_phone=$8, emails=$9, phones=$10,
          street=$11, street2=$12, city=$13, state=$14, postal_code=$15, country=$16,
          company=$17, title=$18, organization=$19, website=$20,
          birthday=$21, metadata=$22, updated_at=now()
        WHERE id=$1
        `,
        [
          dto.survivor_contact_id,
          updated.full_name, updated.first_name, updated.middle_name, updated.last_name, updated.suffix,
          updated.primary_email, updated.primary_phone, updated.emails, updated.phones,
          updated.street, updated.street2, updated.city, updated.state, updated.postal_code, updated.country,
          updated.company, updated.title, updated.organization, updated.website,
          updated.birthday, updated.metadata,
        ]
      );

      // Tags union: insert missing into survivor
      await pool.query(
        `
        INSERT INTO contact_tags (contact_id, tag_id, assigned_by, confidence)
        SELECT $1 as contact_id, tag_id, 'merge', COALESCE(confidence, 1.0)
        FROM contact_tags
        WHERE contact_id = $2
        ON CONFLICT (contact_id, tag_id) DO NOTHING
        `,
        [dto.survivor_contact_id, dto.merged_contact_id]
      );
      await pool.query(`DELETE FROM contact_tags WHERE contact_id=$1`, [dto.merged_contact_id]);

      // Notes reassignment
      await pool.query(`UPDATE notes SET contact_id=$1 WHERE contact_id=$2`, [dto.survivor_contact_id, dto.merged_contact_id]);

      // Sources reassignment
      await pool.query(`UPDATE contact_sources SET contact_id=$1 WHERE contact_id=$2`, [dto.survivor_contact_id, dto.merged_contact_id]);

      // Suggestions referencing merged contact: re-point to survivor (best effort)
      await pool.query(`
        UPDATE duplicate_suggestions
        SET possible_duplicate_contact_id=$1, updated_at=now()
        WHERE possible_duplicate_contact_id=$2
      `, [dto.survivor_contact_id, dto.merged_contact_id]);

      // Write merge history
      await pool.query(
        `
        INSERT INTO merge_history (survivor_contact_id, merged_contact_id, merged_by, merge_reason, merge_payload)
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          dto.survivor_contact_id,
          dto.merged_contact_id,
          dto.merged_by,
          dto.suggestion_id ? "duplicate_suggestion" : "manual_merge",
          { suggestion_id: dto.suggestion_id ?? null, updated },
        ]
      );

      // Soft delete merged if column exists
      await pool.query(`UPDATE contacts SET deleted_at = COALESCE(deleted_at, now()), updated_at=now() WHERE id=$1`, [dto.merged_contact_id]).catch(() => {});

      // Resolve suggestion if provided
      if (dto.suggestion_id) {
        await pool.query(`UPDATE duplicate_suggestions SET status='accepted', resolved_at=now(), resolved_by=$2 WHERE id=$1`, [dto.suggestion_id, dto.merged_by]);
      }

      await pool.query("COMMIT");
      return { merged: true, survivor_contact_id: dto.survivor_contact_id, merged_contact_id: dto.merged_contact_id };
    } catch (e) {
      await pool.query("ROLLBACK");
      throw e;
    }
  },
};
