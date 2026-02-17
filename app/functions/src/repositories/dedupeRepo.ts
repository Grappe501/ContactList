import { getPool } from "../shared/db";

export type SuggestionRow = any;

export const dedupeRepo = {
  async listSuggestions(params: { status: string; limit: number }) {
    const pool = getPool();
    const res = await pool.query(
      `
      SELECT *
      FROM duplicate_suggestions
      WHERE status = $1
      ORDER BY score DESC, created_at DESC
      LIMIT $2
      `,
      [params.status, params.limit]
    );
    return res.rows;
  },

  async upsertSuggestion(dto: {
    contact_id: string;
    possible_duplicate_contact_id: string;
    match_type: string;
    score: number;
    reason: string;
    evidence: any;
    suggested_by?: string | null;
  }) {
    const pool = getPool();
    const res = await pool.query(
      `
      INSERT INTO duplicate_suggestions (
        contact_id, possible_duplicate_contact_id,
        match_type, score, reason, evidence, status, suggested_by
      ) VALUES ($1,$2,$3,$4,$5,$6,'open',$7)
      ON CONFLICT (contact_id, possible_duplicate_contact_id, match_type)
      DO UPDATE SET
        score = GREATEST(duplicate_suggestions.score, EXCLUDED.score),
        reason = EXCLUDED.reason,
        evidence = EXCLUDED.evidence,
        updated_at = now()
      RETURNING *
      `,
      [dto.contact_id, dto.possible_duplicate_contact_id, dto.match_type, dto.score, dto.reason, dto.evidence, dto.suggested_by ?? "dedupe_v1"]
    );
    return res.rows[0];
  },

  async resolveSuggestion(id: string, resolution: "accepted" | "rejected") {
    const pool = getPool();
    const res = await pool.query(
      `
      UPDATE duplicate_suggestions
      SET status = $2, resolved_at = now(), resolved_by = 'dashboard'
      WHERE id = $1
      RETURNING *
      `,
      [id, resolution]
    );
    return res.rows[0];
  },
};
