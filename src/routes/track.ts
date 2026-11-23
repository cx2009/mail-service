import type { Request, Response } from "express";
import { asRecord, asString, isEventName, jsonByteSize } from "../lib/validate";
import { consumeQuota } from "../lib/quota";
import { getPool, today } from "../lib/db";
import type { AppEnv } from "../types";

const MAX_PROPS_BYTES = 2048;
const MAX_UA_CHARS = 512;

export async function handleTrack(req: Request, res: Response, env: AppEnv): Promise<void> {
  const raw = req.body as unknown;
  const body = asRecord(raw);

  const event = asString(body.event, 64);
  if (event === null || !isEventName(event)) {
    res.status(400).json({ error: "invalid_event" });
    return;
  }

  const props = asRecord(body.props);
  if (jsonByteSize(props) > MAX_PROPS_BYTES) {
    res.status(413).json({ error: "props_too_large", max_bytes: MAX_PROPS_BYTES });
    return;
  }

  const quota = await consumeQuota(env, "track", env.DAILY_TRACK_LIMIT);
  if (!quota.ok) {
    res.status(429).json({ error: "daily_limit_exceeded", limit: quota.limit });
    return;
  }

  const pageUrl = asString(body.url, 2048);
  const referrer = asString(body.referrer, 2048);
  const userAgent = (req.headers["user-agent"] ?? "") as string;
  const clientIp =
    (req.headers["cf-connecting-ip"] as string | undefined) ??
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();

  const pool = getPool(env);
  const day = today();

  const query = `
    INSERT INTO track_event (event, props, url, referrer, ua, ip, day, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;

  pool
    .query(query, [
      event,
      JSON.stringify(props),
      pageUrl,
      referrer,
      userAgent.length > 0 ? userAgent.slice(0, MAX_UA_CHARS) : null,
      clientIp,
      day,
      Date.now(),
    ])
    .catch(() => undefined);

  res.status(202).json({ ok: true });
}
