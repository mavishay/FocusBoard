// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SlackOpenActionsProvider } from "../../../src/components/daily-status/SlackOpenActionsContext";
import { SlackSection } from "../../../src/components/daily-status/SlackSection";

afterEach(() => {
  cleanup();
});

function renderWithProvider() {
  return render(
    <SlackOpenActionsProvider>
      <SlackSection />
    </SlackOpenActionsProvider>,
  );
}

describe("SlackSection", () => {
  it("renders empty state when there are no open actions", async () => {
    Object.assign(window, {
      electronAPI: {
        slack: {
          getOpenActions: vi.fn().mockResolvedValue({
            actions: [],
            totalOpen: 0,
            byWorkspace: [],
            cutoffIso: null,
            scannedAt: new Date().toISOString(),
            connected: false,
          }),
        },
        cron: {
          onStatusUpdate: vi.fn(() => vi.fn()),
        },
      },
    });

    renderWithProvider();

    expect(await screen.findByText("אין פעולות פתוחות")).toBeInTheDocument();
    expect(screen.getByTestId("slack-section")).toBeInTheDocument();
  });

  it("renders open actions when data is available", async () => {
    Object.assign(window, {
      electronAPI: {
        slack: {
          getOpenActions: vi.fn().mockResolvedValue({
            actions: [
              {
                workspace: "Tikal",
                text: "Please review PR #123",
                link: "https://slack.com/archives/C1/p123",
                ts: "1758617040",
              },
            ],
            totalOpen: 1,
            byWorkspace: [{ label: "Tikal", count: 1 }],
            cutoffIso: "2026-09-16T10:04:00.000Z",
            scannedAt: new Date().toISOString(),
            connected: true,
          }),
        },
        cron: {
          onStatusUpdate: vi.fn(() => vi.fn()),
        },
        shell: {
          openExternal: vi.fn(),
        },
      },
    });

    renderWithProvider();

    expect(
      await screen.findByText("Please review PR #123"),
    ).toBeInTheDocument();
    expect(screen.getByText("Tikal")).toBeInTheDocument();
  });
});
