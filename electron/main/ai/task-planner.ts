import type Database from 'better-sqlite3';
import { getDecryptedKey, type LlmProvider } from '../auth/api-keys';
import { hasAiConsent } from './consent';

export type PlannerAction = 'reschedule' | 'complete' | 'dismiss' | 'keep';

export interface PlannerTaskInput {
  taskId: string;
  title: string;
  source: 'Google Tasks' | 'TickTick';
  dueDate: string | null;
  listTitle: string;
}

export interface PlannerWorkloadContext {
  overdueTasks: number;
  todayTasks: number;
  todayEvents: number;
  score: number;
}

export interface PlannerSuggestion {
  taskId: string;
  action: PlannerAction;
  suggestedDueDate: string | null;
  reasoning: string;
}

interface ApiKeyInfo {
  provider: LlmProvider;
  apiKey: string;
  baseUrl?: string;
}

const PLANNER_PROMPT = `You are a task planning assistant. Review the user's open tasks and suggest an action for each.

For each task, choose exactly ONE action:
- **reschedule**: Set a new due date (provide suggestedDueDate as YYYY-MM-DD)
- **complete**: Mark as done (user should finish it now)
- **dismiss**: Remove/delete the task (no longer relevant)
- **keep**: Leave unchanged (already well-scheduled)

Consider workload context when scheduling. Spread tasks across available days. Prioritize overdue items.

Respond with ONLY a JSON array in this exact format:
[
  {"taskId": "<id>", "action": "<reschedule|complete|dismiss|keep>", "suggestedDueDate": "<YYYY-MM-DD or null>", "reasoning": "<brief explanation>"}
]

Today's date: {today}
Workload: {workload}

Tasks:
{tasks}`;

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

async function callOpenAI(apiKey: string, prompt: string, baseUrl?: string): Promise<string> {
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
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 4000,
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

async function callAnthropic(apiKey: string, prompt: string, baseUrl?: string): Promise<string> {
  const url = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/v1/messages`
    : 'https://api.anthropic.com/v1/messages';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
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

function buildPrompt(
  tasks: PlannerTaskInput[],
  workload: PlannerWorkloadContext | null,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const taskLines = tasks
    .map(
      (t) =>
        `- [${t.taskId}] "${t.title}" (${t.source}, list: ${t.listTitle}, due: ${t.dueDate ?? 'none'})`,
    )
    .join('\n');

  const workloadStr = workload
    ? `score=${workload.score}, overdue=${workload.overdueTasks}, todayTasks=${workload.todayTasks}, events=${workload.todayEvents}`
    : 'unavailable';

  return PLANNER_PROMPT
    .replace('{today}', today)
    .replace('{workload}', workloadStr)
    .replace('{tasks}', taskLines);
}

function parseSuggestionsResponse(
  response: string,
  taskIds: Set<string>,
): PlannerSuggestion[] {
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI planner response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as Array<{
    taskId?: string;
    action?: string;
    suggestedDueDate?: string | null;
    reasoning?: string;
  }>;

  const validActions = new Set(['reschedule', 'complete', 'dismiss', 'keep']);
  const results: PlannerSuggestion[] = [];

  for (const item of parsed) {
    if (!item.taskId || !taskIds.has(item.taskId)) continue;
    const action = item.action as PlannerAction;
    if (!validActions.has(action)) continue;

    results.push({
      taskId: item.taskId,
      action,
      suggestedDueDate: action === 'reschedule' ? item.suggestedDueDate ?? null : null,
      reasoning: typeof item.reasoning === 'string' ? item.reasoning : '',
    });
  }

  return results;
}

export async function generateTaskPlannerSuggestions(
  db: Database.Database,
  tasks: PlannerTaskInput[],
  workload: PlannerWorkloadContext | null,
): Promise<PlannerSuggestion[]> {
  if (tasks.length === 0) {
    return [];
  }

  if (!hasAiConsent(db)) {
    throw new Error('AI consent required. Enable AI features in Settings.');
  }

  const keyInfo = getActiveApiKey(db);
  if (!keyInfo) {
    throw new Error('No API key configured. Add an OpenAI or Anthropic key in Settings.');
  }

  const prompt = buildPrompt(tasks, workload);
  let rawResponse: string;

  if (keyInfo.provider === 'openai' || keyInfo.provider === 'litellm') {
    rawResponse = await callOpenAI(keyInfo.apiKey, prompt, keyInfo.baseUrl);
  } else if (keyInfo.provider === 'anthropic') {
    rawResponse = await callAnthropic(keyInfo.apiKey, prompt, keyInfo.baseUrl);
  } else {
    throw new Error(`Unsupported provider: ${keyInfo.provider}`);
  }

  const taskIds = new Set(tasks.map((t) => t.taskId));
  const suggestions = parseSuggestionsResponse(rawResponse, taskIds);

  const suggestedIds = new Set(suggestions.map((s) => s.taskId));
  for (const task of tasks) {
    if (!suggestedIds.has(task.taskId)) {
      suggestions.push({
        taskId: task.taskId,
        action: 'keep',
        suggestedDueDate: null,
        reasoning: 'No AI suggestion returned; keeping unchanged.',
      });
    }
  }

  return suggestions;
}
