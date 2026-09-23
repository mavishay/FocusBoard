import type { IpcMain } from 'electron';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { TaskPlannerService } from '../services/task-planner-service';

const SessionIdSchema = z.object({
  sessionId: z.string().min(1),
});

const UpdateSuggestionSchema = z.object({
  sessionId: z.string().min(1),
  suggestionId: z.string().min(1),
  accepted: z.boolean(),
});

export function registerTaskPlannerHandlers(ipcMain: IpcMain, db: Database.Database): void {
  const service = new TaskPlannerService(db);

  ipcMain.handle('task-planner:listOpenTasks', async () => {
    return service.listOpenTasks();
  });

  ipcMain.handle('task-planner:createSession', async () => {
    return service.createSession();
  });

  ipcMain.handle('task-planner:getSession', async (_event, rawPayload: unknown) => {
    const parsed = SessionIdSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`);
    }
    return service.getSession(parsed.data.sessionId);
  });

  ipcMain.handle('task-planner:generateSuggestions', async (_event, rawPayload: unknown) => {
    const parsed = SessionIdSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`);
    }
    return service.generateSuggestions(parsed.data.sessionId);
  });

  ipcMain.handle('task-planner:updateSuggestion', async (_event, rawPayload: unknown) => {
    const parsed = UpdateSuggestionSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`);
    }
    const result = service.updateSuggestionAcceptance(
      parsed.data.sessionId,
      parsed.data.suggestionId,
      parsed.data.accepted,
    );
    if (!result) {
      throw new Error('Suggestion not found');
    }
    return result;
  });

  ipcMain.handle('task-planner:acceptAll', async (_event, rawPayload: unknown) => {
    const parsed = SessionIdSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`);
    }
    const session = service.acceptAllSuggestions(parsed.data.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  });

  ipcMain.handle('task-planner:applySuggestions', async (_event, rawPayload: unknown) => {
    const parsed = SessionIdSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`);
    }
    return service.applyAcceptedSuggestions(parsed.data.sessionId);
  });
}
