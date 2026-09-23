import { shouldDisplayCalendarEvent } from "@/lib/noise-filters";
import { formatTimeInZone, getDailyStatusTimezone } from "./timezone";

export interface CalendarApiEvent {
  id: string;
  accountId: string;
  title: string;
  startTime: string;
  endTime: string;
  calendarName: string | null;
  accountEmail: string;
}

export interface CalendarDisplayRow {
  id: string;
  when: string;
  title: string;
  source: string;
  status: string;
  statusVariant: "done" | "soon" | "later" | "skip";
  sourceVariant: "later" | "soon";
}

interface GmailAccount {
  id: string;
  displayName: string;
}

function resolveAccountSource(
  event: CalendarApiEvent,
  accountsById: Map<string, GmailAccount>,
): string {
  const account = accountsById.get(event.accountId);
  if (account?.displayName) {
    return account.displayName;
  }
  if (event.calendarName) {
    return event.calendarName;
  }
  const [localPart] = event.accountEmail.split("@");
  return localPart || event.accountEmail;
}

function formatWhenLabel(
  startTime: string,
  endTime: string,
  timeZone: string,
): string {
  const start = formatTimeInZone(startTime, timeZone);
  const end = formatTimeInZone(endTime, timeZone);
  return `היום · ${start}–${end}`;
}

function statusForEvent(
  startTime: string,
  endTime: string,
  now: Date,
): { status: string; statusVariant: CalendarDisplayRow["statusVariant"] } {
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const nowMs = now.getTime();

  if (nowMs >= endMs) {
    return { status: "הסתיים", statusVariant: "done" };
  }
  if (nowMs >= startMs) {
    return { status: "עכשיו", statusVariant: "soon" };
  }
  return { status: "היום", statusVariant: "soon" };
}

export function buildCalendarDisplayRows(
  events: CalendarApiEvent[],
  accountsById: Map<string, GmailAccount>,
  now: Date = new Date(),
  timeZone: string = getDailyStatusTimezone(),
): CalendarDisplayRow[] {
  return events
    .filter((event) => shouldDisplayCalendarEvent({ title: event.title }))
    .map((event) => {
      const { status, statusVariant } = statusForEvent(
        event.startTime,
        event.endTime,
        now,
      );
      return {
        id: event.id,
        when: formatWhenLabel(event.startTime, event.endTime, timeZone),
        title: event.title,
        source: resolveAccountSource(event, accountsById),
        status,
        statusVariant,
        sourceVariant: "later",
      };
    });
}

export function buildCalendarFootnote(
  rows: CalendarDisplayRow[],
): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.source, (counts.get(row.source) ?? 0) + 1);
  }

  const breakdown = Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => `${label} ${count}`)
    .join(" · ");

  return `היום: ${rows.length} אירועים${breakdown ? ` (${breakdown})` : ""} · אירועים confirmed/לא declined בלבד`;
}
