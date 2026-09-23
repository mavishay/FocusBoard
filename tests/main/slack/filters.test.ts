import { describe, it, expect } from "vitest";
import {
  isAfterCutoff,
  isExcludedSender,
  parseExcludedSenders,
} from "../../../electron/main/slack/filters";

describe("slack filters", () => {
  it("parses excluded senders from JSON", () => {
    expect(parseExcludedSenders('["bot-a","bot-b"]')).toEqual([
      "bot-a",
      "bot-b",
    ]);
  });

  it("excludes bot messages and configured senders", () => {
    expect(
      isExcludedSender(
        { text: "PR #153 PASS merge ready", username: "shavit-pr-bot", botId: null },
        ["shavit"],
      ),
    ).toBe(true);

    expect(
      isExcludedSender(
        { text: "Can we sync on the roadmap?", username: "shavit", botId: null },
        ["shavit"],
      ),
    ).toBe(false);

    expect(
      isExcludedSender(
        { text: "mention", username: "alice", botId: "B123" },
        [],
      ),
    ).toBe(true);
  });

  it("filters by cutoff timestamp", () => {
    const cutoff = "2026-09-16T10:04:00.000Z";
    const afterCutoffTs = String(
      Math.floor(new Date("2026-09-17T10:04:00.000Z").getTime() / 1000),
    );
    const beforeCutoffTs = String(
      Math.floor(new Date("2026-09-15T10:04:00.000Z").getTime() / 1000),
    );

    expect(isAfterCutoff(afterCutoffTs, cutoff)).toBe(true);
    expect(isAfterCutoff(beforeCutoffTs, cutoff)).toBe(false);
  });
});
