import type { AppEnv } from "../types";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

const BREVO_API = "https://api.brevo.com/v3/smtp/email";

interface BrevoResponse {
  messageId?: string;
  code?: string;
  message?: string;
}

export async function sendEmail(
  env: AppEnv,
  mail: OutgoingEmail,
): Promise<SendResult> {
  const apiKey = env.SMTP_PASS; // reusing field name for Brevo API key
  if (!apiKey) {
    return { ok: false, error: "brevo_api_key_not_set" };
  }

  const payload: Record<string, unknown> = {
    sender: {
      name: "tonywallect",
      email: env.SMTP_FROM || env.SMTP_USER || "noreply@tonywallect.dpdns.org",
    },
    to: [{ email: mail.to }],
    subject: mail.subject,
  };

  if (mail.html.length > 0) payload.htmlContent = mail.html;
  if (mail.text.length > 0) payload.textContent = mail.text;

  try {
    const response = await fetch(BREVO_API, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as BrevoResponse | null;

    if (!response.ok) {
      return {
        ok: false,
        error: data?.message ?? data?.code ?? `brevo_http_${response.status}`,
      };
    }

    return { ok: true, providerId: data?.messageId ?? undefined };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
