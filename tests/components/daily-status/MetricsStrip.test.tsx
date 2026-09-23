// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { SlackOpenActionsProvider } from "../../../src/components/daily-status/SlackOpenActionsContext";
import { MetricsStrip } from "../../../src/components/daily-status/MetricsStrip";

const mockCalendar = {
  getTodayEvents: vi.fn(),
  getTodaySummary: vi.fn(),
};

const mockTickTick = {
  listTasks: vi.fn(),
};

const mockClassification = {
  getEmails: vi.fn(),
};

const mockGmail = {
  listAccounts: vi.fn(),
};

let cronStatusCallback: (() => void) | null = null;

const mockCron = {
  onStatusUpdate: vi.fn((callback: () => void) => {
    cronStatusCallback = callback;
    return vi.fn();
  }),
};

const mockSlack = {
  getOpenActions: vi.fn(),
};

function setupDefaults() {
  mockCalendar.getTodayEvents.mockResolvedValue([
    { id: "1", accountId: "a1" },
    { id: "2", accountId: "a2" },
  ]);
  mockCalendar.getTodaySummary.mockResolvedValue({
    totalToday: 4,
    byAccount: [
      { label: "Velora", count: 1 },
      { label: "Tikal", count: 3 },
    ],
  });
  mockTickTick.listTasks.mockResolvedValue([
    { dueDate: "2026-09-23T00:00:00Z", status: "0" },
  ]);
  mockClassification.getEmails.mockResolvedValue([
    { accountId: "a1", classification: "urgent" },
    { accountId: "a2", classification: "noise" },
  ]);
  mockGmail.listAccounts.mockResolvedValue([
    { id: "a1", email: "v@x.com", displayName: "Velora", color: null },
    { id: "a2", email: "t@x.com", displayName: "Tikal", color: null },
  ]);
  mockSlack.getOpenActions.mockResolvedValue({
    actions: [],
    totalOpen: 2,
    byWorkspace: [
      { label: "Velora", count: 1 },
      { label: "Tikal", count: 1 },
    ],
    cutoffIso: "2026-09-16T10:04:00.000Z",
    scannedAt: new Date().toISOString(),
    connected: true,
  });
}

function renderMetricsStrip() {
  return render(
    <SlackOpenActionsProvider>
      <MetricsStrip />
    </SlackOpenActionsProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-23T12:00:00Z"));
  cronStatusCallback = null;
  mockCron.onStatusUpdate.mockImplementation((callback: () => void) => {
    cronStatusCallback = callback;
    return vi.fn();
  });
  setupDefaults();
  Object.assign(window, {
    electronAPI: {
      calendar: mockCalendar,
      ticktick: mockTickTick,
      classification: mockClassification,
      gmail: mockGmail,
      cron: mockCron,
      slack: mockSlack,
    },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MetricsStrip", () => {
  it("renders four live KPI cards from IPC data", async () => {
    await act(async () => {
      renderMetricsStrip();
    });

    expect(screen.getByTestId("metrics-strip")).toBeInTheDocument();
    expect(screen.getByTestId("metric-meetings")).toHaveClass("ds-warn");
    expect(screen.getByTestId("metric-tasks")).toHaveClass("ds-ok");
    expect(screen.getByTestId("metric-mail")).toHaveClass("ds-ok");
    expect(screen.getByTestId("metric-slack")).toHaveClass("ds-warn");
    expect(screen.getByTestId("metric-meetings")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-tasks")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-mail")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-slack")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-meetings")).toHaveTextContent(
      /אירועים היום 4/
    );
    expect(screen.getByTestId("metric-mail")).toHaveTextContent(
      /Velora 1 · Tikal 0 · אחרי סינון noise/
    );
    expect(mockClassification.getEmails).toHaveBeenCalledWith({ limit: 200 });
  });

});
