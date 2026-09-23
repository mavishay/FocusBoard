-- Slack workspace integration for daily-status open actions

CREATE TABLE IF NOT EXISTS accounts_new (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('gmail', 'm365', 'google_tasks', 'ticktick', 'slack')),
  email TEXT NOT NULL,
  display_name TEXT,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO accounts_new (id, type, email, display_name, color, created_at, updated_at)
SELECT id, type, email, display_name, color, created_at, updated_at
FROM accounts;

DROP TABLE accounts;
ALTER TABLE accounts_new RENAME TO accounts;

CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);

INSERT OR IGNORE INTO app_settings (key, value) VALUES ('slack_cutoff_iso', '');
INSERT OR IGNORE INTO app_settings (key, value) VALUES (
  'slack_excluded_senders',
  '["shavit","linear","pr-bot","cursor[bot]"]'
);
