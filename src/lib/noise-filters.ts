/**
 * Shared noise-filter rules from Personal ops assistant handoff pack:
 * - `docs/migration/handoff/focusboard-handoff/skills/email-triage.md`
 * - `docs/migration/handoff/focusboard-handoff/skills/slack-triage.md`
 * - Live HTML: `docs/migration/handoff/focusboard-handoff/FocusBoard.index.html`
 */

export interface EmailNoiseCandidate {
  fromAddress?: string | null;
  toAddress?: string | null;
  subject?: string | null;
  snippet?: string | null;
  body?: string | null;
  classification?: string | null;
}

export interface SlackNoiseCandidate {
  text: string;
  username?: string | null;
  channelName?: string | null;
  /** Slack channel ID — project-vgm-engineering exception per slack-triage.md */
  channelId?: string | null;
  botId?: string | null;
  subtype?: string | null;
  isDirectMessage?: boolean;
}

export interface SlackNoiseOptions {
  excludedSenders?: string[];
  designatedEngChannelIds?: string[];
  designatedEngChannelNames?: string[];
}

export interface CalendarDisplayCandidate {
  title?: string | null;
  attendeeResponseStatus?: string | null;
}

/** project-vgm-engineering — PR review asks kept (slack-triage.md). */
export const DESIGNATED_ENG_CHANNEL_ID = "C0BASNN6YU9";

/** Default Slack open-actions cutoff after 2026-09-16 ~17:04 Bangkok clear-all. */
export const DEFAULT_SLACK_CUTOFF_ISO = "2026-09-16T10:04:00.000Z";

/** Standing email noise senders/domains (email-triage.md § Noise). */
export const EMAIL_NOISE_STANDING_SENDERS = [
  "notifications@github.com",
  "gemini-notes@google.com",
  "alerts@email.neon.tech",
  "@flagsmith.com",
  "@jetserver.co.il",
  "jetclients",
  "cursor[bot]",
  "vercel[bot]",
] as const;

const EMAIL_NOISE_DOMAIN_PATTERNS: RegExp[] = [
  /@flagsmith\.com/i,
  /@jetserver\.co\.il/i,
  /jetclients/i,
  /alerts@email\.neon\.tech/i,
  /notifications@github\.com/i,
  /noreply@github\.com/i,
  /gemini-notes@google\.com/i,
];

const EMAIL_NOISE_SENDER_PATTERNS: RegExp[] = [
  /github/i,
  /gemini/i,
  /flagsmith/i,
  /jetserver/i,
  /neon/i,
  /cursor\[bot\]/i,
  /vercel\[bot\]/i,
  /linear.*digest/i,
  /digest.*linear/i,
];

const EMAIL_NOISE_BODY_PATTERNS: RegExp[] = [
  /spending threshold/i,
  /monthly limit/i,
  /usage.*overage/i,
  /overage alert/i,
];

const EMAIL_PROMOTION_PATTERNS: RegExp[] = [
  /\bunsubscribe\b/i,
  /\bpromotion(s)?\b/i,
  /\badvertisement\b/i,
  /\bcold\s+(email|outreach|call)\b/i,
  /\bblast\b/i,
  /\bnewsletter\b/i,
  /\blimited[- ]time\s+offer\b/i,
  /\bact\s+now\b/i,
  /\b\d+%\s+off\b/i,
  /\bspecial\s+offer\b/i,
  /\bmailing\s+list\b/i,
];

const EMAIL_RSVP_ACCEPT_PATTERNS: RegExp[] = [
  /^\s*accepted\s*:/i,
  /\baccepted\b.*\binvitation\b/i,
  /\baccepted\s+this\s+invitation\b/i,
  /\brsvp\b.*\byes\b/i,
  /\bconfirmed\b.*\bmeeting\b/i,
  /\bzoom\b.*\bconfirmation\b/i,
  /אישור\s+השתתפות/,
];

/** IB login alerts — urgent, never noise (live HTML footnote lists as filtered display-only). */
const EMAIL_URGENT_PATTERNS: RegExp[] = [
  /\bib\s+login\b/i,
  /\binteractive\s+brokers\b.*\blogin\b/i,
  /\blogin\s+alert\b/i,
  /\bsecurity\s+alert\b.*\bib\b/i,
];

/** Organizer cancel/decline/reschedule — keep unread (email-triage.md). */
const ORGANIZED_MEETING_CHANGE_PATTERNS: RegExp[] = [
  /\bcancel(?:led|lation)\b/i,
  /\bdeclin(?:ed|e)\b/i,
  /\breschedul(?:ed|e)\b/i,
];

const SLACK_PR_BOT_PATTERNS: RegExp[] = [
  /\bpass\b/i,
  /\bapproved\b/i,
  /\bmerge[- ]?ready\b/i,
  /\breview\s+requested\b/i,
  /\breview\s+ask\b/i,
  /\bpr\b.*\bready\b/i,
];

const DEFAULT_EXCLUDED_SLACK_SENDERS = [
  "shavit",
  "linear",
  "pr-bot",
  "cursor[bot]",
];

const DEFAULT_DESIGNATED_ENG_CHANNEL_IDS = [DESIGNATED_ENG_CHANNEL_ID];

const DEFAULT_DESIGNATED_ENG_CHANNEL_NAMES = [
  "project-vgm-engineering",
  "engineering",
  "eng",
  "dev",
  "platform",
];

function haystack(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function isOrganizedMeetingChangeEmail(
  email: EmailNoiseCandidate,
): boolean {
  const text = haystack([email.subject, email.snippet, email.body]);
  return ORGANIZED_MEETING_CHANGE_PATTERNS.some((pattern) => pattern.test(text));
}

export function isMeetingRsvpAcceptance(email: EmailNoiseCandidate): boolean {
  const text = haystack([email.subject, email.snippet, email.body]);
  return EMAIL_RSVP_ACCEPT_PATTERNS.some((pattern) => pattern.test(text));
}

export function isPromotionOrBlastEmail(email: EmailNoiseCandidate): boolean {
  const text = haystack([
    email.fromAddress,
    email.subject,
    email.snippet,
    email.body,
  ]);
  return EMAIL_PROMOTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * IB login and similar security alerts — never filtered as noise for triage.
 */
export function isEmailUrgentHeuristic(email: EmailNoiseCandidate): boolean {
  const text = haystack([
    email.fromAddress,
    email.subject,
    email.snippet,
    email.body,
  ]);
  return EMAIL_URGENT_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Returns true when an unread email should be treated as noise
 * (auto-read / excluded from daily-status counts and lists).
 */
export function isEmailNoise(email: EmailNoiseCandidate): boolean {
  if (isEmailUrgentHeuristic(email)) {
    return false;
  }

  if (email.classification === "noise") {
    return true;
  }

  if (isOrganizedMeetingChangeEmail(email)) {
    return false;
  }

  const from = email.fromAddress ?? "";
  const combined = haystack([
    from,
    email.subject,
    email.snippet,
    email.body,
  ]);

  if (EMAIL_NOISE_DOMAIN_PATTERNS.some((pattern) => pattern.test(from))) {
    return true;
  }

  if (EMAIL_NOISE_SENDER_PATTERNS.some((pattern) => pattern.test(combined))) {
    return true;
  }

  if (EMAIL_NOISE_BODY_PATTERNS.some((pattern) => pattern.test(combined))) {
    return true;
  }

  if (isPromotionOrBlastEmail(email)) {
    return true;
  }

  if (isMeetingRsvpAcceptance(email)) {
    return true;
  }

  return false;
}

export function isDeclinedCalendarEvent(event: CalendarDisplayCandidate): boolean {
  if (event.attendeeResponseStatus?.toLowerCase() === "declined") {
    return true;
  }
  const title = event.title ?? "";
  return /\bdeclined\b/i.test(title);
}

export function shouldDisplayCalendarEvent(event: CalendarDisplayCandidate): boolean {
  return !isDeclinedCalendarEvent(event);
}

function isDesignatedEngChannel(
  candidate: SlackNoiseCandidate,
  options: SlackNoiseOptions,
): boolean {
  const channelIds =
    options.designatedEngChannelIds ?? DEFAULT_DESIGNATED_ENG_CHANNEL_IDS;
  if (candidate.channelId && channelIds.includes(candidate.channelId)) {
    return true;
  }

  const channelNames =
    options.designatedEngChannelNames ?? DEFAULT_DESIGNATED_ENG_CHANNEL_NAMES;
  const channel = (candidate.channelName ?? "").toLowerCase();
  return channelNames.some((name) => channel.includes(name.toLowerCase()));
}

/** PR review asks unrelated to user's work — noise unless designated eng channel. */
export function isUnrelatedPrReviewAsk(
  candidate: SlackNoiseCandidate,
  options: SlackNoiseOptions = {},
): boolean {
  if (isDesignatedEngChannel(candidate, options)) {
    return false;
  }

  const text = candidate.text.toLowerCase();
  const isPrAsk =
    text.includes("review") &&
    (text.includes("pr") ||
      text.includes("pull request") ||
      text.includes("merge"));
  return isPrAsk;
}

/** Shavit PR-bot PASS/approved/merge-ready/review asks (handoff meta + HTML footnote). */
export function isShavitPrBotNoise(candidate: SlackNoiseCandidate): boolean {
  const sender = haystack([candidate.username, candidate.text]);
  if (!sender.includes("shavit")) {
    return false;
  }

  const text = candidate.text.toLowerCase();
  const looksLikePrBot =
    text.includes("pr") ||
    text.includes("#") ||
    SLACK_PR_BOT_PATTERNS.some((pattern) => pattern.test(text));

  return looksLikePrBot;
}

/** Linear bot DMs — noise in practice (HTML footnote). */
export function isLinearBotDm(candidate: SlackNoiseCandidate): boolean {
  if (!candidate.isDirectMessage) {
    return false;
  }
  const sender = haystack([candidate.username, candidate.text]);
  return sender.includes("linear");
}

/**
 * Returns true when a Slack open-action candidate should be excluded.
 * Human messages from Shavit (non-PR) still surface.
 */
export function isSlackNoise(
  candidate: SlackNoiseCandidate,
  options: SlackNoiseOptions = {},
): boolean {
  if (candidate.botId) {
    return true;
  }
  if (candidate.subtype === "bot_message") {
    return true;
  }

  if (isLinearBotDm(candidate)) {
    return true;
  }

  const excludedSenders =
    options.excludedSenders ?? DEFAULT_EXCLUDED_SLACK_SENDERS;
  const senderHaystack = haystack([candidate.username, candidate.text]);
  if (
    excludedSenders.some((needle) =>
      senderHaystack.includes(needle.toLowerCase()),
    )
  ) {
    if (senderHaystack.includes("shavit") && !isShavitPrBotNoise(candidate)) {
      return false;
    }
    return true;
  }

  if (isShavitPrBotNoise(candidate)) {
    return true;
  }

  if (isUnrelatedPrReviewAsk(candidate, options)) {
    return true;
  }

  return false;
}

export function filterActionableEmails<T extends EmailNoiseCandidate>(
  emails: T[],
): T[] {
  return emails.filter((email) => !isEmailNoise(email));
}
