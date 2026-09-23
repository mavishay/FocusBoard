import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rmSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-app'),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
    encryptString: vi.fn().mockReturnValue(Buffer.from('encrypted')),
    decryptString: vi.fn().mockReturnValue('test-api-key'),
  },
}));

function testDbPath(): string {
  return join(__dirname, `__chat_agent_${randomBytes(4).toString('hex')}.db`);
}

function cleanupDb(path: string): void {
  try { rmSync(path); } catch {}
  try { rmSync(path + '-wal'); } catch {}
  try { rmSync(path + '-shm'); } catch {}
}

describe('chat-agent', () => {
  let dbPath: string;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    dbPath = testDbPath();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    cleanupDb(dbPath);
  });

  it('returns consent_required when AI consent is not granted', async () => {
    const { initializeDatabase } = await import('../../../electron/main/db');
    const db = initializeDatabase(dbPath);

    const { processUserMessage } = await import('../../../electron/main/ai/chat-agent');
    const result = await processUserMessage(db, 'Hello', []);

    expect(result.error).toBe('consent_required');
    expect(result.assistantContent).toContain('consent');

    db.close();
  });

  it('returns api_key_required when no API key is configured', async () => {
    const { initializeDatabase } = await import('../../../electron/main/db');
    const db = initializeDatabase(dbPath);

    db.prepare(
      "INSERT OR IGNORE INTO ai_consent_settings (id, consented, consented_at) VALUES (1, 1, datetime('now'))"
    ).run();

    const { processUserMessage } = await import('../../../electron/main/ai/chat-agent');
    const result = await processUserMessage(db, 'Hello', []);

    expect(result.error).toBe('api_key_required');
    expect(result.assistantContent).toContain('API key');

    db.close();
  });

  it('executes create_note action via LLM response', async () => {
    const { initializeDatabase } = await import('../../../electron/main/db');
    const db = initializeDatabase(dbPath);

    db.prepare(
      "INSERT OR IGNORE INTO ai_consent_settings (id, consented, consented_at) VALUES (1, 1, datetime('now'))"
    ).run();
    db.prepare(
      `INSERT INTO api_keys (id, provider, label, encrypted_key, created_at)
       VALUES ('key1', 'openai', 'Test', x'00', datetime('now'))`
    ).run();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              message: 'I created a note for you.',
              actions: [{
                type: 'create_note',
                params: { title: 'Meeting notes', content: 'Discuss roadmap' },
              }],
            }),
          },
        }],
      }),
    }) as typeof fetch;

    const { processUserMessage } = await import('../../../electron/main/ai/chat-agent');
    const result = await processUserMessage(db, 'Create a note about the meeting', []);

    expect(result.error).toBeUndefined();
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].type).toBe('create_note');
    expect(result.actions[0].error).toBeUndefined();

    const notes = db.prepare('SELECT title, source FROM notes').all() as Array<{
      title: string;
      source: string;
    }>;
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe('Meeting notes');
    expect(notes[0].source).toBe('agent');

    db.close();
  });
});
