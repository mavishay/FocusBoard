import { describe, expect, it } from "vitest";
import type { MeetingHighlight } from "../../../src/components/daily-status/calendar-meetings";
import { formatNextUpSummary } from "../../../src/components/daily-status/format-next-up-summary";

const currentMeeting: MeetingHighlight = {
  title: "סדנת משוב ל- GLים",
  startTime: "2026-09-23T07:00:00.000Z",
  endTime: "2026-09-23T10:00:00.000Z",
  source: "Tikal",
  timing: "now",
};

const upcomingMeeting: MeetingHighlight = {
  title: "VGM Sync",
  startTime: "2026-09-23T14:30:00.000Z",
  endTime: "2026-09-23T15:00:00.000Z",
  source: "Velora",
  timing: "upcoming",
};

describe("formatNextUpSummary", () => {
  it("formats current meeting with counts matching the mock pattern", () => {
    const summary = formatNextUpSummary(currentMeeting, {
      remainingMeetings: 5,
      unreadCount: 3,
      slackOpenCount: 0,
    });

    expect(summary).toBe(
      "סדנת משוב ל- GLים 14:00 (Tikal, עכשיו) · נותרו היום 5 פגישות · unread: 3 · Slack פתוח: 0.",
    );
  });

  it("formats upcoming meeting without the now suffix", () => {
    const summary = formatNextUpSummary(upcomingMeeting, {
      remainingMeetings: 2,
      unreadCount: 1,
      slackOpenCount: 4,
    });

    expect(summary).toBe(
      "VGM Sync 21:30 (Velora) · נותרו היום 2 פגישות · unread: 1 · Slack פתוח: 4.",
    );
  });

  it("shows empty state when no meeting is available", () => {
    const summary = formatNextUpSummary(null, {
      remainingMeetings: 0,
      unreadCount: 3,
      slackOpenCount: 0,
    });

    expect(summary).toBe(
      "אין פגישות נוספות היום · נותרו היום 0 פגישות · unread: 3 · Slack פתוח: 0.",
    );
  });
});
