-- 030-ticktick-account-type.sql
-- Expand accounts.type CHECK to allow ticktick (and slack).
-- Migration 025 was originally a no-op (SELECT 1) for users who upgraded before PR #79;
-- those databases recorded version 25 without recreating the accounts table.

CREATE TABLE accounts_new (
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
