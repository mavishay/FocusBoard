import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Pin,
  PinOff,
  Plus,
  Search,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type NoteRecord = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source: 'manual' | 'agent';
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

type EditorMode = 'create' | 'edit';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

export function Notes() {
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [editingNote, setEditingNote] = useState<NoteRecord | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      setError(null);
      const [list, tags] = await Promise.all([
        window.electronAPI.notes.list({
          search: search.trim() || undefined,
          tag: selectedTag ?? undefined,
        }),
        window.electronAPI.notes.getAllTags(),
      ]);
      setNotes(list);
      setAllTags(tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [search, selectedTag]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const openCreateDialog = () => {
    setEditorMode('create');
    setEditingNote(null);
    setTitle('');
    setContent('');
    setTagsInput('');
    setEditorOpen(true);
  };

  const openEditDialog = (note: NoteRecord) => {
    setEditorMode('edit');
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setTagsInput(note.tags.join(', '));
    setEditorOpen(true);
  };

  const parsedTags = useMemo(() => {
    return tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }, [tagsInput]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editorMode === 'create') {
        await window.electronAPI.notes.create({
          title: trimmedTitle,
          content,
          tags: parsedTags,
          source: 'manual',
        });
      } else if (editingNote) {
        await window.electronAPI.notes.update({
          id: editingNote.id,
          title: trimmedTitle,
          content,
          tags: parsedTags,
        });
      }
      setEditorOpen(false);
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note: NoteRecord) => {
    if (!window.confirm(`Delete "${note.title}"?`)) return;
    try {
      await window.electronAPI.notes.delete({ id: note.id });
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  const handleTogglePin = async (note: NoteRecord) => {
    try {
      await window.electronAPI.notes.update({
        id: note.id,
        pinned: !note.pinned,
      });
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pin');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <StickyNote className="size-6" />
            Notes
          </h1>
          <p className="text-sm text-muted-foreground">
            Capture ideas, filter by tags, and keep pinned notes on top.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          New note
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notes..."
            className="pl-9"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedTag === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTag(null)}
            >
              All tags
            </Badge>
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-16 text-center">
          <StickyNote className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="font-medium">No notes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || selectedTag
              ? 'Try a different search or tag filter.'
              : 'Create your first note to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <Card
              key={note.id}
              className={cn(
                'cursor-pointer transition-shadow hover:shadow-md',
                note.pinned && 'ring-1 ring-primary/30'
              )}
              onClick={() => openEditDialog(note)}
            >
              <CardHeader>
                <CardTitle className="flex items-start gap-2 text-base">
                  {note.pinned && <Pin className="mt-0.5 size-4 shrink-0 text-primary" />}
                  <span className="line-clamp-2">{note.title}</span>
                </CardTitle>
                <CardAction className="flex items-center gap-1">
                  {note.source === 'agent' && (
                    <Badge variant="secondary" className="gap-1">
                      <Bot className="size-3" />
                      AI
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleTogglePin(note);
                    }}
                  >
                    {note.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete note"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(note);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </CardAction>
                <CardDescription>{formatDate(note.updatedAt)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {note.content && (
                  <p className="line-clamp-4 text-sm text-muted-foreground">
                    {truncate(note.content, 240)}
                  </p>
                )}
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {note.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editorMode === 'create' ? 'New note' : 'Edit note'}</DialogTitle>
            <DialogDescription>
              {editorMode === 'create'
                ? 'Add a title, content, and optional comma-separated tags.'
                : 'Update the note details below.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="note-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="note-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Note title"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="note-content" className="text-sm font-medium">
                Content
              </label>
              <textarea
                id="note-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write your note..."
                rows={8}
                className="min-h-40 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="note-tags" className="text-sm font-medium">
                Tags
              </label>
              <Input
                id="note-tags"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="work, ideas, follow-up"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving...' : editorMode === 'create' ? 'Create note' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
