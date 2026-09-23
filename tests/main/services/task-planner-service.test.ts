import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { TaskPlannerService } from '../../../electron/main/services/task-planner-service';

describe('TaskPlannerService', () => {
  let db: Database.Database;
  let service: TaskPlannerService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE google_task_lists (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        account_id TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE google_tasks (
        id TEXT PRIMARY KEY,
        list_id TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL,
        due TEXT,
        position TEXT NOT NULL,
        parent_id TEXT,
        completed_at TEXT,
        updated_at TEXT NOT NULL,
        synced_at TEXT NOT NULL DEFAULT (datetime('now')),
        is_deleted INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE ticktick_projects (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'TASK',
        updated_at TEXT NOT NULL,
        synced_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE ticktick_tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        due_date TEXT,
        status INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT NOT NULL DEFAULT (datetime('now')),
        is_deleted INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE task_planner_sessions (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE task_planner_suggestions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        task_title TEXT NOT NULL,
        source TEXT NOT NULL,
        account_id TEXT NOT NULL,
        list_id TEXT NOT NULL,
        current_due_date TEXT,
        action TEXT NOT NULL,
        suggested_due_date TEXT,
        reasoning TEXT,
        accepted INTEGER,
        applied_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.prepare(`INSERT INTO google_task_lists (id, title, account_id, updated_at) VALUES ('list-1', 'Work', 'acct-gt', datetime('now'))`).run();
    db.prepare(
      `INSERT INTO google_tasks (id, list_id, title, status, position, updated_at, is_deleted)
       VALUES ('gt-1', 'list-1', 'Open Google task', 'needsAction', '0', datetime('now'), 0)`,
    ).run();
    db.prepare(`INSERT INTO google_tasks (id, list_id, title, status, position, updated_at, is_deleted)
       VALUES ('gt-2', 'list-1', 'Done task', 'completed', '0', datetime('now'), 0)`).run();

    db.prepare(`INSERT INTO ticktick_projects (id, account_id, name, updated_at) VALUES ('proj-1', 'acct-tt', 'Personal', datetime('now'))`).run();
    db.prepare(
      `INSERT INTO ticktick_tasks (id, project_id, title, status, sort_order, created_at, updated_at, is_deleted)
       VALUES ('tt-1', 'proj-1', 'Open TickTick task', 0, 0, datetime('now'), datetime('now'), 0)`,
    ).run();

    service = new TaskPlannerService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('lists only open tasks from both sources', () => {
    const tasks = service.listOpenTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.id).sort()).toEqual(['gt-1', 'tt-1']);
  });

  it('creates a planner session', () => {
    const session = service.createSession();
    expect(session.id).toBeTruthy();
    expect(session.status).toBe('draft');
    expect(session.suggestions).toEqual([]);
  });

  it('accepts all actionable suggestions', () => {
    const session = service.createSession();
    db.prepare(
      `INSERT INTO task_planner_suggestions
         (id, session_id, task_id, task_title, source, account_id, list_id, action, reasoning)
       VALUES ('s1', ?, 'gt-1', 'Task', 'Google Tasks', 'acct-gt', 'list-1', 'reschedule', 'move it')`,
    ).run(session.id);
    db.prepare(
      `INSERT INTO task_planner_suggestions
         (id, session_id, task_id, task_title, source, account_id, list_id, action, reasoning)
       VALUES ('s2', ?, 'tt-1', 'Task 2', 'TickTick', 'acct-tt', 'proj-1', 'keep', 'fine')`,
    ).run(session.id);

    const updated = service.acceptAllSuggestions(session.id);
    expect(updated?.suggestions.find((s) => s.id === 's1')?.accepted).toBe(true);
    expect(updated?.suggestions.find((s) => s.id === 's2')?.accepted).toBeNull();
  });
});
