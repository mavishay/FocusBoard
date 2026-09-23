import { describe, it, expect } from "vitest";
import {
  formatSlackCutoffShort,
  formatSlackMetricsCutoffHint,
  formatSlackScanCutoffHint,
  formatSlackWorkspaceFooter,
} from "../../../src/components/daily-status/format-slack-when";

describe("formatSlackWorkspaceFooter", () => {
  it("shows connect hint when Slack is not configured", () => {
    expect(formatSlackWorkspaceFooter([], null, false)).toContain(
      "ממתין לחיבור Slack",
    );
  });

  it("shows per-workspace counts when connected", () => {
    const footer = formatSlackWorkspaceFooter(
      [
        { label: "Velora", count: 0 },
        { label: "Tikal", count: 2 },
      ],
      "2026-09-16T10:04:00.000Z",
      true,
    );

    expect(footer).toContain("Velora: 0");
    expect(footer).toContain("Tikal: 2");
    expect(footer).toContain("mentions");
    expect(footer).toContain("Shavit PR-bot (#153");
    expect(footer).toContain("Jay, Adam blockers");
  });
});

describe("formatSlackCutoffShort", () => {
  it("formats cutoff as 16/9 17:04 style for metrics and footnotes", () => {
    const short = formatSlackCutoffShort(
      "2026-09-16T10:04:00.000Z",
      "Asia/Bangkok",
    );
    expect(short).toMatch(/16\/9 17:04/);
    expect(formatSlackMetricsCutoffHint("2026-09-16T10:04:00.000Z")).toBe(
      `אחרי cutoff ${short}`,
    );
    expect(formatSlackScanCutoffHint("2026-09-16T10:04:00.000Z")).toContain(
      "נסרקו mentions ו־DMs אחרי cutoff",
    );
  });

  it("returns generic scan text when cutoff is missing", () => {
    expect(formatSlackScanCutoffHint(null)).toBe("נסרקו mentions ו־DMs");
  });
});
