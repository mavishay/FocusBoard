/** Default daily-status timezone; override when a user setting exists. */
export const DEFAULT_DAILY_STATUS_TIMEZONE = "Asia/Bangkok";

export function getDailyStatusTimezone(): string {
  // Future: read persisted user timezone preference when available.
  return DEFAULT_DAILY_STATUS_TIMEZONE;
}

export function formatTimeInZone(
  isoString: string,
  timeZone: string = getDailyStatusTimezone(),
): string {
  return new Date(isoString).toLocaleTimeString("he-IL", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getDateKeyInZone(
  date: Date,
  timeZone: string = getDailyStatusTimezone(),
): string {
  return date.toLocaleDateString("en-CA", { timeZone });
}

export function getTodayDateKey(
  now: Date = new Date(),
  timeZone: string = getDailyStatusTimezone(),
): string {
  return getDateKeyInZone(now, timeZone);
}
