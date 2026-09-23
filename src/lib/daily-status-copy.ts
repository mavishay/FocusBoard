/**
 * Copy locked to Personal ops assistant handoff pack + live HTML snapshot.
 * Pack: `docs/migration/handoff/focusboard-handoff/`
 * Live: `/Users/mavishay/FocusBoard/index.html` (2026-09-23 15:16 Asia/Bangkok)
 */

/** Legacy routine slug: `routine-notion-status-refresh.txt` */
export const FOCUSBOARD_HTML_REFRESH_ROUTINE_NAME =
  "FocusBoard HTML refresh routine";

/** Cron every 5 min, hours 9-17, Sun-Thu — Asia/Bangkok. */
export const FOCUSBOARD_REFRESH_CRON = "*/5 9-17 * * 0-4";

export const EMAIL_NOISE_FOOTNOTE_SUFFIX =
  "GitHub/Gemini/Flagsmith/Neon/Jetserver/cursor[bot]/vercel[bot]/Linear digest/RSVP/Zoom confirmation/IB login סוננו; GitLab !13 skipped; Noa/Octopus הומרו למשימות ולא מוצגים.";

export const SLACK_EXCLUSIONS_FOOTNOTE =
  "Shavit PR-bot (#153/#336/#393/#406/#347), Jay, Adam blockers (deferred), Linear bots מוחרגים.";

/** Legacy HTML `<meta refresh>` + JS reload cadence. */
export const HTML_HEADER_REFRESH_NOTE = "ריפרש דפדפן כל 60 ש׳";

/** Electron in-app data poll (replaces browser reload). */
export const ELECTRON_HEADER_REFRESH_NOTE = "ריענון נתונים כל 5 דק׳";

/** Legacy HTML footer segment — omitted in Electron (no window reload). */
export const HTML_FOOTER_BROWSER_NOTE = "הדפדפן מרענן כל דקה";

export const FOOTER_WORK_WINDOW = "Sun–Thu 09:00–17:30";

/** Electron footer segment (replaces legacy browser reload line). */
export const ELECTRON_FOOTER_DATA_NOTE = `מתעדכנים כל 5 דק׳ ע״י ${FOCUSBOARD_HTML_REFRESH_ROUTINE_NAME}`;

export function buildEmailFootnoteFromCounts(
  counts: Array<{ label: string; count: number }>,
): string {
  const breakdown = counts
    .map(({ label, count }) => `${label}: ${count}`)
    .join(" · ");
  return `${breakdown || "אין מיילים unread"}. ${EMAIL_NOISE_FOOTNOTE_SUFFIX}`;
}

export function buildSlackFootnoteFromCounts(
  counts: Array<{ label: string; count: number }>,
  scanCutoffHint: string,
): string {
  const breakdown = counts
    .map(({ label, count }) => `${label}: ${count}`)
    .join(" · ");
  const prefix = breakdown.length > 0 ? `${breakdown} · ` : "";
  return `${prefix}${scanCutoffHint}. ${SLACK_EXCLUSIONS_FOOTNOTE}`;
}
