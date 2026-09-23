// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DailyStatusShell } from "../../src/components/daily-status";

const mockGoogleTasks = {
  listTasks: vi.fn().mockResolvedValue([]),
  status: vi.fn().mockResolvedValue({ status: "idle", lastSyncAt: null, error: null }),
  listAccounts: vi.fn().mockResolvedValue([]),
};

const mockTickTick = {
  listTasks: vi.fn().mockResolvedValue([]),
  status: vi.fn().mockResolvedValue({ status: "idle", lastSyncAt: null, error: null }),
  listAccounts: vi.fn().mockResolvedValue([]),
};

const mockGmail = {
  listAccounts: vi.fn().mockResolvedValue([]),
};

beforeEach(() => {
  const currentWindow = globalThis.window;
  Object.assign(currentWindow, {
    electronAPI: {
      calendar: {
        getTodayEvents: vi.fn().mockResolvedValue([]),
        getTodaySummary: vi.fn().mockResolvedValue({ totalToday: 0, byAccount: [] }),
      },
      googleTasks: mockGoogleTasks,
      ticktick: mockTickTick,
      classification: { getEmails: vi.fn().mockResolvedValue([]) },
      gmail: mockGmail,
      cron: { onStatusUpdate: vi.fn(() => vi.fn()) },
    },
  });
});

afterEach(() => {
  cleanup();
});

describe("DailyStatusShell", () => {
  it("renders RTL Hebrew daily status layout regions", () => {
    render(<DailyStatusShell />);

    const shell = screen.getByTestId("daily-status-shell");
    expect(shell).toHaveAttribute("dir", "rtl");
    expect(shell).toHaveAttribute("lang", "he");
    expect(screen.getByText(/FocusBoard · סטטוס יומי/)).toBeInTheDocument();
    expect(screen.getByTestId("metrics-strip")).toBeInTheDocument();
    expect(screen.getByTestId("next-up-banner")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-section")).toBeInTheDocument();
    expect(screen.getByTestId("tasks-sections")).toBeInTheDocument();
    expect(screen.getByTestId("emails-section")).toBeInTheDocument();
    expect(screen.getByTestId("slack-section")).toBeInTheDocument();
    expect(screen.getByText("אין פעולות פתוחות")).toBeInTheDocument();
  });
});
