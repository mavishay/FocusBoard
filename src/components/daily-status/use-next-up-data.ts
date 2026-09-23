import { useCallback, useEffect, useMemo, useState } from "react";
import {
  countRemainingMeetingsToday,
  findCurrentOrNextMeeting,
  type CalendarMeetingEvent,
} from "./calendar-meetings";
import { formatNextUpSummary } from "./format-next-up-summary";
import { PLACEHOLDER_METRICS, PLACEHOLDER_NEXT_UP } from "./placeholder-data";
import { getDailyStatusTimezone, getTodayDateKey } from "./timezone";

interface CalendarApiEvent {
  id: string;
  accountId: string;
  title: string;
  startTime: string;
  endTime: string;
  calendarName: string | null;
  accountEmail: string;
}

interface GmailAccount {
  id: string;
  email: string;
  displayName: string;
}

interface ClassificationEmail {
  isRead: number;
}

export interface NextUpBannerProps {
  unreadCount?: number;
  slackOpenCount?: number;
  remainingMeetings?: number;
}

interface NextUpSourceData {
  events: CalendarMeetingEvent[];
  unreadCount: number;
  slackOpenCount: number;
  remainingMeetingsOverride?: number;
}

const PLACEHOLDER_UNREAD = Number(PLACEHOLDER_METRICS[2]?.value ?? 0);
const PLACEHOLDER_SLACK = Number(PLACEHOLDER_METRICS[3]?.value ?? 0);
const PLACEHOLDER_REMAINING = Number(PLACEHOLDER_METRICS[0]?.value ?? 0);

function hasElectronAPI(): boolean {
  return typeof window !== "undefined" && "electronAPI" in window;
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

function toCalendarMeetingEvents(
  events: CalendarApiEvent[],
  accountsById: Map<string, GmailAccount>,
): CalendarMeetingEvent[] {
  return events.map((event) => ({
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    source: resolveAccountSource(event, accountsById),
  }));
}

function countUnreadEmails(emails: ClassificationEmail[]): number {
  return emails.filter((email) => email.isRead === 0).length;
}

function buildSourceData(
  events: CalendarMeetingEvent[],
  unreadCount: number,
  slackOpenCount: number,
  remainingMeetingsOverride?: number,
): NextUpSourceData {
  return {
    events,
    unreadCount,
    slackOpenCount,
    remainingMeetingsOverride,
  };
}

function placeholderSourceData(): NextUpSourceData {
  return buildSourceData(
    [],
    PLACEHOLDER_UNREAD,
    PLACEHOLDER_SLACK,
    PLACEHOLDER_REMAINING,
  );
}

const PLACEHOLDER_SUMMARY = PLACEHOLDER_NEXT_UP.replace(/^Next up:\s*/, "");

export function useNextUpData({
  unreadCount: unreadCountProp,
  slackOpenCount: slackOpenCountProp,
  remainingMeetings: remainingMeetingsProp,
}: NextUpBannerProps = {}): string {
  const [now, setNow] = useState(() => new Date());
  const [sourceData, setSourceData] = useState<NextUpSourceData>(
    placeholderSourceData,
  );
  const [useStaticPlaceholder, setUseStaticPlaceholder] = useState(
    () => !hasElectronAPI(),
  );

  const refresh = useCallback(async () => {
    if (!hasElectronAPI()) {
      setUseStaticPlaceholder(true);
      setSourceData(placeholderSourceData());
      return;
    }

    setUseStaticPlaceholder(false);

    const timeZone = getDailyStatusTimezone();
    const today = getTodayDateKey(new Date(), timeZone);

    try {
      const [events, accounts, emails] = await Promise.all([
        window.electronAPI.calendar.getFilteredEvents(today, today),
        window.electronAPI.gmail.listAccounts(),
        window.electronAPI.classification.getEmails({ limit: 500 }),
      ]);

      const accountsById = new Map(
        accounts.map((account) => [account.id, account]),
      );

      setSourceData(
        buildSourceData(
          toCalendarMeetingEvents(events, accountsById),
          unreadCountProp ?? countUnreadEmails(emails),
          slackOpenCountProp ?? 0,
          remainingMeetingsProp,
        ),
      );
    } catch {
      setSourceData(
        buildSourceData(
          [],
          unreadCountProp ?? PLACEHOLDER_UNREAD,
          slackOpenCountProp ?? PLACEHOLDER_SLACK,
          remainingMeetingsProp ?? PLACEHOLDER_REMAINING,
        ),
      );
    }
  }, [remainingMeetingsProp, slackOpenCountProp, unreadCountProp]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!hasElectronAPI()) {
      return;
    }

    const unsubscribe = window.electronAPI.cron.onStatusUpdate(() => {
      void refresh();
    });

    return unsubscribe;
  }, [refresh]);

  return useMemo(() => {
    if (useStaticPlaceholder) {
      return PLACEHOLDER_SUMMARY;
    }

    const timeZone = getDailyStatusTimezone();
    const meeting = findCurrentOrNextMeeting(sourceData.events, now, timeZone);
    const remainingMeetings =
      sourceData.remainingMeetingsOverride ??
      countRemainingMeetingsToday(sourceData.events, now, timeZone);

    return formatNextUpSummary(meeting, {
      remainingMeetings,
      unreadCount: sourceData.unreadCount,
      slackOpenCount: sourceData.slackOpenCount,
    });
  }, [now, sourceData, useStaticPlaceholder]);
}
