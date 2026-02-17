import { getPool } from "../shared/db";

export type DbClient = { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> };

export async function q(client: DbClient | null, sql: string, params: any[] = []) {
  const c = client ?? getPool();
  // Pool has query(), Client has query(); both compatible
  return await (c as any).query(sql, params);
}
