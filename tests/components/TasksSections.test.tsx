// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { TasksSections } from "../../src/components/daily-status/TasksSections";

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
  mockTickTick.status.mockResolvedValue({ status: "idle", lastSyncAt: null, error: null, accountCount: 0 });
  mockTickTick.listAccounts.mockResolvedValue([]);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaults();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-23T10:00:00+07:00"));

  Object.assign(window, {
    electronAPI: {
      ticktick: mockTickTick,
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
    mockTickTick.listAccounts.mockResolvedValue([
      { id: "tt-1", email: "user@ticktick.com", displayName: "Test" },
    ]);
    mockTickTick.listTasks.mockResolvedValue([
      {
        id: "t1",
        title: "משימה היום",
        content: null,
        status: "0",
        dueDate: "2026-09-23T00:00:00+07:00",
        completedAt: null,
        updatedAt: "2026-09-23T00:00:00Z",
        projectId: "l1",
        projectTitle: "Personal",
        accountId: "tt-1",
      },
      {
        id: "t2",
        title: "משימה מחר",
        content: null,
        status: "0",
        dueDate: "2026-09-24T00:00:00+07:00",
        completedAt: null,
        updatedAt: "2026-09-23T00:00:00Z",
        projectId: "l2",
        projectTitle: "Tikal",
        accountId: "tt-1",
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
    mockTickTick.listAccounts.mockResolvedValue([
      { id: "tt-1", email: "user@ticktick.com", displayName: "Test" },
    ]);
    mockTickTick.listTasks.mockResolvedValue([
      {
        id: "t1",
        title: "דחוף",
        content: null,
        status: "0",
        dueDate: "2026-09-21T00:00:00+07:00",
        completedAt: null,
        updatedAt: "2026-09-23T00:00:00Z",
        projectId: "l1",
        projectTitle: "Personal",
        accountId: "tt-1",
      },
    ]);

    await renderTasksSections();

    expect(screen.getByText("גבוהה · p5")).toBeInTheDocument();
    expect(screen.getByText("+ הוסף משימה")).toBeInTheDocument();
    expect(screen.getByText("סנכרון")).toBeInTheDocument();
    expect(screen.getByText(/overdue: 1/)).toBeInTheDocument();
  });
});
