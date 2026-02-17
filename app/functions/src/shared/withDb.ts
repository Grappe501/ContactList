import type { HandlerEvent } from "@netlify/functions";
import { getPool } from "./db";
import { ApiError } from "./errors";

export async function withDb<T>(event: HandlerEvent, fn: (client: any) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const u = (event as any).__user;
    if (!u) throw new ApiError(401, "UNAUTHORIZED", "Missing auth context");

    // Set per-transaction settings for RLS
    await client.query(`SELECT set_config('app.user_id', $1, true)`, [String(u.id)]);
    await client.query(`SELECT set_config('app.role', $1, true)`, [String(u.role)]);

    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
