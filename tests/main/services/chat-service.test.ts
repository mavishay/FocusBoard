import { describe, it, expect, afterEach, vi } from 'vitest';
import { rmSync } from 'fs';
import { join } from 'path';
import { ChatService } from '../../../electron/main/services/chat-service';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-app'),
  },
}));

const TEST_DB_PATH = join(__dirname, '__chat-test__.db');

afterEach(() => {
  try { rmSync(TEST_DB_PATH); } catch {}
  try { rmSync(TEST_DB_PATH + '-wal'); } catch {}
  try { rmSync(TEST_DB_PATH + '-shm'); } catch {}
});

describe('ChatService', () => {
  it('creates, lists, and deletes conversations', async () => {
    const { initializeDatabase } = await import('../../../electron/main/db');
    const db = initializeDatabase(TEST_DB_PATH);
    const service = new ChatService(db);

    const created = service.createConversation();
    expect(created.title).toBe('New conversation');
    expect(created.id).toBeTruthy();

    const titled = service.createConversation('Project planning');
    expect(titled.title).toBe('Project planning');

    const list = service.listConversations();
    expect(list).toHaveLength(2);
    expect(list.map((c) => c.id)).toContain(titled.id);

    service.deleteConversation(created.id);
    expect(service.listConversations()).toHaveLength(1);

    db.close();
  });

  it('appends messages and updates conversation timestamp', async () => {
    const { initializeDatabase } = await import('../../../electron/main/db');
    const db = initializeDatabase(TEST_DB_PATH);
    const service = new ChatService(db);

    const conversation = service.createConversation();
    const userMsg = service.appendMessage(conversation.id, 'user', 'Hello');
    expect(userMsg.role).toBe('user');
    expect(userMsg.content).toBe('Hello');

    const assistantMsg = service.appendMessage(
      conversation.id,
      'assistant',
      'Hi there!',
      [{ type: 'list_emails', result: [] }]
    );
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.actions).toHaveLength(1);

    const messages = service.getMessages(conversation.id);
    expect(messages).toHaveLength(2);

    const updated = service.getConversation(conversation.id);
    expect(updated!.updatedAt).toBeTruthy();

    db.close();
  });

  it('updates title and detects auto-title need', async () => {
    const { initializeDatabase } = await import('../../../electron/main/db');
    const db = initializeDatabase(TEST_DB_PATH);
    const service = new ChatService(db);

    const conversation = service.createConversation();
    expect(service.needsAutoTitle(conversation.id)).toBe(false);

    service.appendMessage(conversation.id, 'user', 'What are my tasks?');
    expect(service.needsAutoTitle(conversation.id)).toBe(false);

    service.appendMessage(conversation.id, 'assistant', 'Here are your tasks.');
    expect(service.needsAutoTitle(conversation.id)).toBe(true);

    const updated = service.updateTitle(conversation.id, 'Task inquiry');
    expect(updated.title).toBe('Task inquiry');
    expect(service.needsAutoTitle(conversation.id)).toBe(false);

    db.close();
  });

  it('creates chat tables from migration 028', async () => {
    const { initializeDatabase } = await import('../../../electron/main/db');
    const db = initializeDatabase(TEST_DB_PATH);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain('chat_conversations');
    expect(names).toContain('chat_messages');
    db.close();
  });
});
