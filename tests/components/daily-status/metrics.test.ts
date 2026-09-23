import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  toneForMeetingsRemaining,
  toneForTasksToday,
  toneForUnreadMail,
  toneForSlackOpen,
  formatAccountBreakdown,
  mergeAccountCounts,
  getDueDay,
  countTaskDueBuckets,
  countUnreadMailByAccount,
  buildMetricsCards,
} from "../../../src/components/daily-status/metrics";

describe("toneForMeetingsRemaining", () => {
  it("returns ok for zero remaining meetings", () => {
    expect(toneForMeetingsRemaining(0)).toBe("ok");
  });

  it("returns warn for 1-3 remaining meetings", () => {
    expect(toneForMeetingsRemaining(1)).toBe("warn");
    expect(toneForMeetingsRemaining(3)).toBe("warn");
  });

  it("returns hot for 4+ remaining meetings", () => {
    expect(toneForMeetingsRemaining(4)).toBe("hot");
    expect(toneForMeetingsRemaining(8)).toBe("hot");
  });
});

describe("toneForTasksToday", () => {
  it("returns ok for 0-2 tasks due today", () => {
    expect(toneForTasksToday(0)).toBe("ok");
    expect(toneForTasksToday(2)).toBe("ok");
  });

  it("returns warn for 3-5 tasks due today", () => {
    expect(toneForTasksToday(3)).toBe("warn");
    expect(toneForTasksToday(5)).toBe("warn");
  });

  it("returns hot for 6+ tasks due today", () => {
    expect(toneForTasksToday(6)).toBe("hot");
  });
});

describe("toneForUnreadMail", () => {
  it("returns ok for 0-1 unread messages", () => {
    expect(toneForUnreadMail(0)).toBe("ok");
    expect(toneForUnreadMail(1)).toBe("ok");
  });

  it("returns warn for 2-4 unread messages", () => {
    expect(toneForUnreadMail(2)).toBe("warn");
    expect(toneForUnreadMail(4)).toBe("warn");
  });

  it("returns hot for 5+ unread messages", () => {
    expect(toneForUnreadMail(5)).toBe("hot");
  });
});

describe("toneForSlackOpen", () => {
  it("returns ok when there are no open actions", () => {
    expect(toneForSlackOpen(0)).toBe("ok");
  });

  it("returns warn for 1-2 open actions", () => {
    expect(toneForSlackOpen(1)).toBe("warn");
    expect(toneForSlackOpen(2)).toBe("warn");
  });

  it("returns hot for 3+ open actions", () => {
    expect(toneForSlackOpen(3)).toBe("hot");
  });
});

describe("formatAccountBreakdown", () => {
  it("formats account counts and optional suffix", () => {
    expect(
      formatAccountBreakdown(
        [
          { label: "Velora", count: 1 },
          { label: "Tikal", count: 2 },
        ],
        "אחרי סינון noise"
      )
    ).toBe("Velora 1 · Tikal 2 · אחרי סינון noise");
  });
});

describe("mergeAccountCounts", () => {
  it("fills missing accounts with zero counts", () => {
    expect(
      mergeAccountCounts(
        [{ label: "Velora" }, { label: "Tikal" }],
        [{ label: "Tikal", count: 2 }]
      )
    ).toEqual([
      { label: "Velora", count: 0 },
      { label: "Tikal", count: 2 },
    ]);
  });
});

describe("getDueDay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("classifies overdue, today, and tomorrow due dates", () => {
    expect(getDueDay("2026-09-22T00:00:00Z")).toBe("overdue");
    expect(getDueDay("2026-09-23T00:00:00Z")).toBe("today");
    expect(getDueDay("2026-09-24T00:00:00Z")).toBe("tomorrow");
    expect(getDueDay("2026-09-30T00:00:00Z")).toBe("other");
    expect(getDueDay(null)).toBeNull();
  });
});

describe("countTaskDueBuckets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts only incomplete tasks in due buckets", () => {
    expect(
      countTaskDueBuckets([
        { dueAt: "2026-09-23T00:00:00Z", completed: false },
        { dueAt: "2026-09-22T00:00:00Z", completed: false },
        { dueAt: "2026-09-24T00:00:00Z", completed: false },
        { dueAt: "2026-09-23T00:00:00Z", completed: true },
      ])
    ).toEqual({ today: 1, overdue: 1, tomorrow: 1 });
  });
});

describe("countUnreadMailByAccount", () => {
  it("excludes noise and groups unread mail by account label", () => {
    const labels = new Map([
      ["a1", "Velora"],
      ["a2", "Tikal"],
    ]);

    expect(
      countUnreadMailByAccount(
        [
          { accountId: "a1", classification: "urgent" },
          { accountId: "a2", classification: "action" },
          { accountId: "a2", classification: "noise" },
        ],
        labels
      )
    ).toEqual([
      { label: "Tikal", count: 1 },
      { label: "Velora", count: 1 },
    ]);
  });
});

describe("buildMetricsCards", () => {
  it("builds four KPI cards with labels, hints, and tones", () => {
    const cards = buildMetricsCards({
      remainingMeetings: 5,
      calendarSummary: {
        totalToday: 8,
        byAccount: [
          { label: "Velora", count: 2 },
          { label: "Tikal", count: 6 },
        ],
      },
      taskCounts: { today: 5, overdue: 1, tomorrow: 4 },
      unreadByAccount: [
        { label: "Velora", count: 1 },
        { label: "Tikal", count: 2 },
      ],
      slackOpen: 0,
      slackByAccount: [
        { label: "Velora", count: 0 },
        { label: "Tikal", count: 0 },
      ],
      slackHintSuffix: "ממתין לחיבור Slack",
    });

    expect(cards).toHaveLength(4);
    expect(cards[0]).toMatchObject({
      id: "meetings",
      value: "5",
      tone: "hot",
      hint: "אירועים היום 8 · Velora 2 · Tikal 6",
    });
    expect(cards[1]).toMatchObject({
      id: "tasks",
      value: "5",
      tone: "warn",
      hint: "due היום 5 · overdue 1 · מחר 4",
    });
    expect(cards[2]).toMatchObject({
      id: "mail",
      value: "3",
      tone: "warn",
    });
    expect(cards[3]).toMatchObject({
      id: "slack",
      value: "0",
      tone: "ok",
    });
  });
});
