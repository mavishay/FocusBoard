import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerNotesHandlers } from '../../../electron/main/ipc/notes-handlers';

const mockNotesService = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getAllTags: vi.fn(),
};

vi.mock('../../../electron/main/services/notes-service', () => ({
  NotesService: vi.fn().mockImplementation(() => mockNotesService),
}));

describe('Notes Handlers', () => {
  let mockIpcMain: { handle: ReturnType<typeof vi.fn> };
  let mockDb: Record<string, never>;

  beforeEach(() => {
    mockIpcMain = { handle: vi.fn() };
    mockDb = {};
    vi.clearAllMocks();
  });

  it('registers all notes IPC handlers', () => {
    registerNotesHandlers(mockIpcMain as never, mockDb as never);

    expect(mockIpcMain.handle).toHaveBeenCalledWith('notes:list', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('notes:create', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('notes:update', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('notes:delete', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('notes:getAllTags', expect.any(Function));
  });
});
