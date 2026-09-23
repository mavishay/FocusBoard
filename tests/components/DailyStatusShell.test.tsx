// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
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
  vi.useRealTimers();
  const currentWindow = globalThis.window;
  Object.assign(currentWindow, {
    electronAPI: {
      quote: {
        getToday: vi.fn().mockResolvedValue({
          date: "2026-09-23",
          content: "Stay focused.",
          author: "Daily Author",
          source: "cache",
          tags: [],
          fetchedAt: "2026-09-23T08:00:00.000Z",
        }),
        refresh: vi.fn().mockResolvedValue({
          date: "2026-09-23",
          content: "Stay focused.",
          author: "Daily Author",
          source: "cache",
          tags: [],
          fetchedAt: "2026-09-23T08:00:00.000Z",
        }),
      },
      calendar: {
        getTodayEvents: vi.fn().mockResolvedValue([]),
        getTodaySummary: vi.fn().mockResolvedValue({ totalToday: 0, byAccount: [] }),
        getFilteredEvents: vi.fn().mockResolvedValue([]),
      },
      googleTasks: mockGoogleTasks,
      ticktick: mockTickTick,
      classification: { getEmails: vi.fn().mockResolvedValue([]) },
      gmail: mockGmail,
      cron: { onStatusUpdate: vi.fn(() => vi.fn()) },
      slack: {
        getOpenActions: vi.fn().mockResolvedValue({
          actions: [],
          totalOpen: 0,
          byWorkspace: [],
          cutoffIso: null,
          scannedAt: new Date().toISOString(),
          connected: false,
        }),
      },
    },
  });
});

afterEach(() => {
  cleanup();
});

describe("DailyStatusShell", () => {
  it("renders RTL Hebrew daily status layout regions", async () => {
    render(<DailyStatusShell />);

    const shell = screen.getByTestId("daily-status-shell");
    expect(shell).toHaveAttribute("dir", "rtl");
    expect(shell).toHaveAttribute("lang", "he");
    expect(screen.getByText(/FocusBoard · סטטוס יומי/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("daily-quote")).toBeInTheDocument();
    });
    expect(screen.getByTestId("metrics-strip")).toBeInTheDocument();
    expect(screen.getByTestId("next-up-banner")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-section")).toBeInTheDocument();
    expect(screen.getByTestId("tasks-sections")).toBeInTheDocument();
    expect(screen.getByTestId("emails-section")).toBeInTheDocument();
    expect(screen.getByTestId("slack-section")).toBeInTheDocument();
    expect(
      await screen.findByText("אין פעולות פתוחות"),
    ).toBeInTheDocument();
  });
});
