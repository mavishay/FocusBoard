import type { IpcMain } from 'electron';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { NotesService } from '../services/notes-service';

const ListNotesSchema = z.object({
  search: z.string().optional(),
  tag: z.string().optional(),
});

const CreateNoteSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().max(100_000).optional(),
  tags: z.array(z.string().min(1).max(100)).max(50).optional(),
  source: z.enum(['manual', 'agent']).optional(),
  pinned: z.boolean().optional(),
});

const UpdateNoteSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(100_000).optional(),
  tags: z.array(z.string().min(1).max(100)).max(50).optional(),
  pinned: z.boolean().optional(),
});

const IdSchema = z.object({
  id: z.string().min(1),
});

export function registerNotesHandlers(
  ipcMain: IpcMain,
  db: Database.Database
): void {
  const notesService = new NotesService(db);

  ipcMain.handle('notes:list', async (_event, payload?: unknown) => {
    const parsed = ListNotesSchema.safeParse(payload ?? {});
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`);
    }
    return notesService.list(parsed.data);
  });

  ipcMain.handle('notes:create', async (_event, payload: unknown) => {
    const parsed = CreateNoteSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`);
    }
    return notesService.create(parsed.data);
  });

  ipcMain.handle('notes:update', async (_event, payload: unknown) => {
    const parsed = UpdateNoteSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`);
    }
    const { id, ...updates } = parsed.data;
    return notesService.update(id, updates);
  });

  ipcMain.handle('notes:delete', async (_event, payload: unknown) => {
    const parsed = IdSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`);
    }
    notesService.delete(parsed.data.id);
    return { success: true };
  });

  ipcMain.handle('notes:getAllTags', async () => {
    return notesService.getAllTags();
  });
}
