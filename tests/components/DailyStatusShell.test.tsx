// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DailyStatusShell } from "../../src/components/daily-status";

beforeEach(() => {
  const currentWindow = globalThis.window;
  Object.assign(currentWindow, {
    electronAPI: {
      calendar: {
        getTodayEvents: vi.fn().mockResolvedValue([]),
        getTodaySummary: vi.fn().mockResolvedValue({ totalToday: 0, byAccount: [] }),
      },
      googleTasks: { listTasks: vi.fn().mockResolvedValue([]) },
      ticktick: { listTasks: vi.fn().mockResolvedValue([]) },
      classification: { getEmails: vi.fn().mockResolvedValue([]) },
      gmail: { listAccounts: vi.fn().mockResolvedValue([]) },
      cron: { onStatusUpdate: vi.fn(() => vi.fn()) },
    },
  });
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
