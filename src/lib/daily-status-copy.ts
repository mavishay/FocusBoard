/**
 * Copy locked to live FocusBoard HTML snapshot (2026-09-23 15:16 Asia/Bangkok).
 * Source: `/Users/mavishay/FocusBoard/index.html`
 */

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
