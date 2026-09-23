import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerChatHandlers } from '../../../electron/main/ipc/chat-handlers';

const mockChatService = {
  listConversations: vi.fn(),
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  getMessages: vi.fn(),
  appendMessage: vi.fn(),
  getConversation: vi.fn(),
  needsAutoTitle: vi.fn(),
  updateTitle: vi.fn(),
};

vi.mock('../../../electron/main/services/chat-service', () => ({
  ChatService: vi.fn().mockImplementation(() => mockChatService),
}));

vi.mock('../../../electron/main/ai/chat-agent', () => ({
  processUserMessage: vi.fn(),
  generateAutoTitle: vi.fn(),
}));

describe('Chat Handlers', () => {
  let mockIpcMain: { handle: ReturnType<typeof vi.fn> };
  let mockDb: Record<string, never>;

  beforeEach(() => {
    mockIpcMain = { handle: vi.fn() };
    mockDb = {};
    vi.clearAllMocks();
  });

  it('registers all chat IPC handlers', () => {
    registerChatHandlers(mockIpcMain as never, mockDb as never);

    expect(mockIpcMain.handle).toHaveBeenCalledWith('chat:listConversations', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('chat:createConversation', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('chat:deleteConversation', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('chat:getMessages', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('chat:sendMessage', expect.any(Function));
  });
});
