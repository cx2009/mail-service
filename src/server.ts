import "dotenv/config";
import express from "express";
import cors from "cors";
import { loadEnv } from "./types";
import { handleSend } from "./routes/send";
import { handleTrack } from "./routes/track";
import { listTemplates } from "./templates";
import { closePool } from "./lib/db";

const env = loadEnv();
const app = express();

// Parse ALLOWED_ORIGINS into CORS origin config
function parseOrigins(raw: string): string | string[] {
  const trimmed = raw.trim();
  if (trimmed === "*") return "*";
  const origins = trimmed
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return origins.length > 0 ? origins : "*";
}

app.use(
  cors({
    origin: parseOrigins(env.ALLOWED_ORIGINS),
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Request-Id"],
    maxAge: 86400,
  }),
);

app.use(express.json({ limit: "1mb" }));

// --- Routes ---

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: Date.now() });
});

app.get("/api/templates", (_req, res) => {
  res.json({ templates: listTemplates() });
});

app.post("/api/send", (req, res) => {
  handleSend(req, res, env).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "internal_error", detail: msg });
  });
});

app.post("/api/track", (req, res) => {
  handleTrack(req, res, env).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "internal_error", detail: msg });
  });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

// Start server
const server = app.listen(env.PORT, () => {
  console.log(`mail-service listening on port ${env.PORT}`);
});

// Graceful shutdown
function shutdown(signal: string): void {
  console.log(`Received ${signal}, shutting down...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
