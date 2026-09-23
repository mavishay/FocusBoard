import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  bucketTasksByDueDate,
  formatDueDate,
  formatImportance,
  getDueDateBucket,
  getPriorityFromDueDate,
  type TaskItem,
} from '../../src/lib/task-utils';

describe('getPriorityFromDueDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when dueAt is null', () => {
    expect(getPriorityFromDueDate(null)).toBeNull();
  });

  it('returns "high" for overdue tasks', () => {
    vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
    expect(getPriorityFromDueDate('2026-09-04T00:00:00Z')).toBe('high');
  });

  it('returns "high" for tasks due yesterday', () => {
    vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
    expect(getPriorityFromDueDate('2026-09-04T00:00:00Z')).toBe('high');
  });

  it('returns "medium" for tasks due today', () => {
    vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
    expect(getPriorityFromDueDate('2026-09-05T00:00:00Z')).toBe('medium');
  });

  it('returns "low" for future tasks', () => {
    vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
    expect(getPriorityFromDueDate('2026-09-06T00:00:00Z')).toBe('low');
  });

  it('returns "low" for tasks due in a week', () => {
    vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
    expect(getPriorityFromDueDate('2026-09-12T00:00:00Z')).toBe('low');
  });
});

describe('formatDueDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string when dueAt is null', () => {
    expect(formatDueDate(null)).toBe('');
  });

  it('returns "Today" for tasks due today', () => {
    vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
    expect(formatDueDate('2026-09-05T00:00:00Z')).toBe('Today');
  });

  it('returns "Yesterday" for tasks due yesterday', () => {
    vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
    expect(formatDueDate('2026-09-04T00:00:00Z')).toBe('Yesterday');
  });

  it('returns "Tomorrow" for tasks due tomorrow', () => {
    vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
    expect(formatDueDate('2026-09-06T00:00:00Z')).toBe('Tomorrow');
  });

  it('returns formatted date for other dates', () => {
    vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
    const result = formatDueDate('2026-09-12T00:00:00Z');
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });
});

describe('getDueDateBucket', () => {
  const timeZone = 'Asia/Bangkok';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T10:00:00+07:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when dueAt is null', () => {
    expect(getDueDateBucket(null, new Date(), timeZone)).toBeNull();
  });

  it('buckets overdue and today tasks into today', () => {
    expect(getDueDateBucket('2026-09-21T00:00:00+07:00', new Date(), timeZone)).toBe('today');
    expect(getDueDateBucket('2026-09-23T23:59:00+07:00', new Date(), timeZone)).toBe('today');
  });

  it('buckets tomorrow tasks into tomorrow', () => {
    expect(getDueDateBucket('2026-09-24T00:00:00+07:00', new Date(), timeZone)).toBe('tomorrow');
  });

  it('returns null for tasks beyond tomorrow', () => {
    expect(getDueDateBucket('2026-09-25T00:00:00+07:00', new Date(), timeZone)).toBeNull();
  });
});

describe('bucketTasksByDueDate', () => {
  const timeZone = 'Asia/Bangkok';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T10:00:00+07:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const makeTask = (id: string, dueAt: string | null, status: TaskItem['status'] = 'needsAction'): TaskItem => ({
    id,
    title: id,
    body: null,
    status,
    dueAt,
    source: 'Google Tasks',
    completedAt: null,
    updatedAt: '2026-09-23T00:00:00Z',
    listId: 'l1',
    listTitle: 'Personal',
  });

  it('splits active due tasks into today and tomorrow buckets', () => {
    const tasks = [
      makeTask('overdue', '2026-09-21T00:00:00+07:00'),
      makeTask('today', '2026-09-23T12:00:00+07:00'),
      makeTask('tomorrow', '2026-09-24T08:00:00+07:00'),
      makeTask('later', '2026-09-30T08:00:00+07:00'),
      makeTask('no-due', null),
      makeTask('done', '2026-09-23T12:00:00+07:00', 'completed'),
    ];

    const result = bucketTasksByDueDate(tasks, new Date(), timeZone);

    expect(result.today.map((t) => t.id)).toEqual(['overdue', 'today']);
    expect(result.tomorrow.map((t) => t.id)).toEqual(['tomorrow']);
    expect(result.overdueCount).toBe(1);
  });
});

describe('formatImportance', () => {
  it('maps priority levels to Hebrew labels', () => {
    expect(formatImportance('high')).toEqual({ label: 'גבוהה · p5', variant: 'hi' });
    expect(formatImportance('medium')).toEqual({ label: 'בינונית · p3', variant: 'med' });
    expect(formatImportance('low')).toEqual({ label: 'נמוכה · p1', variant: 'med' });
    expect(formatImportance(null)).toBeNull();
  });
});
