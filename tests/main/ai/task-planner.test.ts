import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { generateTaskPlannerSuggestions } from '../../../electron/main/ai/task-planner';

describe('generateTaskPlannerSuggestions', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE ai_consent_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        consented INTEGER NOT NULL DEFAULT 0,
        policy_version TEXT NOT NULL DEFAULT '1.0',
        consented_at TEXT,
        revoked_at TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO ai_consent_settings (id, consented) VALUES (1, 0);
    `);
  });

  afterEach(() => {
    db.close();
  });

  it('throws when AI consent is not granted', async () => {
    await expect(
      generateTaskPlannerSuggestions(
        db,
        [{ taskId: 't1', title: 'Test', source: 'Google Tasks', dueDate: null, listTitle: 'Inbox' }],
        null,
      ),
    ).rejects.toThrow('AI consent required');
  });

  it('throws when no API key is configured', async () => {
    db.exec('UPDATE ai_consent_settings SET consented = 1 WHERE id = 1');
    await expect(
      generateTaskPlannerSuggestions(
        db,
        [{ taskId: 't1', title: 'Test', source: 'Google Tasks', dueDate: null, listTitle: 'Inbox' }],
        null,
      ),
    ).rejects.toThrow('No API key configured');
  });

  it('returns empty array for empty task list', async () => {
    db.exec('UPDATE ai_consent_settings SET consented = 1 WHERE id = 1');
    const result = await generateTaskPlannerSuggestions(db, [], null);
    expect(result).toEqual([]);
  });
});
