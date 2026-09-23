// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DailyStatusShell } from "../../src/components/daily-status";

describe("DailyStatusShell", () => {
  it("renders RTL Hebrew daily status layout regions", () => {
    render(<DailyStatusShell />);

    const shell = screen.getByTestId("daily-status-shell");
    expect(shell).toHaveAttribute("dir", "rtl");
    expect(shell).toHaveAttribute("lang", "he");
    expect(screen.getByText(/FocusBoard · סטטוס יומי/)).toBeInTheDocument();
    expect(screen.getByTestId("metrics-strip")).toBeInTheDocument();
    expect(screen.getByTestId("next-up-banner")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-section")).toBeInTheDocument();
    expect(screen.getByTestId("tasks-sections")).toBeInTheDocument();
    expect(screen.getByTestId("emails-section")).toBeInTheDocument();
    expect(screen.getByTestId("slack-section")).toBeInTheDocument();
    expect(screen.getByText("אין פעולות פתוחות")).toBeInTheDocument();
  });
});
