import type Database from 'better-sqlite3';

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatActionRecord {
  type: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatMessageRole;
  content: string;
  actions: ChatActionRecord[];
  createdAt: string;
}

interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  actions: string | null;
  created_at: string;
}

const DEFAULT_TITLE = 'New conversation';

function parseActions(raw: string | null): ChatActionRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ChatActionRecord =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ChatActionRecord).type === 'string'
    );
  } catch {
    return [];
  }
}

function rowToConversation(row: ConversationRow): ChatConversation {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as ChatMessageRole,
    content: row.content,
    actions: parseActions(row.actions),
    createdAt: row.created_at,
  };
}

export class ChatService {
  constructor(private db: Database.Database) {}

  listConversations(): ChatConversation[] {
    const rows = this.db
      .prepare(
        `SELECT id, title, created_at, updated_at
         FROM chat_conversations
         ORDER BY updated_at DESC`
      )
      .all() as ConversationRow[];

    return rows.map(rowToConversation);
  }

  getConversation(id: string): ChatConversation | null {
    const row = this.db
      .prepare(
        `SELECT id, title, created_at, updated_at
         FROM chat_conversations WHERE id = ?`
      )
      .get(id) as ConversationRow | undefined;

    return row ? rowToConversation(row) : null;
  }

  createConversation(title?: string): ChatConversation {
    const id = crypto.randomUUID();
    const resolvedTitle = title?.trim() || DEFAULT_TITLE;

    this.db
      .prepare(
        `INSERT INTO chat_conversations (id, title)
         VALUES (?, ?)`
      )
      .run(id, resolvedTitle);

    const created = this.getConversation(id);
    if (!created) {
      throw new Error('Failed to create conversation');
    }
    return created;
  }

  updateTitle(id: string, title: string): ChatConversation {
    const trimmed = title.trim();
    if (!trimmed) {
      throw new Error('Title is required');
    }

    const result = this.db
      .prepare(
        `UPDATE chat_conversations
         SET title = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(trimmed, id);

    if (result.changes === 0) {
      throw new Error('Conversation not found');
    }

    const updated = this.getConversation(id);
    if (!updated) {
      throw new Error('Failed to update conversation');
    }
    return updated;
  }

  touchConversation(id: string): void {
    this.db
      .prepare(
        `UPDATE chat_conversations
         SET updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(id);
  }

  deleteConversation(id: string): void {
    const result = this.db
      .prepare('DELETE FROM chat_conversations WHERE id = ?')
      .run(id);

    if (result.changes === 0) {
      throw new Error('Conversation not found');
    }
  }

  getMessages(conversationId: string): ChatMessage[] {
    const rows = this.db
      .prepare(
        `SELECT id, conversation_id, role, content, actions, created_at
         FROM chat_messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC`
      )
      .all(conversationId) as MessageRow[];

    return rows.map(rowToMessage);
  }

  appendMessage(
    conversationId: string,
    role: ChatMessageRole,
    content: string,
    actions: ChatActionRecord[] = []
  ): ChatMessage {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const id = crypto.randomUUID();
    const actionsJson = actions.length > 0 ? JSON.stringify(actions) : null;

    this.db
      .prepare(
        `INSERT INTO chat_messages (id, conversation_id, role, content, actions)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, conversationId, role, content, actionsJson);

    this.touchConversation(conversationId);

    const message = this.db
      .prepare(
        `SELECT id, conversation_id, role, content, actions, created_at
         FROM chat_messages WHERE id = ?`
      )
      .get(id) as MessageRow | undefined;

    if (!message) {
      throw new Error('Failed to append message');
    }

    return rowToMessage(message);
  }

  needsAutoTitle(conversationId: string): boolean {
    const conversation = this.getConversation(conversationId);
    if (!conversation || conversation.title !== DEFAULT_TITLE) {
      return false;
    }

    const messageCount = this.db
      .prepare(
        `SELECT COUNT(*) as count
         FROM chat_messages
         WHERE conversation_id = ? AND role IN ('user', 'assistant')`
      )
      .get(conversationId) as { count: number };

    return messageCount.count >= 2;
  }
}
