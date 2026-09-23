import type { IpcMain } from 'electron';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { ChatService } from '../services/chat-service';
import { generateAutoTitle, processUserMessage } from '../ai/chat-agent';

const ConversationIdSchema = z.object({
  conversationId: z.string().min(1),
});

const CreateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

const SendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1).max(10_000),
});

export function registerChatHandlers(
  ipcMain: IpcMain,
  db: Database.Database
): void {
  const chatService = new ChatService(db);

  ipcMain.handle('chat:listConversations', async () => {
    return chatService.listConversations();
  });

  ipcMain.handle('chat:createConversation', async (_event, payload?: unknown) => {
    const parsed = CreateConversationSchema.safeParse(payload ?? {});
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`);
    }
    return chatService.createConversation(parsed.data.title);
  });

  ipcMain.handle('chat:deleteConversation', async (_event, payload: unknown) => {
    const parsed = ConversationIdSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`);
    }
    chatService.deleteConversation(parsed.data.conversationId);
    return { success: true };
  });

  ipcMain.handle('chat:getMessages', async (_event, payload: unknown) => {
    const parsed = ConversationIdSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`);
    }
    return chatService.getMessages(parsed.data.conversationId);
  });

  ipcMain.handle('chat:sendMessage', async (_event, payload: unknown) => {
    const parsed = SendMessageSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`);
    }

    const { conversationId, content } = parsed.data;
    const history = chatService.getMessages(conversationId);

    const userMessage = chatService.appendMessage(conversationId, 'user', content);

    try {
      const result = await processUserMessage(db, content, history);

      const assistantMessage = chatService.appendMessage(
        conversationId,
        'assistant',
        result.assistantContent,
        result.actions
      );

      if (chatService.needsAutoTitle(conversationId)) {
        const title = await generateAutoTitle(db, content);
        chatService.updateTitle(conversationId, title);
      }

      const conversation = chatService.getConversation(conversationId);

      return {
        userMessage,
        assistantMessage,
        conversation,
        error: result.error,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to process message';
      const assistantMessage = chatService.appendMessage(
        conversationId,
        'assistant',
        `Sorry, something went wrong: ${errorMessage}`
      );

      return {
        assistantMessage,
        error: 'processing_error' as const,
      };
    }
  });
}
