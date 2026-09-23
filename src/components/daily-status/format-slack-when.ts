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

export function formatSlackCutoffHint(cutoffIso: string | null): string {
  if (!cutoffIso) {
    return "נסרקו mentions ו־DMs";
  }

  const cutoff = new Date(cutoffIso);
  if (Number.isNaN(cutoff.getTime())) {
    return "נסרקו mentions ו־DMs";
  }

  const formatted = cutoff.toLocaleString("he-IL", {
    timeZone: getDailyStatusTimezone(),
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `נסרקו mentions ו־DMs אחרי cutoff ${formatted}`;
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

  const cutoffHint = formatSlackCutoffHint(cutoffIso);
  const exclusions =
    "Shavit PR-bot, Jay, Adam blockers (deferred), Linear bots מוחרגים";

  return counts.length > 0
    ? `${counts} · ${cutoffHint}. ${exclusions}.`
    : `${cutoffHint}. ${exclusions}.`;
}
