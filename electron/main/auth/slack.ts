import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { storeTokens, retrieveTokens } from './gmail';

export interface SlackWorkspace {
  id: string;
  teamId: string;
  teamName: string;
  displayName: string;
}

interface SlackAuthTestResponse {
  ok: boolean;
  error?: string;
  team_id?: string;
  team?: string;
  user_id?: string;
}

export function listWorkspaces(db: Database.Database): SlackWorkspace[] {
  const rows = db
    .prepare(
      `SELECT id, email AS team_id, display_name
       FROM accounts
       WHERE type = 'slack'
       ORDER BY display_name`,
    )
    .all() as Array<{ id: string; team_id: string; display_name: string | null }>;

  return rows.map((row) => ({
    id: row.id,
    teamId: row.team_id,
    teamName: row.display_name ?? row.team_id,
    displayName: row.display_name ?? row.team_id,
  }));
}

export function deleteWorkspace(db: Database.Database, workspaceId: string): void {
  db.prepare('DELETE FROM oauth_tokens WHERE account_id = ?').run(workspaceId);
  db.prepare('DELETE FROM accounts WHERE id = ? AND type = ?').run(workspaceId, 'slack');
}

export function getAccessToken(db: Database.Database, workspaceId: string): string {
  const tokens = retrieveTokens(db, workspaceId);
  if (!tokens) {
    throw new Error('No Slack token found for workspace');
  }
  return tokens.access_token;
}

export async function validateToken(token: string): Promise<SlackAuthTestResponse> {
  const response = await fetch('https://slack.com/api/auth.test', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const data = (await response.json()) as SlackAuthTestResponse;
  if (!data.ok) {
    throw new Error(data.error ?? 'Invalid Slack token');
  }
  return data;
}

export async function connectWorkspace(
  db: Database.Database,
  token: string,
  displayName: string,
): Promise<SlackWorkspace> {
  const auth = await validateToken(token);
  const id = uuidv4();
  const teamId = auth.team_id ?? 'unknown';
  const teamName = auth.team ?? teamId;

  db.prepare(
    `INSERT INTO accounts (id, type, email, display_name)
     VALUES (?, 'slack', ?, ?)`,
  ).run(id, teamId, displayName);

  storeTokens(db, id, {
    access_token: token,
    refresh_token: undefined,
    expiry_date: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
    scope: 'slack',
  });

  return {
    id,
    teamId,
    teamName,
    displayName,
  };
}
