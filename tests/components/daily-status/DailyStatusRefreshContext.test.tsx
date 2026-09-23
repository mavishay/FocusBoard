// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  DailyStatusRefreshProvider,
  formatDailyStatusFooter,
} from "../../../src/components/daily-status/DailyStatusRefreshContext";
import { DailyStatusFooter } from "../../../src/components/daily-status/DailyStatusFooter";

describe("DailyStatusRefreshContext", () => {
  beforeEach(() => {
    Object.assign(globalThis.window, {
      electronAPI: {
        calendar: { syncAll: vi.fn().mockResolvedValue([]) },
        gmail: { syncAll: vi.fn().mockResolvedValue([]) },
        googleTasks: {
          listAccounts: vi.fn().mockResolvedValue([]),
          sync: vi.fn().mockResolvedValue(undefined),
        },
        ticktick: {
          listAccounts: vi.fn().mockResolvedValue([]),
          sync: vi.fn().mockResolvedValue(undefined),
        },
        cron: { onStatusUpdate: vi.fn(() => vi.fn()) },
      },
    });
  });

  it("formats footer with timezone label", () => {
    const footer = formatDailyStatusFooter(
      new Date("2026-09-23T10:30:00.000Z"),
      "Asia/Bangkok",
    );
    expect(footer).toContain("Asia/Bangkok");
    expect(footer).toContain("נתונים נכתבו מחדש");
    expect(footer).toContain("בנגקוק");
    expect(footer).toContain("מתעדכנים כל 5 דק׳ ע״י FocusBoard refresh routine");
    expect(footer).not.toContain("הדפדפן מרענן");
  });

  it("renders footer with last refresh after provider sync", async () => {
    render(
      <DailyStatusRefreshProvider>
        <DailyStatusFooter />
      </DailyStatusRefreshProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("daily-status-footer")).toHaveTextContent(
        "נתונים נכתבו מחדש",
      );
    });
  });
});
