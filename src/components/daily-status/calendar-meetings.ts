import {
  formatTimeInZone,
  getDailyStatusTimezone,
  getDateKeyInZone,
} from "./timezone";

export interface CalendarMeetingEvent {
  title: string;
  startTime: string;
  endTime: string;
  source: string;
}

export interface MeetingHighlight {
  title: string;
  startTime: string;
  endTime: string;
  source: string;
  timing: "now" | "upcoming";
}

function isSameDayInZone(
  isoString: string,
  now: Date,
  timeZone: string,
): boolean {
  return getDateKeyInZone(new Date(isoString), timeZone) === getDateKeyInZone(now, timeZone);
}

export function getTodayMeetings(
  events: CalendarMeetingEvent[],
  now: Date,
  timeZone: string = getDailyStatusTimezone(),
): CalendarMeetingEvent[] {
  return events
    .filter((event) => isSameDayInZone(event.startTime, now, timeZone))
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
}

export function countRemainingMeetingsToday(
  events: CalendarMeetingEvent[],
  now: Date,
  timeZone: string = getDailyStatusTimezone(),
): number {
  const nowMs = now.getTime();
  return getTodayMeetings(events, now, timeZone).filter(
    (event) => new Date(event.endTime).getTime() > nowMs,
  ).length;
}

export function findCurrentOrNextMeeting(
  events: CalendarMeetingEvent[],
  now: Date,
  timeZone: string = getDailyStatusTimezone(),
): MeetingHighlight | null {
  const nowMs = now.getTime();
  const todayMeetings = getTodayMeetings(events, now, timeZone).filter(
    (event) => new Date(event.endTime).getTime() > nowMs,
  );

  if (todayMeetings.length === 0) {
    return null;
  }

  const current = todayMeetings.find((event) => {
    const startMs = new Date(event.startTime).getTime();
    const endMs = new Date(event.endTime).getTime();
    return startMs <= nowMs && nowMs < endMs;
  });

  if (current) {
    return { ...current, timing: "now" };
  }

  const next = todayMeetings.find(
    (event) => new Date(event.startTime).getTime() > nowMs,
  );

  if (!next) {
    return null;
  }

  return { ...next, timing: "upcoming" };
}

export function toMeetingTimeLabel(
  startTime: string,
  timeZone: string = getDailyStatusTimezone(),
): string {
  return formatTimeInZone(startTime, timeZone);
}
