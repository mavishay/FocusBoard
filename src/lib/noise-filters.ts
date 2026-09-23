/**
 * Shared noise-filter rules ported from the FocusBoard bot refresh routine.
 * Used by daily-status UI and main-process Slack/email list paths.
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
  botId?: string | null;
  subtype?: string | null;
}

export interface SlackNoiseOptions {
  /** Lowercase sender substrings to exclude (e.g. shavit, linear, pr-bot). */
  excludedSenders?: string[];
  /** Channel names (lowercase) where PR review asks are still actionable. */
  designatedEngChannels?: string[];
}

export interface CalendarDisplayCandidate {
  title?: string | null;
  attendeeResponseStatus?: string | null;
}

/** Senders/subjects that are auto-read or never surfaced as action/urgent. */
const EMAIL_NOISE_FROM_PATTERNS: RegExp[] = [
  /github/i,
  /notifications@github/i,
  /gemini/i,
  /meeting notes/i,
  /flagsmith/i,
  /jetserver/i,
  /neon/i,
  /cursor\[bot\]/i,
  /vercel\[bot\]/i,
  /noreply@linear/i,
  /digest@linear/i,
];

const EMAIL_RSVP_ACCEPT_PATTERNS: RegExp[] = [
  /^\s*accepted\s*:/i,
  /\baccepted\b.*\binvitation\b/i,
  /\brsvp\b.*\byes\b/i,
  /\bconfirmed\b.*\bmeeting\b/i,
  /\bzoom\b.*\bconfirmation\b/i,
];

/** Meeting changes on events the user organized — keep unread + notify. */
const ORGANIZED_MEETING_CHANGE_PATTERNS: RegExp[] = [
  /\bcancel(?:led|lation)\b/i,
  /\bdeclin(?:ed|e)\b/i,
  /\breschedul(?:ed|e)\b/i,
];

const SLACK_PR_BOT_PATTERNS: RegExp[] = [
  /\bpass\b/i,
  /\bapproved\b/i,
  /\bmerge[- ]?ready\b/i,
  /\breview requested\b/i,
  /\bpr\b.*\bready\b/i,
];

const DEFAULT_EXCLUDED_SLACK_SENDERS = [
  "shavit",
  "linear",
  "pr-bot",
  "cursor[bot]",
];

const DEFAULT_DESIGNATED_ENG_CHANNELS = [
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

/**
 * Returns true when an unread email should be treated as bot noise
 * (auto-read / excluded from daily-status counts and lists).
 */
export function isEmailNoise(email: EmailNoiseCandidate): boolean {
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

  if (EMAIL_NOISE_FROM_PATTERNS.some((pattern) => pattern.test(combined))) {
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

export function isUnrelatedPrReviewAsk(
  candidate: SlackNoiseCandidate,
  options: SlackNoiseOptions = {},
): boolean {
  const designated =
    options.designatedEngChannels ?? DEFAULT_DESIGNATED_ENG_CHANNELS;
  const channel = (candidate.channelName ?? "").toLowerCase();
  const inEngChannel = designated.some((name) => channel.includes(name));
  if (inEngChannel) {
    return false;
  }

  const text = candidate.text.toLowerCase();
  const isPrAsk =
    text.includes("review") &&
    (text.includes("pr") || text.includes("pull request") || text.includes("merge"));
  return isPrAsk;
}

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
