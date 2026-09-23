-- Task Planner wizard sessions and AI suggestions

CREATE TABLE IF NOT EXISTS task_planner_sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'applied', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_planner_suggestions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES task_planner_sessions(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  task_title TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('Google Tasks', 'TickTick')),
  account_id TEXT NOT NULL,
  list_id TEXT NOT NULL,
  current_due_date TEXT,
  action TEXT NOT NULL CHECK (action IN ('reschedule', 'complete', 'dismiss', 'keep')),
  suggested_due_date TEXT,
  reasoning TEXT,
  accepted INTEGER,
  applied_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_task_planner_suggestions_session
  ON task_planner_suggestions(session_id);
