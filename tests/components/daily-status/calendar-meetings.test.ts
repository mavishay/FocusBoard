import { describe, expect, it } from "vitest";
import {
  countRemainingMeetingsToday,
  findCurrentOrNextMeeting,
  type CalendarMeetingEvent,
} from "../../../src/components/daily-status/calendar-meetings";
import { DEFAULT_DAILY_STATUS_TIMEZONE } from "../../../src/components/daily-status/timezone";

const timeZone = DEFAULT_DAILY_STATUS_TIMEZONE;

const events: CalendarMeetingEvent[] = [
  {
    title: "Morning sync",
    startTime: "2026-09-23T01:00:00.000Z",
    endTime: "2026-09-23T01:45:00.000Z",
    source: "Velora",
  },
  {
    title: "סדנת משוב ל- GLים",
    startTime: "2026-09-23T07:00:00.000Z",
    endTime: "2026-09-23T10:00:00.000Z",
    source: "Tikal",
  },
  {
    title: "VGM Sync",
    startTime: "2026-09-23T14:30:00.000Z",
    endTime: "2026-09-23T15:00:00.000Z",
    source: "Velora",
  },
];

describe("calendar-meetings", () => {
  it("returns the in-progress meeting as current", () => {
    const now = new Date("2026-09-23T08:15:00.000Z");

    expect(findCurrentOrNextMeeting(events, now, timeZone)).toEqual({
      title: "סדנת משוב ל- GLים",
      startTime: "2026-09-23T07:00:00.000Z",
      endTime: "2026-09-23T10:00:00.000Z",
      source: "Tikal",
      timing: "now",
    });
  });

  it("returns the next upcoming meeting when none are in progress", () => {
    const now = new Date("2026-09-23T11:00:00.000Z");

    expect(findCurrentOrNextMeeting(events, now, timeZone)).toEqual({
      title: "VGM Sync",
      startTime: "2026-09-23T14:30:00.000Z",
      endTime: "2026-09-23T15:00:00.000Z",
      source: "Velora",
      timing: "upcoming",
    });
  });

  it("counts only meetings that have not ended yet today", () => {
    const now = new Date("2026-09-23T08:15:00.000Z");

    expect(countRemainingMeetingsToday(events, now, timeZone)).toBe(2);
  });

  it("returns null when all meetings have ended", () => {
    const now = new Date("2026-09-23T16:00:00.000Z");

    expect(findCurrentOrNextMeeting(events, now, timeZone)).toBeNull();
    expect(countRemainingMeetingsToday(events, now, timeZone)).toBe(0);
  });
});
