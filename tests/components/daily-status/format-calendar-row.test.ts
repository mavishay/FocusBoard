import { describe, it, expect } from "vitest";
import {
  buildCalendarDisplayRows,
  buildCalendarFootnote,
} from "../../../src/components/daily-status/format-calendar-row";

describe("format-calendar-row", () => {
  const accountsById = new Map([
    ["a1", { id: "a1", displayName: "Tikal" }],
  ]);

  it("builds display rows and excludes declined titles", () => {
    const now = new Date("2026-09-23T12:00:00.000Z");
    const rows = buildCalendarDisplayRows(
      [
        {
          id: "1",
          accountId: "a1",
          title: "MIT",
          startTime: "2026-09-23T10:00:00.000Z",
          endTime: "2026-09-23T11:00:00.000Z",
          calendarName: null,
          accountEmail: "user@tikal.co.il",
        },
        {
          id: "2",
          accountId: "a1",
          title: "Showcase (declined)",
          startTime: "2026-09-23T14:00:00.000Z",
          endTime: "2026-09-23T15:00:00.000Z",
          calendarName: null,
          accountEmail: "user@tikal.co.il",
        },
      ],
      accountsById,
      now,
      "UTC",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("MIT");
    expect(buildCalendarFootnote(rows)).toContain("Tikal 1");
  });
});
