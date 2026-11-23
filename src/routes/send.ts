import type { Request, Response } from "express";
import { asRecord, asString, isEmail } from "../lib/validate";
import { consumeQuota } from "../lib/quota";
import { sendEmail } from "../lib/smtp";
import { writeEmailLog } from "../lib/log";
import { renderTemplate } from "../templates";
import type { AppEnv } from "../types";

const MAX_BODY_CHARS = 200_000;

export async function handleSend(req: Request, res: Response, env: AppEnv): Promise<void> {
  const raw = req.body as unknown;
  const body = asRecord(raw);

  const to = asString(body.to, 320);
  if (to === null || !isEmail(to)) {
    res.status(400).json({ error: "invalid_to" });
    return;
  }

  if (typeof body.html === "string" && body.html.length > MAX_BODY_CHARS) {
    res.status(413).json({ error: "html_too_large", max: MAX_BODY_CHARS });
    return;
  }
  if (typeof body.text === "string" && body.text.length > MAX_BODY_CHARS) {
    res.status(413).json({ error: "text_too_large", max: MAX_BODY_CHARS });
    return;
  }

  let subject = asString(body.subject, 200) ?? "";
  let html = asString(body.html, MAX_BODY_CHARS) ?? "";
  let text = asString(body.text, MAX_BODY_CHARS) ?? "";
  const templateName = asString(body.template, 64);

  if (templateName !== null) {
    const rendered = renderTemplate(templateName, asRecord(body.data));
    if (rendered === null) {
      res.status(400).json({ error: "unknown_template", template: templateName });
      return;
    }
    subject = rendered.subject;
    html = rendered.html;
    text = rendered.text;
  }

  if (subject.length === 0) {
    res.status(400).json({ error: "missing_subject" });
    return;
  }
  if (html.length === 0 && text.length === 0) {
    res.status(400).json({ error: "missing_body" });
    return;
  }

  const quota = await consumeQuota(env, "send", env.DAILY_SEND_LIMIT);
  if (!quota.ok) {
    res.status(429).json({ error: "daily_limit_exceeded", limit: quota.limit });
    return;
  }

  const result = await sendEmail(env, { to, subject, html, text });
  const logId = crypto.randomUUID();
  const clientIp =
    (req.headers["cf-connecting-ip"] as string | undefined) ??
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();

  // Fire and forget log write
  writeEmailLog(env, {
    id: logId,
    toAddress: to,
    subject,
    template: templateName ?? undefined,
    status: result.ok ? "sent" : "failed",
    providerId: result.providerId,
    error: result.error,
    ip: clientIp,
  }).catch(() => undefined);

  if (!result.ok) {
    res.status(502).json({ error: "send_failed", detail: result.error, log_id: logId });
    return;
  }

  res.status(200).json({ ok: true, id: result.providerId ?? null, log_id: logId });
}
