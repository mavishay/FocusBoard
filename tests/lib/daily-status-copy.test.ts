import { describe, it, expect } from "vitest";
import {
  buildEmailFootnoteFromCounts,
  buildSlackFootnoteFromCounts,
  EMAIL_NOISE_FOOTNOTE_SUFFIX,
  SLACK_EXCLUSIONS_FOOTNOTE,
} from "@/lib/daily-status-copy";

describe("daily-status-copy", () => {
  it("locks email footnote suffix from live HTML", () => {
    expect(EMAIL_NOISE_FOOTNOTE_SUFFIX).toContain("GitHub/Gemini/Flagsmith");
    expect(EMAIL_NOISE_FOOTNOTE_SUFFIX).toContain("GitLab !13 skipped");
    expect(EMAIL_NOISE_FOOTNOTE_SUFFIX).toContain("Noa/Octopus");
  });

  it("builds email footnote with account counts", () => {
    const footnote = buildEmailFootnoteFromCounts([
      { label: "Velora", count: 1 },
      { label: "Tikal", count: 2 },
    ]);
    expect(footnote).toMatch(/^Velora: 1 · Tikal: 2\./);
    expect(footnote).toContain(EMAIL_NOISE_FOOTNOTE_SUFFIX);
  });

  it("locks Slack exclusions from live HTML", () => {
    expect(SLACK_EXCLUSIONS_FOOTNOTE).toContain("#153/#336");
    expect(SLACK_EXCLUSIONS_FOOTNOTE).toContain("Jay, Adam blockers");
  });

  it("builds Slack footnote with cutoff hint", () => {
    const footnote = buildSlackFootnoteFromCounts(
      [{ label: "Velora", count: 0 }, { label: "Tikal", count: 0 }],
      "נסרקו mentions ו־DMs אחרי cutoff 16/9 17:04",
    );
    expect(footnote).toContain("Velora: 0 · Tikal: 0");
    expect(footnote).toContain(SLACK_EXCLUSIONS_FOOTNOTE);
  });
});
