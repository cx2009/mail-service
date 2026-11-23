import pg from "pg";
import { getPool } from "./db";
import type { AppEnv } from "../types";

export interface EmailLogEntry {
  id: string;
  toAddress: string;
  subject: string;
  template?: string;
  status: "sent" | "failed";
  providerId?: string;
  error?: string;
  ip?: string;
}

export async function writeEmailLog(
  env: AppEnv,
  entry: EmailLogEntry,
): Promise<void> {
  const pool = getPool(env);
  const query = `
    INSERT INTO email_log (id, to_address, subject, template, status, provider_id, error, ip, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `;
  await pool.query(query, [
    entry.id,
    entry.toAddress,
    entry.subject,
    entry.template ?? null,
    entry.status,
    entry.providerId ?? null,
    entry.error ?? null,
    entry.ip ?? null,
    Date.now(),
  ]);
}
