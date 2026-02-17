import { getPool } from "../shared/db";
import { dedupeRepo } from "../repositories/dedupeRepo";
import { mergeRepo } from "../repositories/mergeRepo";

function normEmail(e: string): string {
  return e.trim().toLowerCase();
}
function normPhone(p: string): string {
  return p.replace(/\D+/g, "");
}

export const dedupeService = {
  async run(params: { limit: number }) {
    const pool = getPool();
    const created: any[] = [];

    // 1) Email exact (primary_email + emails[])
    const emailRows = await pool.query(
      `
      WITH expanded AS (
        SELECT id as contact_id, unnest(COALESCE(emails, ARRAY[]::text[])) as email
        FROM contacts
        WHERE deleted_at IS NULL OR deleted_at IS NULL
      ),
      grouped AS (
        SELECT lower(email) as email_norm, array_agg(contact_id) as ids, count(*) as n
        FROM expanded
        WHERE email IS NOT NULL AND email <> ''
        GROUP BY lower(email)
        HAVING count(*) > 1
        LIMIT $1
      )
      SELECT * FROM grouped
      `,
      [params.limit]
    );

    for (const g of emailRows.rows) {
      const ids: string[] = g.ids;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const s = await dedupeRepo.upsertSuggestion({
            contact_id: ids[i],
            possible_duplicate_contact_id: ids[j],
            match_type: "email",
            score: 0.98,
            reason: `Exact email match: ${g.email_norm}`,
            evidence: { email: g.email_norm },
            suggested_by: "dedupe_v1",
          });
          created.push(s);
        }
      }
    }

    // 2) Phone exact (primary_phone + phones[])
    const phoneRows = await pool.query(
      `
      WITH expanded AS (
        SELECT id as contact_id, unnest(COALESCE(phones, ARRAY[]::text[])) as phone
        FROM contacts
        WHERE deleted_at IS NULL OR deleted_at IS NULL
      ),
      grouped AS (
        SELECT regexp_replace(phone, '\\D+', '', 'g') as phone_norm, array_agg(contact_id) as ids, count(*) as n
        FROM expanded
        WHERE phone IS NOT NULL AND phone <> ''
        GROUP BY regexp_replace(phone, '\\D+', '', 'g')
        HAVING count(*) > 1
        LIMIT $1
      )
      SELECT * FROM grouped
      `,
      [params.limit]
    );

    for (const g of phoneRows.rows) {
      const ids: string[] = g.ids;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const s = await dedupeRepo.upsertSuggestion({
            contact_id: ids[i],
            possible_duplicate_contact_id: ids[j],
            match_type: "phone",
            score: 0.97,
            reason: `Exact phone match: ${g.phone_norm}`,
            evidence: { phone: g.phone_norm },
            suggested_by: "dedupe_v1",
          });
          created.push(s);
        }
      }
    }

    // 3) Name + city/state heuristic (cheap)
    const nameRows = await pool.query(
      `
      SELECT a.id as a_id, b.id as b_id,
             a.first_name as a_first, a.last_name as a_last, a.city as a_city, a.state as a_state,
             b.first_name as b_first, b.last_name as b_last, b.city as b_city, b.state as b_state
      FROM contacts a
      JOIN contacts b
        ON a.id < b.id
       AND a.last_name IS NOT NULL
       AND b.last_name IS NOT NULL
       AND lower(a.last_name) = lower(b.last_name)
       AND (
            (a.city IS NOT NULL AND b.city IS NOT NULL AND lower(a.city)=lower(b.city))
         OR (a.state IS NOT NULL AND b.state IS NOT NULL AND a.state=b.state)
       )
      WHERE (a.deleted_at IS NULL OR a.deleted_at IS NULL) AND (b.deleted_at IS NULL OR b.deleted_at IS NULL)
      LIMIT $1
      `,
      [Math.min(params.limit, 2000)]
    );

    for (const r of nameRows.rows) {
      const aFirst = String(r.a_first ?? "").trim();
      const bFirst = String(r.b_first ?? "").trim();
      if (!aFirst || !bFirst) continue;
      if (aFirst[0].toLowerCase() !== bFirst[0].toLowerCase()) continue;

      const reason = `Same last name and location; first initial match (${aFirst[0].toUpperCase()}).`;
      const s = await dedupeRepo.upsertSuggestion({
        contact_id: r.a_id,
        possible_duplicate_contact_id: r.b_id,
        match_type: "name_city",
        score: 0.70,
        reason,
        evidence: { a: { first_name: aFirst, last_name: r.a_last, city: r.a_city, state: r.a_state }, b: { first_name: bFirst, last_name: r.b_last, city: r.b_city, state: r.b_state } },
        suggested_by: "dedupe_v1",
      });
      created.push(s);
    }

    return { ran: true, created_suggestions: created.length };
  },

  async list(params: { status: string; limit: number }) {
    return await dedupeRepo.listSuggestions(params);
  },

  async resolve(id: string, resolution: "accepted" | "rejected") {
    const row = await dedupeRepo.resolveSuggestion(id, resolution);
    return { resolved: true, row };
  },

  async merge(dto: { survivor_contact_id: string; merged_contact_id: string; suggestion_id?: string | null; merged_by: string }) {
    return await mergeRepo.merge(dto);
  },
};
