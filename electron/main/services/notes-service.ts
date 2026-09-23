import type Database from 'better-sqlite3';

export type NoteSource = 'manual' | 'agent';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source: NoteSource;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListNotesOptions {
  search?: string;
  tag?: string;
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  tags?: string[];
  source?: NoteSource;
  pinned?: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  tags?: string[];
  pinned?: boolean;
}

interface NoteRow {
  id: string;
  title: string;
  content: string;
  tags: string;
  source: string;
  pinned: number;
  created_at: string;
  updated_at: string;
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
  } catch {
    return [];
  }
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: parseTags(row.tags),
    source: row.source as NoteSource,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }
  return normalized;
}

export class NotesService {
  constructor(private db: Database.Database) {}

  list(options: ListNotesOptions = {}): Note[] {
    const rows = this.db
      .prepare(
        `SELECT id, title, content, tags, source, pinned, created_at, updated_at
         FROM notes
         ORDER BY pinned DESC, updated_at DESC`
      )
      .all() as NoteRow[];

    let notes = rows.map(rowToNote);

    if (options.tag) {
      const tagFilter = options.tag.trim().toLowerCase();
      notes = notes.filter((note) =>
        note.tags.some((tag) => tag.toLowerCase() === tagFilter)
      );
    }

    if (options.search) {
      const query = options.search.trim().toLowerCase();
      if (query) {
        notes = notes.filter((note) => {
          const haystack = [
            note.title,
            note.content,
            note.tags.join(' '),
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(query);
        });
      }
    }

    return notes;
  }

  getById(id: string): Note | null {
    const row = this.db
      .prepare(
        `SELECT id, title, content, tags, source, pinned, created_at, updated_at
         FROM notes WHERE id = ?`
      )
      .get(id) as NoteRow | undefined;
    return row ? rowToNote(row) : null;
  }

  create(input: CreateNoteInput): Note {
    const id = crypto.randomUUID();
    const title = input.title.trim();
    if (!title) {
      throw new Error('Title is required');
    }

    const tags = normalizeTags(input.tags);
    const source = input.source ?? 'manual';
    const pinned = input.pinned ? 1 : 0;
    const content = input.content ?? '';

    this.db
      .prepare(
        `INSERT INTO notes (id, title, content, tags, source, pinned)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, title, content, JSON.stringify(tags), source, pinned);

    const created = this.getById(id);
    if (!created) {
      throw new Error('Failed to create note');
    }
    return created;
  }

  update(id: string, input: UpdateNoteInput): Note {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error('Note not found');
    }

    const title = input.title !== undefined ? input.title.trim() : existing.title;
    if (!title) {
      throw new Error('Title is required');
    }

    const content = input.content !== undefined ? input.content : existing.content;
    const tags = input.tags !== undefined ? normalizeTags(input.tags) : existing.tags;
    const pinned = input.pinned !== undefined ? (input.pinned ? 1 : 0) : (existing.pinned ? 1 : 0);

    this.db
      .prepare(
        `UPDATE notes
         SET title = ?, content = ?, tags = ?, pinned = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(title, content, JSON.stringify(tags), pinned, id);

    const updated = this.getById(id);
    if (!updated) {
      throw new Error('Failed to update note');
    }
    return updated;
  }

  delete(id: string): void {
    const result = this.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new Error('Note not found');
    }
  }

  getAllTags(): string[] {
    const rows = this.db.prepare('SELECT tags FROM notes').all() as { tags: string }[];
    const seen = new Map<string, string>();

    for (const row of rows) {
      for (const tag of parseTags(row.tags)) {
        const key = tag.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, tag);
        }
      }
    }

    return Array.from(seen.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
  }
}
