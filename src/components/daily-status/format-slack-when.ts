import { SLACK_EXCLUSIONS_FOOTNOTE } from "@/lib/daily-status-copy";
import { getDailyStatusTimezone } from "./timezone";

export function formatSlackWhen(ts: string, now: Date = new Date()): string {
  const messageDate = new Date(Number(ts) * 1000);
  const timeZone = getDailyStatusTimezone();

  const datePart = messageDate.toLocaleDateString("he-IL", {
    timeZone,
    day: "numeric",
    month: "numeric",
  });

  const timePart = messageDate.toLocaleTimeString("he-IL", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const diffMinutes = Math.max(
    1,
    Math.round((now.getTime() - messageDate.getTime()) / 60_000),
  );

  let relative: string;
  if (diffMinutes < 60) {
    relative = `לפני ~${diffMinutes} דק׳`;
  } else if (diffMinutes < 24 * 60) {
    const hours = Math.round(diffMinutes / 60);
    relative = `לפני ~${hours} שע׳`;
  } else {
    const days = Math.round(diffMinutes / (24 * 60));
    relative = `לפני ~${days} ימים`;
  }

  return `${datePart} ${timePart} · ${relative}`;
}

/** Short cutoff label matching live HTML: `16/9 17:04`. */
export function formatSlackCutoffShort(
  cutoffIso: string | null,
  timeZone: string = getDailyStatusTimezone(),
): string | null {
  if (!cutoffIso) {
    return null;
  }

  const cutoff = new Date(cutoffIso);
  if (Number.isNaN(cutoff.getTime())) {
    return null;
  }

  const datePart = cutoff
    .toLocaleDateString("he-IL", {
      timeZone,
      day: "numeric",
      month: "numeric",
    })
    .replace(/\./g, "/");
  const timePart = cutoff.toLocaleTimeString("he-IL", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${datePart} ${timePart}`;
}

/** Metrics strip hint suffix — live HTML: `אחרי cutoff 16/9 17:04`. */
export function formatSlackMetricsCutoffHint(cutoffIso: string | null): string {
  const short = formatSlackCutoffShort(cutoffIso);
  return short ? `אחרי cutoff ${short}` : "ממתין לחיבור Slack";
}

/** Slack section scan line — live HTML footnote prefix. */
export function formatSlackScanCutoffHint(cutoffIso: string | null): string {
  const short = formatSlackCutoffShort(cutoffIso);
  return short
    ? `נסרקו mentions ו־DMs אחרי cutoff ${short}`
    : "נסרקו mentions ו־DMs";
}

/** @deprecated Use formatSlackScanCutoffHint or formatSlackMetricsCutoffHint */
export function formatSlackCutoffHint(cutoffIso: string | null): string {
  return formatSlackScanCutoffHint(cutoffIso);
}

export function formatSlackWorkspaceFooter(
  byWorkspace: Array<{ label: string; count: number }>,
  cutoffIso: string | null,
  connected: boolean,
): string {
  if (!connected) {
    return "ממתין לחיבור Slack · הוסף workspace ב-Settings";
  }

  const counts = byWorkspace
    .map(({ label, count }) => `${label}: ${count}`)
    .join(" · ");

  const cutoffHint = formatSlackScanCutoffHint(cutoffIso);

  return counts.length > 0
    ? `${counts} · ${cutoffHint}. ${SLACK_EXCLUSIONS_FOOTNOTE}`
    : `${cutoffHint}. ${SLACK_EXCLUSIONS_FOOTNOTE}`;
}
