import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerQuoteHandlers } from '../../../electron/main/ipc/quote-handlers';

vi.mock('../../../electron/main/services/quote-service', () => ({
  QuoteService: vi.fn().mockImplementation(() => ({
    getToday: vi.fn().mockResolvedValue({
      date: '2026-09-23',
      content: 'Test',
      author: 'Author',
      source: 'zenquotes',
      tags: [],
      fetchedAt: '2026-09-23T00:00:00.000Z',
    }),
    refresh: vi.fn().mockResolvedValue({
      date: '2026-09-23',
      content: 'Refreshed',
      author: 'Author',
      source: 'zenquotes',
      tags: [],
      fetchedAt: '2026-09-23T00:00:00.000Z',
    }),
  })),
}));

describe('Quote Handlers', () => {
  let mockIpcMain: { handle: ReturnType<typeof vi.fn> };
  let mockDb: Record<string, never>;

  beforeEach(() => {
    mockIpcMain = { handle: vi.fn() };
    mockDb = {};
    vi.clearAllMocks();
  });

  it('registers quote:getToday and quote:refresh handlers', () => {
    registerQuoteHandlers(mockIpcMain as never, mockDb as never);
    expect(mockIpcMain.handle).toHaveBeenCalledWith('quote:getToday', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('quote:refresh', expect.any(Function));
  });
});
