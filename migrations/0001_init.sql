-- 0001_init.sql
-- App tables. better-auth tables (user, session, account, verification) live in 0002.
-- FK references to user(id) resolve once 0002 is applied (SQLite validates FKs at DML time).

CREATE TABLE export_configs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE, -- NULL = system template visible to everyone
  name TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL,
  height INTEGER,                              -- NULL means full-page height (full_page = 1)
  device_scale_factor REAL NOT NULL DEFAULT 1,
  full_page INTEGER NOT NULL DEFAULT 0,
  format TEXT NOT NULL DEFAULT 'png',          -- 'png' | 'jpeg' | 'webp'
  quality INTEGER,                             -- 1..100, jpeg/webp only
  omit_background INTEGER NOT NULL DEFAULT 0,
  css TEXT,                                    -- optional injected CSS
  wait_until TEXT NOT NULL DEFAULT 'load',     -- 'load' | 'domcontentloaded' | 'networkidle'
  wait_for_network_idle INTEGER NOT NULL DEFAULT 0,
  timeout_ms INTEGER NOT NULL DEFAULT 10000,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_export_configs_user ON export_configs(user_id);
CREATE INDEX idx_export_configs_system_name ON export_configs(name) WHERE is_system = 1;

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  hash TEXT NOT NULL,
  scopes TEXT NOT NULL DEFAULT '["export:create"]', -- JSON array
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);

CREATE TABLE exports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  config_id TEXT REFERENCES export_configs(id) ON DELETE SET NULL,
  api_key_id TEXT REFERENCES api_keys(id) ON DELETE SET NULL,
  status TEXT NOT NULL,                        -- 'success' | 'error'
  mime TEXT,
  size INTEGER,
  error TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_exports_user ON exports(user_id, created_at DESC);
