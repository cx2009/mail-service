-- Supabase Postgres 兼容 schema

-- 发信日志：每条邮件一条记录，用于排查送达与统计
CREATE TABLE IF NOT EXISTS email_log (
  id          TEXT PRIMARY KEY,
  to_address  TEXT NOT NULL,
  subject     TEXT NOT NULL,
  template    TEXT,
  status      TEXT NOT NULL,
  provider_id TEXT,
  error       TEXT,
  ip          TEXT,
  created_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log (created_at);

-- 每日配额：send / track 两个 scope 各一行
CREATE TABLE IF NOT EXISTS daily_quota (
  day   TEXT NOT NULL,
  scope TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, scope)
);

-- 埋点事件
CREATE TABLE IF NOT EXISTS track_event (
  id         BIGSERIAL PRIMARY KEY,
  event      TEXT NOT NULL,
  props      TEXT,
  url        TEXT,
  referrer   TEXT,
  ua         TEXT,
  ip         TEXT,
  day        TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_track_event_day ON track_event (day, event);
