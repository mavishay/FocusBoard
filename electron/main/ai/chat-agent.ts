import type Database from 'better-sqlite3';
import { getDecryptedKey, type LlmProvider } from '../auth/api-keys';
import { hasAiConsent } from './consent';
import { getClassifiedEmails } from './classifier';
import { NotesService } from '../services/notes-service';
import type { ChatActionRecord, ChatMessage } from '../services/chat-service';

export type ChatActionType =
  | 'create_note'
  | 'list_emails'
  | 'list_tasks'
  | 'list_notes';

export interface ChatAction {
  type: ChatActionType;
  params?: Record<string, unknown>;
}

export interface AgentResponse {
  message: string;
  actions?: ChatAction[];
}

interface ApiKeyInfo {
  provider: LlmProvider;
  apiKey: string;
  baseUrl?: string;
}

interface LlmMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT = `You are FocusBoard AI, a helpful assistant for a busy consultant using the FocusBoard desktop app.

You can query emails, tasks, and notes, and create notes on behalf of the user.

When the user asks you to look up data or take an action, respond with ONLY a JSON object in this exact format:
{
  "message": "<your natural-language reply to the user>",
  "actions": [
    { "type": "<action_type>", "params": { ... } }
  ]
}

Available actions:
- create_note: params { title (required), content?, tags? } — creates a note (use when user wants to save information)
- list_emails: params { classification?: "urgent"|"action"|"fyi"|"noise", limit?: number } — lists unread classified emails
- list_tasks: params { limit?: number } — lists open tasks from Google Tasks and TickTick
- list_notes: params { search?: string, limit?: number } — lists notes

Rules:
- Use actions when the user asks to see data or create a note. For general conversation, return an empty actions array.
- Keep messages concise and helpful.
- When listing items, summarize key details in your message after actions run.
- For create_note, always include a clear title.
- Default limit for list actions is 10.
- Do not invent data; only reference what actions return.`;

function getActiveApiKey(db: Database.Database): ApiKeyInfo | null {
  const keys = db
    .prepare('SELECT id, provider, base_url FROM api_keys ORDER BY created_at DESC')
    .all() as Array<{ id: string; provider: LlmProvider; base_url: string | null }>;

  for (const key of keys) {
    const apiKey = getDecryptedKey(db, key.id);
    if (apiKey) {
      return {
        provider: key.provider,
        apiKey,
        baseUrl: key.base_url ?? undefined,
      };
    }
  }
  return null;
}

async function callOpenAI(
  apiKey: string,
  messages: LlmMessage[],
  baseUrl?: string,
  maxTokens = 1000
): Promise<string> {
  const url = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`
    : 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? '';
}

async function callAnthropic(
  apiKey: string,
  messages: LlmMessage[],
  baseUrl?: string,
  maxTokens = 1000
): Promise<string> {
  const url = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/v1/messages`
    : 'https://api.anthropic.com/v1/messages';

  const systemMessage = messages.find((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemMessage?.content,
      messages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    content: Array<{ text: string }>;
  };
  return data.content[0]?.text ?? '';
}

async function callLlm(
  keyInfo: ApiKeyInfo,
  messages: LlmMessage[],
  maxTokens = 1000
): Promise<string> {
  if (keyInfo.provider === 'openai' || keyInfo.provider === 'litellm') {
    return callOpenAI(keyInfo.apiKey, messages, keyInfo.baseUrl, maxTokens);
  }
  if (keyInfo.provider === 'anthropic') {
    return callAnthropic(keyInfo.apiKey, messages, keyInfo.baseUrl, maxTokens);
  }
  throw new Error(`Unsupported provider: ${keyInfo.provider}`);
}

function parseAgentResponse(raw: string): AgentResponse | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as {
      message?: string;
      actions?: Array<{ type?: string; params?: Record<string, unknown> }>;
    };

    if (!parsed.message || typeof parsed.message !== 'string') {
      return null;
    }

    const validTypes: ChatActionType[] = [
      'create_note',
      'list_emails',
      'list_tasks',
      'list_notes',
    ];

    const actions: ChatAction[] = [];
    if (Array.isArray(parsed.actions)) {
      for (const action of parsed.actions) {
        if (
          action.type &&
          validTypes.includes(action.type as ChatActionType)
        ) {
          actions.push({
            type: action.type as ChatActionType,
            params: action.params ?? {},
          });
        }
      }
    }

    return { message: parsed.message, actions };
  } catch {
    return null;
  }
}

function listTasks(db: Database.Database, limit = 10): unknown[] {
  const googleRows = db
    .prepare(
      `SELECT gt.id, gt.title, gt.notes, gt.status, gt.due, gtl.title as list_title
       FROM google_tasks gt
       JOIN google_task_lists gtl ON gt.list_id = gtl.id
       WHERE gt.is_deleted = 0 AND gt.status = 'needsAction'
       ORDER BY gt.updated_at DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
      id: string;
      title: string;
      notes: string | null;
      status: string;
      due: string | null;
      list_title: string | null;
    }>;

  const ticktickRows = db
    .prepare(
      `SELECT tt.id, tt.title, tt.content, tt.due_date, tp.name as project_name
       FROM ticktick_tasks tt
       JOIN ticktick_projects tp ON tt.project_id = tp.id
       WHERE tt.is_deleted = 0 AND tt.status = 0
       ORDER BY tt.updated_at DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
      id: string;
      title: string;
      content: string | null;
      due_date: string | null;
      project_name: string | null;
    }>;

  const googleTasks = googleRows.map((r) => ({
    id: r.id,
    title: r.title,
    notes: r.notes,
    due: r.due,
    listTitle: r.list_title,
    source: 'Google Tasks',
  }));

  const ticktickTasks = ticktickRows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    dueDate: r.due_date,
    projectTitle: r.project_name,
    source: 'TickTick',
  }));

  return [...googleTasks, ...ticktickTasks].slice(0, limit);
}

function executeAction(
  db: Database.Database,
  action: ChatAction
): ChatActionRecord {
  const record: ChatActionRecord = {
    type: action.type,
    params: action.params,
  };

  try {
    switch (action.type) {
      case 'create_note': {
        const title = typeof action.params?.title === 'string'
          ? action.params.title.trim()
          : '';
        if (!title) {
          throw new Error('title is required for create_note');
        }
        const notesService = new NotesService(db);
        const tags = Array.isArray(action.params?.tags)
          ? (action.params.tags as unknown[]).filter(
              (t): t is string => typeof t === 'string'
            )
          : undefined;
        const note = notesService.create({
          title,
          content:
            typeof action.params?.content === 'string'
              ? action.params.content
              : undefined,
          tags,
          source: 'agent',
        });
        record.result = note;
        break;
      }
      case 'list_emails': {
        const classification =
          typeof action.params?.classification === 'string'
            ? action.params.classification
            : undefined;
        const limit =
          typeof action.params?.limit === 'number' ? action.params.limit : 10;
        const emails = getClassifiedEmails(db, {
          classification: classification as
            | 'urgent'
            | 'action'
            | 'fyi'
            | 'noise'
            | undefined,
          limit,
        });
        record.result = emails;
        break;
      }
      case 'list_tasks': {
        const limit =
          typeof action.params?.limit === 'number' ? action.params.limit : 10;
        record.result = listTasks(db, limit);
        break;
      }
      case 'list_notes': {
        const notesService = new NotesService(db);
        const search =
          typeof action.params?.search === 'string'
            ? action.params.search
            : undefined;
        const limit =
          typeof action.params?.limit === 'number' ? action.params.limit : 10;
        const notes = notesService.list({ search }).slice(0, limit);
        record.result = notes;
        break;
      }
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  } catch (err) {
    record.error = err instanceof Error ? err.message : String(err);
  }

  return record;
}

function buildHistoryMessages(messages: ChatMessage[]): LlmMessage[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));
}

function formatActionResults(records: ChatActionRecord[]): string {
  if (records.length === 0) return '';

  const parts = records.map((r) => {
    if (r.error) {
      return `Action ${r.type} failed: ${r.error}`;
    }
    return `Action ${r.type} result: ${JSON.stringify(r.result)}`;
  });

  return `\n\nAction results:\n${parts.join('\n')}`;
}

export async function generateAutoTitle(
  db: Database.Database,
  userMessage: string
): Promise<string> {
  const keyInfo = getActiveApiKey(db);
  if (!keyInfo) {
    return userMessage.slice(0, 50).trim() || 'New conversation';
  }

  const messages: LlmMessage[] = [
    {
      role: 'system',
      content:
        'Generate a short conversation title (max 6 words) based on the user message. Respond with ONLY the title text, no quotes.',
    },
    { role: 'user', content: userMessage },
  ];

  try {
    const raw = await callLlm(keyInfo, messages, 30);
    const title = raw.trim().replace(/^["']|["']$/g, '');
    return title.slice(0, 80) || 'New conversation';
  } catch {
    return userMessage.slice(0, 50).trim() || 'New conversation';
  }
}

export type ChatAgentError = 'consent_required' | 'api_key_required';

export interface ProcessMessageResult {
  assistantContent: string;
  actions: ChatActionRecord[];
  error?: ChatAgentError;
}

export async function processUserMessage(
  db: Database.Database,
  userContent: string,
  history: ChatMessage[]
): Promise<ProcessMessageResult> {
  if (!hasAiConsent(db)) {
    return {
      assistantContent:
        'AI consent is required. Please enable AI features in Settings to use the chat assistant.',
      actions: [],
      error: 'consent_required',
    };
  }

  const keyInfo = getActiveApiKey(db);
  if (!keyInfo) {
    return {
      assistantContent:
        'No API key configured. Add an OpenAI or Anthropic key in Settings to use the chat assistant.',
      actions: [],
      error: 'api_key_required',
    };
  }

  const llmMessages: LlmMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...buildHistoryMessages(history),
    { role: 'user', content: userContent },
  ];

  let rawResponse = await callLlm(keyInfo, llmMessages);
  let parsed = parseAgentResponse(rawResponse);

  if (!parsed) {
    parsed = { message: rawResponse.trim() || 'I could not process that request.' };
  }

  const actionRecords: ChatActionRecord[] = [];
  if (parsed.actions && parsed.actions.length > 0) {
    for (const action of parsed.actions) {
      actionRecords.push(executeAction(db, action));
    }

    const resultsContext = formatActionResults(actionRecords);
    if (resultsContext) {
      const refineMessages: LlmMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...buildHistoryMessages(history),
        { role: 'user', content: userContent },
        {
          role: 'assistant',
          content: `${parsed.message}${resultsContext}`,
        },
        {
          role: 'user',
          content:
            'Incorporate the action results above into a clear, helpful reply. Respond with ONLY a JSON object: {"message": "...", "actions": []}',
        },
      ];

      try {
        rawResponse = await callLlm(keyInfo, refineMessages);
        const refined = parseAgentResponse(rawResponse);
        if (refined?.message) {
          parsed.message = refined.message;
        }
      } catch {
        parsed.message += formatActionResults(actionRecords);
      }
    }
  }

  return {
    assistantContent: parsed.message,
    actions: actionRecords,
  };
}
