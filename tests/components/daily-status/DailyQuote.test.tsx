// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { DailyQuote } from "../../../src/components/daily-status/DailyQuote";

const mockGetToday = vi.fn();
const mockRefresh = vi.fn();

beforeEach(() => {
  mockGetToday.mockResolvedValue({
    date: "2026-09-23",
    content: "Focus on what matters.",
    author: "Test Author",
    source: "zenquotes",
    tags: [],
    fetchedAt: "2026-09-23T08:00:00.000Z",
  });
  mockRefresh.mockResolvedValue({
    date: "2026-09-23",
    content: "New quote for today.",
    author: "Another Author",
    source: "zenquotes",
    tags: [],
    fetchedAt: "2026-09-23T08:05:00.000Z",
  });

  Object.assign(window, {
    electronAPI: {
      quote: {
        getToday: mockGetToday,
        refresh: mockRefresh,
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DailyQuote", () => {
  it("renders quote and author on load", async () => {
    render(<DailyQuote />);

    await waitFor(() => {
      expect(screen.getByTestId("daily-quote")).toBeInTheDocument();
    });

    expect(screen.getByText(/Focus on what matters/)).toBeInTheDocument();
    expect(screen.getByText(/Test Author/)).toBeInTheDocument();
    expect(mockGetToday).toHaveBeenCalledTimes(1);
  });

  it("refreshes quote when refresh button is clicked", async () => {
    render(<DailyQuote />);

    await waitFor(() => {
      expect(screen.getByTestId("daily-quote")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "רענון ציטוט" }));

    await waitFor(() => {
      expect(screen.getByText(/New quote for today/)).toBeInTheDocument();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
