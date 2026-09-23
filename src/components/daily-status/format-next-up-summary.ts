import type { MeetingHighlight } from "./calendar-meetings";
import { toMeetingTimeLabel } from "./calendar-meetings";

export interface NextUpCounts {
  remainingMeetings: number;
  unreadCount: number;
  slackOpenCount: number;
}

function formatMeetingSegment(meeting: MeetingHighlight): string {
  const timeLabel = toMeetingTimeLabel(meeting.startTime);
  const timingSuffix = meeting.timing === "now" ? ", עכשיו" : "";
  return `${meeting.title} ${timeLabel} (${meeting.source}${timingSuffix})`;
}

export function formatNextUpSummary(
  meeting: MeetingHighlight | null,
  counts: NextUpCounts,
): string {
  const segments = [
    meeting ? formatMeetingSegment(meeting) : "אין פגישות נוספות היום",
    `נותרו היום ${counts.remainingMeetings} פגישות`,
    `unread: ${counts.unreadCount}`,
    `Slack פתוח: ${counts.slackOpenCount}`,
  ];

  return `${segments.join(" · ")}.`;
}
