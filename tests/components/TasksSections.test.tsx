// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { TasksSections } from "../../src/components/daily-status/TasksSections";

const mockGoogleTasks = {
  listTasks: vi.fn(),
  status: vi.fn(),
  listAccounts: vi.fn(),
  listLists: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  sync: vi.fn(),
};

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

const mockGmail = {
  listAccounts: vi.fn(),
};

function setupDefaults() {
  mockGoogleTasks.listTasks.mockResolvedValue([]);
  mockGoogleTasks.status.mockResolvedValue({ status: "idle", lastSyncAt: null, error: null });
  mockGoogleTasks.listAccounts.mockResolvedValue([]);
  mockTickTick.listTasks.mockResolvedValue([]);
  mockTickTick.status.mockResolvedValue({ status: "idle", lastSyncAt: null, error: null });
  mockTickTick.listAccounts.mockResolvedValue([]);
  mockGmail.listAccounts.mockResolvedValue([]);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaults();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-23T10:00:00+07:00"));

  Object.assign(window, {
    electronAPI: {
      googleTasks: mockGoogleTasks,
      ticktick: mockTickTick,
      gmail: mockGmail,
    },
    confirm: vi.fn().mockReturnValue(true),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function renderTasksSections() {
  await act(async () => {
    render(<TasksSections />);
  });
}

describe("TasksSections", () => {
  it("renders separate today and tomorrow cards", async () => {
    mockGoogleTasks.listAccounts.mockResolvedValue([
      { id: "gt-1", email: "test@gmail.com", displayName: "Test" },
    ]);
    mockGoogleTasks.listTasks.mockResolvedValue([
      {
        id: "t1",
        title: "משימה היום",
        notes: null,
        status: "needsAction",
        due: "2026-09-23T00:00:00+07:00",
        completedAt: null,
        updatedAt: "2026-09-23T00:00:00Z",
        listId: "l1",
        listTitle: "Personal",
        accountId: "gt-1",
      },
      {
        id: "t2",
        title: "משימה מחר",
        notes: null,
        status: "needsAction",
        due: "2026-09-24T00:00:00+07:00",
        completedAt: null,
        updatedAt: "2026-09-23T00:00:00Z",
        listId: "l2",
        listTitle: "Tikal",
        accountId: "gt-1",
      },
    ]);

    await renderTasksSections();

    expect(screen.getByTestId("tasks-today-card")).toBeInTheDocument();
    expect(screen.getByTestId("tasks-tomorrow-card")).toBeInTheDocument();
    expect(screen.getByText("משימה היום")).toBeInTheDocument();
    expect(screen.getByText("משימה מחר")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("Tikal")).toBeInTheDocument();
  });

  it("shows importance labels and CRUD controls", async () => {
    mockGoogleTasks.listAccounts.mockResolvedValue([
      { id: "gt-1", email: "test@gmail.com", displayName: "Test" },
    ]);
    mockGoogleTasks.listTasks.mockResolvedValue([
      {
        id: "t1",
        title: "דחוף",
        notes: null,
        status: "needsAction",
        due: "2026-09-21T00:00:00+07:00",
        completedAt: null,
        updatedAt: "2026-09-23T00:00:00Z",
        listId: "l1",
        listTitle: "Personal",
        accountId: "gt-1",
      },
    ]);

    await renderTasksSections();

    expect(screen.getByText("גבוהה · p5")).toBeInTheDocument();
    expect(screen.getByText("+ הוסף משימה")).toBeInTheDocument();
    expect(screen.getByText("סנכרון")).toBeInTheDocument();
    expect(screen.getByText(/overdue: 1/)).toBeInTheDocument();
  });
});
