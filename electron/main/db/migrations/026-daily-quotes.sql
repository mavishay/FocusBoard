CREATE TABLE IF NOT EXISTS daily_quotes (
  date TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  source TEXT NOT NULL,
  tags TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);
