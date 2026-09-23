import { describe, it, expect, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { rmSync } from 'fs';
import { join } from 'path';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-app'),
  },
}));

import migration001 from '../../../electron/main/db/migrations/001-initial.sql?raw';
import migration002 from '../../../electron/main/db/migrations/002-gmail-oauth.sql?raw';
import migration003 from '../../../electron/main/db/migrations/003-api-keys.sql?raw';
import migration004 from '../../../electron/main/db/migrations/004-lan-pairing.sql?raw';
import migration005 from '../../../electron/main/db/migrations/005-token-attempts.sql?raw';
import migration006 from '../../../electron/main/db/migrations/006-add-token-plaintext.sql?raw';
import migration007 from '../../../electron/main/db/migrations/007-remove-token-plaintext.sql?raw';
import migration008 from '../../../electron/main/db/migrations/008-google-tasks.sql?raw';
import migration009 from '../../../electron/main/db/migrations/009-google-tasks-account-type.sql?raw';
import migration010 from '../../../electron/main/db/migrations/010-telemetry-settings.sql?raw';
import migration011 from '../../../electron/main/db/migrations/011-ticktick.sql?raw';
import migration012 from '../../../electron/main/db/migrations/012-notifications.sql?raw';
import migration013 from '../../../electron/main/db/migrations/013-setup-tracking.sql?raw';
import migration014 from '../../../electron/main/db/migrations/014-ai-consent-settings.sql?raw';
import migration015 from '../../../electron/main/db/migrations/015-cron-scheduler.sql?raw';
import migration016 from '../../../electron/main/db/migrations/016-account-colors.sql?raw';
import migration017 from '../../../electron/main/db/migrations/017-classification-rules.sql?raw';
import migration018 from '../../../electron/main/db/migrations/018-email-cleanup.sql?raw';
import migration019 from '../../../electron/main/db/migrations/019-email-body.sql?raw';
import migration020 from '../../../electron/main/db/migrations/020-task-list-account.sql?raw';
import migration021 from '../../../electron/main/db/migrations/021-services-ready.sql?raw';
import migration022 from '../../../electron/main/db/migrations/022-calendar-events.sql?raw';
import migration023 from '../../../electron/main/db/migrations/023-workload-snapshots.sql?raw';
import migration024 from '../../../electron/main/db/migrations/024-scheduled-notifications.sql?raw';
import migration026 from '../../../electron/main/db/migrations/026-daily-quotes.sql?raw';
import migration027 from '../../../electron/main/db/migrations/027-notes.sql?raw';
import migration028 from '../../../electron/main/db/migrations/028-chat-conversations.sql?raw';
import migration029 from '../../../electron/main/db/migrations/029-task-planner.sql?raw';

const MIGRATIONS_BEFORE_STALE_025: Record<number, string> = {
  1: migration001,
  2: migration002,
  3: migration003,
  4: migration004,
  5: migration005,
  6: migration006,
  7: migration007,
  8: migration008,
  9: migration009,
  10: migration010,
  11: migration011,
  12: migration012,
  13: migration013,
  14: migration014,
  15: migration015,
  16: migration016,
  17: migration017,
  18: migration018,
  19: migration019,
  20: migration020,
  21: migration021,
  22: migration022,
  23: migration023,
  24: migration024,
};

const MIGRATIONS_AFTER_STALE_025: Record<number, string> = {
  26: migration026,
  27: migration027,
  28: migration028,
  29: migration029,
};

const TEST_DB_PATH = join(__dirname, '__migration-030-test__.db');

function runMigrations(
  db: Database.Database,
  migrations: Record<number, string>
): void {
  for (const [version, sql] of Object.entries(migrations)) {
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(
      Number(version)
    );
  }
}

function insertTickTickAccount(db: Database.Database): void {
  db.prepare(
    `INSERT INTO accounts (id, type, email, display_name)
     VALUES (?, 'ticktick', ?, ?)`
  ).run('tick-1', 'user@example.com', 'TickTick User');
}

afterEach(() => {
  try {
    rmSync(TEST_DB_PATH);
  } catch {}
  try {
    rmSync(TEST_DB_PATH + '-wal');
  } catch {}
  try {
    rmSync(TEST_DB_PATH + '-shm');
  } catch {}
});

describe('migration 030 ticktick account type', () => {
  it('allows ticktick account inserts on a fresh database', async () => {
    const { initializeDatabase } = await import('../../../electron/main/db');
    const db = initializeDatabase(TEST_DB_PATH);

    insertTickTickAccount(db);

    const row = db
      .prepare(`SELECT type FROM accounts WHERE id = ?`)
      .get('tick-1') as { type: string };
    expect(row.type).toBe('ticktick');
    db.close();
  });

  it('fixes databases where migration 025 was applied as a no-op', async () => {
    const db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    runMigrations(db, MIGRATIONS_BEFORE_STALE_025);
    db.exec('SELECT 1');
    db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(25);
    runMigrations(db, MIGRATIONS_AFTER_STALE_025);

    expect(() => insertTickTickAccount(db)).toThrow(/CHECK constraint failed/);
    db.close();

    const { initializeDatabase } = await import('../../../electron/main/db');
    const migrated = initializeDatabase(TEST_DB_PATH);
    insertTickTickAccount(migrated);

    const row = migrated
      .prepare(`SELECT type FROM accounts WHERE id = ?`)
      .get('tick-1') as { type: string };
    expect(row.type).toBe('ticktick');

    const version = migrated
      .prepare('SELECT MAX(version) as version FROM schema_migrations')
      .get() as { version: number };
    expect(version.version).toBe(30);

    migrated.close();
  });

  it('preserves existing gmail and google_tasks accounts', async () => {
    const { initializeDatabase } = await import('../../../electron/main/db');
    const db = initializeDatabase(TEST_DB_PATH);

    db.prepare(
      `INSERT INTO accounts (id, type, email, display_name)
       VALUES (?, 'gmail', ?, ?)`
    ).run('gmail-1', 'gmail@example.com', 'Gmail User');
    db.prepare(
      `INSERT INTO accounts (id, type, email, display_name)
       VALUES (?, 'google_tasks', ?, ?)`
    ).run('gt-1', 'tasks@example.com', 'Tasks User');

    insertTickTickAccount(db);

    const types = db
      .prepare(`SELECT type FROM accounts ORDER BY id`)
      .all() as Array<{ type: string }>;
    expect(types.map((t) => t.type)).toEqual([
      'gmail',
      'google_tasks',
      'ticktick',
    ]);
    db.close();
  });
});
