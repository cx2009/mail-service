export interface AppEnv {
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  DATABASE_URL: string;
  ALLOWED_ORIGINS: string;
  DAILY_SEND_LIMIT: number;
  DAILY_TRACK_LIMIT: number;
  PORT: number;
}

export function loadEnv(): AppEnv {
  const require = (globalThis as unknown as { require?: NodeRequire }).require;
  if (require) {
    try { require("dotenv").config(); } catch { /* no dotenv */ }
  } else {
    try {
      // ESM dynamic import fallback would go here but we use static config below
    } catch { /* ignore */ }
  }

  function str(key: string, fallback = ""): string {
    return (process.env[key] ?? fallback).trim();
  }
  function num(key: string, fallback: number): number {
    const v = Number.parseInt(process.env[key] ?? "", 10);
    return Number.isFinite(v) ? v : fallback;
  }

  return {
    SMTP_HOST: str("SMTP_HOST", "smtp.gmail.com"),
    SMTP_PORT: num("SMTP_PORT", 587),
    SMTP_USER: str("SMTP_USER"),
    SMTP_PASS: str("SMTP_PASS"),
    SMTP_FROM: str("SMTP_FROM"),
    DATABASE_URL: str("DATABASE_URL"),
    ALLOWED_ORIGINS: str("ALLOWED_ORIGINS", "*"),
    DAILY_SEND_LIMIT: num("DAILY_SEND_LIMIT", 100),
    DAILY_TRACK_LIMIT: num("DAILY_TRACK_LIMIT", 5000),
    PORT: num("PORT", 3000),
  };
}
