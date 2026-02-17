import { getPool } from "../shared/db";

export const importsRepo = {
  async createBatch(dto: {
    source_type: "google" | "csv" | "vcard" | "donated" | "manual";
    source_label: string;
    file_name: string | null;
    donor_name: string | null;
    donor_org: string | null;
    operator_label: string | null;
    meta: any;
    record_count: number;
  }) {
    const pool = getPool();
    const res = await pool.query(
      `
      INSERT INTO import_batches (source_type, source_label, file_name, donor_name, donor_org, operator_label, status, record_count, processed_count, meta)
      VALUES ($1,$2,$3,$4,$5,$6,'processing',$7,0,$8)
      RETURNING *
      `,
      [dto.source_type, dto.source_label, dto.file_name, dto.donor_name, dto.donor_org, dto.operator_label, dto.record_count, dto.meta]
    );
    return res.rows[0];
  },

  async commitCsvBatch(batchId: string, dto: {
    source_type: "csv" | "donated" | "manual";
    source_label: string;
    rows: { idx: number; raw: Record<string,string>; normalized: any; rowFingerprint: string }[];
  }) {
    const pool = getPool();
    await pool.query("BEGIN");
    try {
      let processed = 0;
      const created_contact_ids: string[] = [];

      for (const r of dto.rows) {
        const cRes = await pool.query(
          `
          INSERT INTO contacts (
            full_name, first_name, middle_name, last_name, suffix,
            primary_email, primary_phone, emails, phones,
            street, street2, city, state, postal_code, country,
            company, title, organization, website,
            birthday, metadata
          ) VALUES (
            $1,$2,$3,$4,$5,
            $6,$7,$8,$9,
            $10,$11,$12,$13,$14,$15,
            $16,$17,$18,$19,
            NULLIF($20,'')::date, $21
          )
          RETURNING id
          `,
          [
            r.normalized.full_name,
            r.normalized.first_name ?? null,
            r.normalized.middle_name ?? null,
            r.normalized.last_name ?? null,
            r.normalized.suffix ?? null,
            r.normalized.primary_email ?? null,
            r.normalized.primary_phone ?? null,
            r.normalized.emails ?? [],
            r.normalized.phones ?? [],
            r.normalized.street ?? null,
            r.normalized.street2 ?? null,
            r.normalized.city ?? null,
            r.normalized.state ?? null,
            r.normalized.postal_code ?? null,
            r.normalized.country ?? "USA",
            r.normalized.company ?? null,
            r.normalized.title ?? null,
            r.normalized.organization ?? null,
            r.normalized.website ?? null,
            r.normalized.birthday ?? null,
            r.normalized.metadata ?? {},
          ]
        );

        const contactId = cRes.rows[0].id as string;
        created_contact_ids.push(contactId);

        await pool.query(
          `
          INSERT INTO contact_sources (
            contact_id, import_batch_id, source_type, source_label, external_id, row_fingerprint, raw_payload, normalized_snapshot
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8
          )
          ON CONFLICT (import_batch_id, row_fingerprint) DO NOTHING
          `,
          [contactId, batchId, dto.source_type, dto.source_label, null, r.rowFingerprint, r.raw, r.normalized]
        );

        processed++;
        if (processed % 100 === 0) {
          await pool.query(`UPDATE import_batches SET processed_count=$1 WHERE id=$2`, [processed, batchId]);
        }
      }

      await pool.query(
        `
        UPDATE import_batches
        SET processed_count=$1, status='completed', completed_at=now()
        WHERE id=$2
        `,
        [processed, batchId]
      );

      await pool.query("COMMIT");

      return {
        batch_id: batchId,
        status: "completed",
        record_count: dto.rows.length,
        processed_count: processed,
        created_contact_ids: created_contact_ids.slice(0, 50),
        created_contacts_preview_count: Math.min(created_contact_ids.length, 50),
      };
    } catch (e: any) {
      await pool.query("ROLLBACK");
      await pool.query(`UPDATE import_batches SET status='failed', error_summary=$1 WHERE id=$2`, [String(e?.message ?? e), batchId]);
      throw e;
    }
  },

  async commitVcardBatch(batchId: string, dto: {
    source_type: "vcard";
    source_label: string;
    rows: { idx: number; raw: any; normalized: any; rowFingerprint: string }[];
  }) {
    const pool = getPool();
    await pool.query("BEGIN");
    try {
      let processed = 0;
      const created_contact_ids: string[] = [];

      for (const r of dto.rows) {
        const cRes = await pool.query(
          `
          INSERT INTO contacts (
            full_name, first_name, middle_name, last_name, suffix,
            primary_email, primary_phone, emails, phones,
            street, street2, city, state, postal_code, country,
            company, title, organization, website,
            birthday, metadata
          ) VALUES (
            $1,$2,$3,$4,$5,
            $6,$7,$8,$9,
            $10,$11,$12,$13,$14,$15,
            $16,$17,$18,$19,
            NULLIF($20,'')::date, $21
          )
          RETURNING id
          `,
          [
            r.normalized.full_name,
            r.normalized.first_name ?? null,
            r.normalized.middle_name ?? null,
            r.normalized.last_name ?? null,
            r.normalized.suffix ?? null,
            r.normalized.primary_email ?? null,
            r.normalized.primary_phone ?? null,
            r.normalized.emails ?? [],
            r.normalized.phones ?? [],
            r.normalized.street ?? null,
            r.normalized.street2 ?? null,
            r.normalized.city ?? null,
            r.normalized.state ?? null,
            r.normalized.postal_code ?? null,
            r.normalized.country ?? "USA",
            r.normalized.company ?? null,
            r.normalized.title ?? null,
            r.normalized.organization ?? null,
            r.normalized.website ?? null,
            r.normalized.birthday ?? null,
            r.normalized.metadata ?? {},
          ]
        );

        const contactId = cRes.rows[0].id as string;
        created_contact_ids.push(contactId);

        await pool.query(
          `
          INSERT INTO contact_sources (
            contact_id, import_batch_id, source_type, source_label, external_id, row_fingerprint, raw_payload, normalized_snapshot
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8
          )
          ON CONFLICT (import_batch_id, row_fingerprint) DO NOTHING
          `,
          [contactId, batchId, dto.source_type, dto.source_label, null, r.rowFingerprint, r.raw, r.normalized]
        );

        processed++;
        if (processed % 100 === 0) {
          await pool.query(`UPDATE import_batches SET processed_count=$1 WHERE id=$2`, [processed, batchId]);
        }
      }

      await pool.query(`UPDATE import_batches SET processed_count=$1, status='completed', completed_at=now() WHERE id=$2`, [processed, batchId]);
      await pool.query("COMMIT");

      return {
        batch_id: batchId,
        status: "completed",
        record_count: dto.rows.length,
        processed_count: processed,
        created_contact_ids: created_contact_ids.slice(0, 50),
        created_contacts_preview_count: Math.min(created_contact_ids.length, 50),
      };
    } catch (e: any) {
      await pool.query("ROLLBACK");
      await pool.query(`UPDATE import_batches SET status='failed', error_summary=$1 WHERE id=$2`, [String(e?.message ?? e), batchId]);
      throw e;
    }
  },

  async commitGoogleBatch(batchId: string, dto: {
    source_label: string;
    rows: { idx: number; raw: any; normalized: any; rowFingerprint: string; external_id: string | null }[];
  }) {
    const pool = getPool();
    await pool.query("BEGIN");
    try {
      let processed = 0;
      const created_contact_ids: string[] = [];

      for (const r of dto.rows) {
        const cRes = await pool.query(
          `
          INSERT INTO contacts (
            full_name, first_name, middle_name, last_name, suffix,
            primary_email, primary_phone, emails, phones,
            street, street2, city, state, postal_code, country,
            company, title, organization, website,
            birthday, metadata
          ) VALUES (
            $1,$2,$3,$4,$5,
            $6,$7,$8,$9,
            $10,$11,$12,$13,$14,$15,
            $16,$17,$18,$19,
            NULLIF($20,'')::date, $21
          )
          RETURNING id
          `,
          [
            r.normalized.full_name,
            r.normalized.first_name ?? null,
            r.normalized.middle_name ?? null,
            r.normalized.last_name ?? null,
            r.normalized.suffix ?? null,
            r.normalized.primary_email ?? null,
            r.normalized.primary_phone ?? null,
            r.normalized.emails ?? [],
            r.normalized.phones ?? [],
            r.normalized.street ?? null,
            r.normalized.street2 ?? null,
            r.normalized.city ?? null,
            r.normalized.state ?? null,
            r.normalized.postal_code ?? null,
            r.normalized.country ?? "USA",
            r.normalized.company ?? null,
            r.normalized.title ?? null,
            r.normalized.organization ?? null,
            r.normalized.website ?? null,
            r.normalized.birthday ?? null,
            r.normalized.metadata ?? {},
          ]
        );

        const contactId = cRes.rows[0].id as string;
        created_contact_ids.push(contactId);

        await pool.query(
          `
          INSERT INTO contact_sources (
            contact_id, import_batch_id, source_type, source_label, external_id, row_fingerprint, raw_payload, normalized_snapshot
          ) VALUES (
            $1,$2,'google',$3,$4,$5,$6,$7
          )
          ON CONFLICT (import_batch_id, row_fingerprint) DO NOTHING
          `,
          [contactId, batchId, dto.source_label, r.external_id, r.rowFingerprint, r.raw, r.normalized]
        );

        processed++;
        if (processed % 250 === 0) {
          await pool.query(`UPDATE import_batches SET processed_count=$1 WHERE id=$2`, [processed, batchId]);
        }
      }

      await pool.query(`UPDATE import_batches SET processed_count=$1, status='completed', completed_at=now() WHERE id=$2`, [processed, batchId]);
      await pool.query("COMMIT");

      return {
        batch_id: batchId,
        status: "completed",
        record_count: dto.rows.length,
        processed_count: processed,
        created_contact_ids: created_contact_ids.slice(0, 50),
        created_contacts_preview_count: Math.min(created_contact_ids.length, 50),
      };
    } catch (e: any) {
      await pool.query("ROLLBACK");
      await pool.query(`UPDATE import_batches SET status='failed', error_summary=$1 WHERE id=$2`, [String(e?.message ?? e), batchId]);
      throw e;
    }
  },

  async listBatches() {
    const pool = getPool();
    const res = await pool.query(`SELECT * FROM import_batches ORDER BY created_at DESC LIMIT 100`);
    return res.rows;
  },
};
