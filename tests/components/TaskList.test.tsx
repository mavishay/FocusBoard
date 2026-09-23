// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskList } from '../../src/components/TaskList';

const mockTickTick = {
  listTasks: vi.fn(),
  status: vi.fn(),
  listAccounts: vi.fn(),
  listProjects: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  sync: vi.fn(),
};

function setupDefaults() {
  mockTickTick.listTasks.mockResolvedValue([]);
  mockTickTick.status.mockResolvedValue({ status: 'idle', lastSyncAt: null, error: null, accountCount: 0 });
  mockTickTick.listAccounts.mockResolvedValue([]);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaults();
  Object.assign(window, {
    electronAPI: {
      ticktick: mockTickTick,
    },
    confirm: vi.fn().mockReturnValue(true),
    navigator: {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
      },
    },
  });
});

afterEach(() => {
  cleanup();
});

async function renderTaskList() {
  await act(async () => {
    render(<TaskList />);
  });
}

describe('TaskList', () => {
  it('shows empty state when no tasks and no accounts', async () => {
    await renderTaskList();
    expect(screen.queryByText('No task accounts connected')).toBeTruthy();
  });

  it('shows Connect Task Account button when no accounts', async () => {
    await renderTaskList();
    expect(screen.queryByText('Connect Task Account')).toBeTruthy();
  });

  it('renders TickTick tasks', async () => {
    mockTickTick.listAccounts.mockResolvedValue([{ id: 'tt-1', email: 'test@ticktick.com', displayName: 'TT' }]);
    mockTickTick.listTasks.mockResolvedValue([
      {
        id: 't2',
        title: 'TickTick Task',
        content: null,
        status: '0',
        dueDate: null,
        completedAt: null,
        updatedAt: '2026-01-02T00:00:00Z',
        projectId: 'p1',
        projectTitle: 'My Project',
        source: 'TickTick',
        accountId: 'tt-1',
      },
    ]);

    await renderTaskList();
    expect(screen.queryByText('TickTick Task')).toBeTruthy();
  });

  it('shows source badges', async () => {
    mockTickTick.listAccounts.mockResolvedValue([{ id: 'tt-1', email: 't@ticktick.com', displayName: 'T' }]);
    mockTickTick.listTasks.mockResolvedValue([
      {
        id: 't1',
        title: 'Task',
        content: null,
        status: '0',
        dueDate: null,
        completedAt: null,
        updatedAt: '2026-01-01T00:00:00Z',
        projectId: 'l1',
        projectTitle: 'L',
        source: 'TickTick',
        accountId: 'tt-1',
      },
    ]);

    await renderTaskList();
    expect(screen.queryByText('TickTick')).toBeTruthy();
  });

  it('shows add task button', async () => {
    mockTickTick.listAccounts.mockResolvedValue([{ id: 'tt-1', email: 't@ticktick.com', displayName: 'T' }]);
    await renderTaskList();
    expect(screen.queryByText('+ Add Task')).toBeTruthy();
  });

  it('opens add task form when clicking add button', async () => {
    mockTickTick.listAccounts.mockResolvedValue([{ id: 'tt-1', email: 't@ticktick.com', displayName: 'T' }]);
    const user = userEvent.setup();
    await renderTaskList();
    await user.click(screen.getByText('+ Add Task'));
    expect(screen.getByPlaceholderText('Task title')).toBeTruthy();
  });

  it('shows error state and retry button on load failure', async () => {
    mockTickTick.listTasks.mockRejectedValue(new Error('Network error'));
    await renderTaskList();
    expect(screen.queryByText('Network error')).toBeTruthy();
    expect(screen.queryByText('Retry')).toBeTruthy();
  });

  it('shows no tasks message when list is empty', async () => {
    mockTickTick.listAccounts.mockResolvedValue([{ id: 'tt-1', email: 't@ticktick.com', displayName: 'T' }]);
    await renderTaskList();
    expect(screen.queryByText('No tasks found')).toBeTruthy();
  });

  it('shows Sync button', async () => {
    mockTickTick.listAccounts.mockResolvedValue([{ id: 'tt-1', email: 't@ticktick.com', displayName: 'T' }]);
    await renderTaskList();
    expect(screen.queryByText('Sync')).toBeTruthy();
  });
});
