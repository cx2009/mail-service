import pg from "pg";
import { getPool, today } from "./db";
import type { AppEnv } from "../types";

export interface QuotaResult {
  ok: boolean;
  count: number;
  limit: number;
}

export async function consumeQuota(
  env: AppEnv,
  scope: string,
  limit: number,
): Promise<QuotaResult> {
  if (limit <= 0) return { ok: false, count: 0, limit: 0 };

  const pool = getPool(env);
  const day = today();

  const query = `
    INSERT INTO daily_quota (day, scope, count) VALUES ($1, $2, 1)
    ON CONFLICT (day, scope) DO UPDATE SET count = daily_quota.count + 1
    RETURNING count
  `;

  const result = await pool.query<{ count: number }>(query, [day, scope]);
  const count = result.rows[0]?.count ?? 0;

  return { ok: count <= limit, count, limit };
}
