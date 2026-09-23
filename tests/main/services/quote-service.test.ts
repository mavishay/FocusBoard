import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rmSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-app'),
  },
}));

function testDbPath(): string {
  return join(__dirname, `__quote_test_${randomBytes(4).toString('hex')}.db`);
}

function cleanupDb(path: string): void {
  try { rmSync(path); } catch {}
  try { rmSync(path + '-wal'); } catch {}
  try { rmSync(path + '-shm'); } catch {}
}

describe('QuoteService', () => {
  let dbPath: string;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    dbPath = testDbPath();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    cleanupDb(dbPath);
  });

  it('returns default quote when APIs fail and no cache exists', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as typeof fetch;

    const { initializeDatabase } = await import('../../../electron/main/db');
    const db = initializeDatabase(dbPath);
    const { QuoteService } = await import('../../../electron/main/services/quote-service');
    const svc = new QuoteService(db);

    const quote = await svc.getToday();
    expect(quote.source).toBe('default');
    expect(quote.content).toContain('getting started');
    expect(quote.author).toBe('Mark Twain');

    db.close();
  });

  it('caches quote for the day and returns cache on subsequent getToday', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ q: 'Test quote', a: 'Test Author' }],
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      }) as typeof fetch;

    const { initializeDatabase } = await import('../../../electron/main/db');
    const db = initializeDatabase(dbPath);
    const { QuoteService } = await import('../../../electron/main/services/quote-service');
    const svc = new QuoteService(db);

    const first = await svc.getToday();
    expect(first.source).toBe('zenquotes');
    expect(first.content).toBe('Test quote');

    const second = await svc.getToday();
    expect(second.source).toBe('cache');
    expect(second.content).toBe('Test quote');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    db.close();
  });

  it('refresh replaces today quote with a new fetch', async () => {
    globalThis.fetch = vi.fn()
      .mockImplementation(async (url: string) => {
        if (url.includes('/api/today')) {
          return {
            ok: true,
            json: async () => [{ q: 'First quote', a: 'Author One' }],
          };
        }
        if (url.includes('/api/random')) {
          return {
            ok: true,
            json: async () => [{ q: 'Second quote', a: 'Author Two' }],
          };
        }
        return { ok: false, json: async () => ({}) };
      }) as typeof fetch;

    const { initializeDatabase } = await import('../../../electron/main/db');
    const db = initializeDatabase(dbPath);
    const { QuoteService } = await import('../../../electron/main/services/quote-service');
    const svc = new QuoteService(db);

    const first = await svc.getToday();
    expect(first.content).toBe('First quote');

    const refreshed = await svc.refresh();
    expect(refreshed.content).toBe('Second quote');
    expect(refreshed.author).toBe('Author Two');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://zenquotes.io/api/random',
      { headers: { Accept: 'application/json' } },
    );

    const cached = await svc.getToday();
    expect(cached.source).toBe('cache');
    expect(cached.content).toBe('Second quote');

    db.close();
  });

  it('falls back to quotable when zenquotes fails', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Quotable wisdom',
          author: 'Quotable Author',
          tags: ['wisdom'],
        }),
      }) as typeof fetch;

    const { initializeDatabase } = await import('../../../electron/main/db');
    const db = initializeDatabase(dbPath);
    const { QuoteService } = await import('../../../electron/main/services/quote-service');
    const svc = new QuoteService(db);

    const quote = await svc.getToday();
    expect(quote.source).toBe('quotable');
    expect(quote.content).toBe('Quotable wisdom');
    expect(quote.tags).toEqual(['wisdom']);

    db.close();
  });
});
