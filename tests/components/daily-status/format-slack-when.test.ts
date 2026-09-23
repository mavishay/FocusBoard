import { describe, it, expect } from "vitest";
import {
  formatSlackCutoffHint,
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
  });
});

describe("formatSlackCutoffHint", () => {
  it("returns generic scan text when cutoff is missing", () => {
    expect(formatSlackCutoffHint(null)).toBe("נסרקו mentions ו־DMs");
  });
});
