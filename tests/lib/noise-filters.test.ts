import { describe, it, expect } from "vitest";
import {
  filterActionableEmails,
  isDeclinedCalendarEvent,
  isEmailNoise,
  isOrganizedMeetingChangeEmail,
  isSlackNoise,
  shouldDisplayCalendarEvent,
} from "@/lib/noise-filters";

describe("noise-filters email rules", () => {
  it("marks GitHub and bot senders as noise", () => {
    expect(
      isEmailNoise({
        fromAddress: "notifications@github.com",
        subject: "PR merged",
      }),
    ).toBe(true);
    expect(
      isEmailNoise({
        fromAddress: "cursor[bot]@noreply.github.com",
        subject: "Review requested",
      }),
    ).toBe(true);
    expect(
      isEmailNoise({
        fromAddress: "alerts@neon.tech",
        subject: "Database alert",
      }),
    ).toBe(true);
  });

  it("marks RSVP acceptances as noise", () => {
    expect(
      isEmailNoise({
        subject: "Accepted: Weekly sync",
        snippet: "You accepted this invitation",
      }),
    ).toBe(true);
  });

  it("keeps organized meeting cancel/decline/reschedule visible", () => {
    const email = {
      subject: "Cancelled: Team standup you organized",
      snippet: "A participant declined",
    };
    expect(isOrganizedMeetingChangeEmail(email)).toBe(true);
    expect(isEmailNoise(email)).toBe(false);
  });

  it("respects explicit noise classification", () => {
    expect(
      isEmailNoise({
        fromAddress: "client@example.com",
        subject: "Need your input",
        classification: "noise",
      }),
    ).toBe(true);
  });

  it("filters actionable unread list", () => {
    const emails = [
      { fromAddress: "boss@tikal.co.il", subject: "Action needed" },
      { fromAddress: "notifications@github.com", subject: "CI failed" },
      { fromAddress: "hr@company.com", subject: "Accepted: 1:1", classification: null },
    ];
    expect(filterActionableEmails(emails)).toHaveLength(1);
    expect(filterActionableEmails(emails)[0].subject).toBe("Action needed");
  });
});

describe("noise-filters calendar rules", () => {
  it("excludes declined events", () => {
    expect(
      isDeclinedCalendarEvent({ attendeeResponseStatus: "declined" }),
    ).toBe(true);
    expect(shouldDisplayCalendarEvent({ title: "Showcase (declined)" })).toBe(
      false,
    );
    expect(shouldDisplayCalendarEvent({ title: "MIT sync" })).toBe(true);
  });
});

describe("noise-filters slack rules", () => {
  it("excludes bot messages and configured senders", () => {
    expect(
      isSlackNoise({
        text: "deploy complete",
        username: "linear",
        botId: null,
      }),
    ).toBe(true);
    expect(
      isSlackNoise({
        text: "ping",
        username: "alice",
        botId: "B123",
      }),
    ).toBe(true);
  });

  it("excludes Shavit PR-bot noise but keeps human Shavit", () => {
    expect(
      isSlackNoise({
        text: "PR #153 PASS — merge ready",
        username: "shavit-pr-bot",
      }),
    ).toBe(true);
    expect(
      isSlackNoise({
        text: "Can you sync on the roadmap today?",
        username: "shavit",
      }),
    ).toBe(false);
  });

  it("excludes unrelated PR review asks outside eng channels", () => {
    expect(
      isSlackNoise({
        text: "Please review my PR when you have a moment",
        username: "bob",
        channelName: "random",
      }),
    ).toBe(true);
    expect(
      isSlackNoise({
        text: "Please review my PR when you have a moment",
        username: "bob",
        channelName: "engineering",
      }),
    ).toBe(false);
  });
});
