import type { IpcMain } from 'electron';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import {
  connectWorkspace,
  deleteWorkspace,
  listWorkspaces,
  validateToken,
} from '../auth/slack';
import {
  fetchSlackOpenActions,
  getSlackSettings,
  updateSlackSettings,
} from '../slack/open-actions-service';

const ConnectSchema = z.object({
  token: z.string().min(1),
  displayName: z.string().min(1),
});

const DisconnectSchema = z.object({
  workspaceId: z.string().min(1),
});

const UpdateSettingsSchema = z.object({
  cutoffIso: z.string().nullable().optional(),
  excludedSenders: z.array(z.string()).optional(),
});

export function registerSlackHandlers(ipcMain: IpcMain, db: Database.Database): void {
  ipcMain.handle('slack:connect', async (_event, payload: unknown) => {
    const { token, displayName } = ConnectSchema.parse(payload);
    await validateToken(token);
    return connectWorkspace(db, token, displayName);
  });

  ipcMain.handle('slack:disconnect', (_event, payload: unknown) => {
    const { workspaceId } = DisconnectSchema.parse(payload);
    deleteWorkspace(db, workspaceId);
    return { success: true };
  });

  ipcMain.handle('slack:listWorkspaces', () => listWorkspaces(db));

  ipcMain.handle('slack:getOpenActions', async () => fetchSlackOpenActions(db));

  ipcMain.handle('slack:getSettings', () => getSlackSettings(db));

  ipcMain.handle('slack:updateSettings', (_event, payload: unknown) => {
    const updates = UpdateSettingsSchema.parse(payload);
    return updateSlackSettings(db, updates);
  });
}
