import type Database from 'better-sqlite3';
import { getAccessToken, listWorkspaces } from '../auth/slack';
import {
  isAfterCutoff,
  isExcludedSender,
  parseExcludedSenders,
} from './filters';
import type {
  SlackOpenAction,
  SlackOpenActionsResult,
  SlackSettings,
  SlackWorkspaceCount,
} from './types';

interface Conversation {
  id: string;
  is_im?: boolean;
  is_mpim?: boolean;
  unread_count_display?: number;
  name?: string;
}

interface HistoryMessage {
  ts: string;
  text?: string;
  user?: string;
  bot_id?: string;
  subtype?: string;
  username?: string;
}

interface SearchMatch {
  ts: string;
  text?: string;
  username?: string;
  bot_id?: string;
  subtype?: string;
  permalink?: string;
  channel?: { id?: string; name?: string };
}

function getAppSetting(db: Database.Database, key: string): string | null {
  const row = db
    .prepare('SELECT value FROM app_settings WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function getSlackSettings(db: Database.Database): SlackSettings {
  const cutoffRaw = getAppSetting(db, 'slack_cutoff_iso');
  return {
    cutoffIso: cutoffRaw && cutoffRaw.length > 0 ? cutoffRaw : null,
    excludedSenders: parseExcludedSenders(getAppSetting(db, 'slack_excluded_senders')),
  };
}

export function updateSlackSettings(
  db: Database.Database,
  settings: Partial<SlackSettings>,
): SlackSettings {
  if (settings.cutoffIso !== undefined) {
    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('slack_cutoff_iso', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    ).run(settings.cutoffIso ?? '');
  }

  if (settings.excludedSenders !== undefined) {
    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('slack_excluded_senders', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    ).run(JSON.stringify(settings.excludedSenders));
  }

  return getSlackSettings(db);
}

async function slackGet<T extends SlackApiResponse<unknown>>(
  token: string,
  method: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }

  const response = await fetch(`https://slack.com/api/${method}?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as T;
  if (!data.ok) {
    throw new Error(String(data.error ?? `Slack API error: ${method}`));
  }
  return data;
}

async function slackPost<T extends SlackApiResponse<unknown>>(
  token: string,
  method: string,
  body: Record<string, string | number | undefined>,
): Promise<T> {
  const payload = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) payload.set(key, String(value));
  }

  const response = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload,
  });

  const data = (await response.json()) as T;
  if (!data.ok) {
    throw new Error(String(data.error ?? `Slack API error: ${method}`));
  }
  return data;
}

async function getAuthUserId(token: string): Promise<string> {
  const auth = await slackPost<{ ok: boolean; user_id?: string; error?: string }>(
    token,
    'auth.test',
    {},
  );
  if (!auth.user_id) {
    throw new Error('Slack auth.test did not return user_id');
  }
  return auth.user_id;
}

async function listUnreadConversations(token: string): Promise<Conversation[]> {
  const conversations: Conversation[] = [];
  let cursor: string | undefined;

  do {
    const data = await slackGet<{
      ok: boolean;
      channels?: Conversation[];
      response_metadata?: { next_cursor?: string };
      error?: string;
    }>(token, 'users.conversations', {
      types: 'im,mpim',
      exclude_archived: 'true',
      limit: 200,
      cursor,
    });

    for (const channel of data.channels ?? []) {
      if ((channel.unread_count_display ?? 0) > 0) {
        conversations.push(channel);
      }
    }

    cursor = data.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return conversations;
}

async function getLatestMessage(
  token: string,
  channelId: string,
): Promise<HistoryMessage | null> {
  const data = await slackGet<{
    ok: boolean;
    messages?: HistoryMessage[];
    error?: string;
  }>(token, 'conversations.history', {
    channel: channelId,
    limit: 1,
  });

  return data.messages?.[0] ?? null;
}

async function getPermalink(
  token: string,
  channelId: string,
  messageTs: string,
): Promise<string> {
  const data = await slackGet<{
    ok: boolean;
    permalink?: string;
    error?: string;
  }>(token, 'chat.getPermalink', {
    channel: channelId,
    message_ts: messageTs,
  });

  return data.permalink ?? `https://slack.com/app_redirect?channel=${channelId}`;
}

async function searchMentions(
  token: string,
  userId: string,
  cutoffIso: string | null,
): Promise<SearchMatch[]> {
  const queryParts = [`<@${userId}>`];
  if (cutoffIso) {
    const epoch = Math.floor(new Date(cutoffIso).getTime() / 1000);
    if (!Number.isNaN(epoch)) {
      queryParts.push(`after:${epoch}`);
    }
  }

  const data = await slackGet<{
    ok: boolean;
    messages?: { matches?: SearchMatch[] };
    error?: string;
  }>(token, 'search.messages', {
    query: queryParts.join(' '),
    sort: 'timestamp',
    sort_dir: 'desc',
    count: 50,
  });

  return data.messages?.matches ?? [];
}

function summarizeText(text: string | undefined): string {
  const normalized = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '(ללא טקסט)';
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

async function fetchWorkspaceActions(
  db: Database.Database,
  workspaceId: string,
  workspaceLabel: string,
  settings: SlackSettings,
): Promise<SlackOpenAction[]> {
  const token = getAccessToken(db, workspaceId);
  const userId = await getAuthUserId(token);
  const actions: SlackOpenAction[] = [];
  const seen = new Set<string>();

  const unreadConversations = await listUnreadConversations(token);
  for (const conversation of unreadConversations) {
    const latest = await getLatestMessage(token, conversation.id);
    if (!latest || !isAfterCutoff(latest.ts, settings.cutoffIso)) continue;
    if (
      isExcludedSender(
        {
          text: latest.text ?? '',
          username: latest.username,
          botId: latest.bot_id,
          subtype: latest.subtype,
          channelId: conversation.id,
          isDirectMessage: Boolean(conversation.is_im || conversation.is_mpim),
        },
        settings.excludedSenders,
      )
    ) {
      continue;
    }

    const key = `${conversation.id}:${latest.ts}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const link = await getPermalink(token, conversation.id, latest.ts);
    actions.push({
      workspace: workspaceLabel,
      text: summarizeText(latest.text),
      link,
      ts: latest.ts,
    });
  }

  const mentions = await searchMentions(token, userId, settings.cutoffIso);
  for (const match of mentions) {
    if (!isAfterCutoff(match.ts, settings.cutoffIso)) continue;
    const channelId = match.channel?.id;
    if (
      isExcludedSender(
        {
          text: match.text ?? '',
          username: match.username,
          botId: match.bot_id,
          subtype: match.subtype,
          channelName: match.channel?.name,
          channelId,
        },
        settings.excludedSenders,
      )
    ) {
      continue;
    }

    const key = channelId ? `${channelId}:${match.ts}` : match.ts;
    if (seen.has(key)) continue;
    seen.add(key);

    const link =
      match.permalink ??
      (channelId
        ? await getPermalink(token, channelId, match.ts)
        : 'https://slack.com/');

    actions.push({
      workspace: workspaceLabel,
      text: summarizeText(match.text),
      link,
      ts: match.ts,
    });
  }

  actions.sort((a, b) => Number(b.ts) - Number(a.ts));
  return actions;
}

function buildWorkspaceCounts(
  workspaces: Array<{ displayName: string }>,
  actions: SlackOpenAction[],
): SlackWorkspaceCount[] {
  const counts = new Map<string, number>();
  for (const action of actions) {
    counts.set(action.workspace, (counts.get(action.workspace) ?? 0) + 1);
  }

  return workspaces.map((workspace) => ({
    label: workspace.displayName,
    count: counts.get(workspace.displayName) ?? 0,
  }));
}

export async function fetchSlackOpenActions(
  db: Database.Database,
): Promise<SlackOpenActionsResult> {
  const workspaces = listWorkspaces(db);
  const settings = getSlackSettings(db);

  if (workspaces.length === 0) {
    return {
      actions: [],
      totalOpen: 0,
      byWorkspace: [],
      cutoffIso: settings.cutoffIso,
      scannedAt: new Date().toISOString(),
      connected: false,
    };
  }

  const allActions: SlackOpenAction[] = [];
  for (const workspace of workspaces) {
    try {
      const workspaceActions = await fetchWorkspaceActions(
        db,
        workspace.id,
        workspace.displayName,
        settings,
      );
      allActions.push(...workspaceActions);
    } catch (error) {
      console.error(
        `[slack] Failed to fetch open actions for ${workspace.displayName}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  allActions.sort((a, b) => Number(b.ts) - Number(a.ts));

  const byWorkspace = buildWorkspaceCounts(workspaces, allActions);

  return {
    actions: allActions,
    totalOpen: allActions.length,
    byWorkspace,
    cutoffIso: settings.cutoffIso,
    scannedAt: new Date().toISOString(),
    connected: true,
  };
}
