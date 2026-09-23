export type TaskPriority = 'high' | 'medium' | 'low';

export type ImportanceVariant = 'hi' | 'med';

export interface TaskItem {
  id: string;
  title: string;
  body: string | null;
  status: 'needsAction' | 'completed' | '0' | '1';
  dueAt: string | null;
  source: string;
  completedAt: string | null;
  updatedAt: string;
  listId: string;
  listTitle: string;
  accountId?: string;
  projectId?: string;
  projectTitle?: string;
}

export interface ImportanceDisplay {
  label: string;
  variant: ImportanceVariant;
}

export type DueDateBucket = 'today' | 'tomorrow';

export function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getPriorityFromDueDate(
  dueAt: string | null,
  now: Date = new Date(),
  timeZone: string = getUserTimeZone(),
): TaskPriority | null {
  if (!dueAt) return null;

  const todayKey = getDateKeyInTimeZone(now, timeZone);
  const dueKey = getDateKeyInTimeZone(new Date(dueAt), timeZone);

  if (dueKey < todayKey) return 'high';
  if (dueKey === todayKey) return 'medium';
  return 'low';
}

export function formatDueDate(
  dueAt: string | null,
  now: Date = new Date(),
  timeZone: string = getUserTimeZone(),
): string {
  if (!dueAt) return '';

  const todayKey = getDateKeyInTimeZone(now, timeZone);
  const dueKey = getDateKeyInTimeZone(new Date(dueAt), timeZone);

  if (dueKey === todayKey) return 'Today';
  if (dueKey < todayKey) return 'Yesterday';
  if (dueKey > todayKey) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueKey === getDateKeyInTimeZone(tomorrow, timeZone)) return 'Tomorrow';
  }

  return new Date(dueAt).toLocaleDateString();
}

export function formatImportance(priority: TaskPriority | null): ImportanceDisplay | null {
  if (!priority) return null;

  switch (priority) {
    case 'high':
      return { label: 'גבוהה · p5', variant: 'hi' };
    case 'medium':
      return { label: 'בינונית · p3', variant: 'med' };
    case 'low':
      return { label: 'נמוכה · p1', variant: 'med' };
  }
}

export function isTaskActive(task: TaskItem): boolean {
  return task.status === 'needsAction' || task.status === '0';
}

export function getDueDateBucket(
  dueAt: string | null,
  now: Date = new Date(),
  timeZone: string = getUserTimeZone(),
): DueDateBucket | null {
  if (!dueAt) return null;

  const todayKey = getDateKeyInTimeZone(now, timeZone);
  const dueKey = getDateKeyInTimeZone(new Date(dueAt), timeZone);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getDateKeyInTimeZone(tomorrow, timeZone);

  if (dueKey <= todayKey) return 'today';
  if (dueKey === tomorrowKey) return 'tomorrow';
  return null;
}

export function bucketTasksByDueDate(
  tasks: TaskItem[],
  now: Date = new Date(),
  timeZone: string = getUserTimeZone(),
): { today: TaskItem[]; tomorrow: TaskItem[]; overdueCount: number } {
  const today: TaskItem[] = [];
  const tomorrow: TaskItem[] = [];
  let overdueCount = 0;

  const todayKey = getDateKeyInTimeZone(now, timeZone);

  for (const task of tasks) {
    if (!isTaskActive(task) || !task.dueAt) continue;

    const bucket = getDueDateBucket(task.dueAt, now, timeZone);
    if (bucket === 'today') {
      today.push(task);
      const dueKey = getDateKeyInTimeZone(new Date(task.dueAt), timeZone);
      if (dueKey < todayKey) overdueCount += 1;
    } else if (bucket === 'tomorrow') {
      tomorrow.push(task);
    }
  }

  const byPriority = (a: TaskItem, b: TaskItem) => {
    const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
    const aPriority = getPriorityFromDueDate(a.dueAt, now, timeZone) ?? 'low';
    const bPriority = getPriorityFromDueDate(b.dueAt, now, timeZone) ?? 'low';
    return priorityOrder[aPriority] - priorityOrder[bPriority];
  };

  today.sort(byPriority);
  tomorrow.sort(byPriority);

  return { today, tomorrow, overdueCount };
}

export function formatTodayFootnote(overdueCount: number, overdueTitles: string[]): string {
  if (overdueCount === 0) {
    return 'due בפועל בלבד';
  }

  const examples = overdueTitles.slice(0, 2).join(' · ');
  return `due בפועל בלבד; overdue: ${overdueCount}${examples ? ` (${examples})` : ''}`;
}

export function formatTomorrowFootnote(count: number): string {
  return `due בפועל בלבד; ${count} משימות.`;
}

export function getProjectLabel(task: TaskItem): string {
  return task.listTitle || task.projectTitle || task.source;
}
