import {
  isSlackNoise as isSharedSlackNoise,
  type SlackNoiseCandidate,
} from '../../../src/lib/noise-filters';

export interface SlackMessageCandidate {
  text: string;
  username?: string | null;
  botId?: string | null;
  subtype?: string | null;
  channelName?: string | null;
}

const DEFAULT_EXCLUDED_SENDERS = [
  'shavit',
  'linear',
  'pr-bot',
  'cursor[bot]',
];

export function parseExcludedSenders(raw: string | null | undefined): string[] {
  if (!raw) return DEFAULT_EXCLUDED_SENDERS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_EXCLUDED_SENDERS;
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return DEFAULT_EXCLUDED_SENDERS;
  }
}

export function isExcludedSender(
  candidate: SlackMessageCandidate,
  excludedSenders: string[],
): boolean {
  const sharedCandidate: SlackNoiseCandidate = {
    text: candidate.text,
    username: candidate.username,
    botId: candidate.botId,
    subtype: candidate.subtype,
    channelName: candidate.channelName,
  };

  return isSharedSlackNoise(sharedCandidate, { excludedSenders });
}

export function isAfterCutoff(ts: string, cutoffIso: string | null): boolean {
  if (!cutoffIso) return true;
  const cutoffMs = new Date(cutoffIso).getTime();
  if (Number.isNaN(cutoffMs)) return true;
  const messageMs = Number(ts) * 1000;
  return messageMs >= cutoffMs;
}
