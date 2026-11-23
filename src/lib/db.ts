import pg from "pg";
import type { AppEnv } from "../types";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(env: AppEnv): pg.Pool {
  if (pool) return pool;
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
  });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Postgres-compatible date function (D1 used INTEGER timestamp, we keep INTEGER for track_event.created_at)
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
