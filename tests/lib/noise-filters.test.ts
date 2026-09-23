import { describe, it, expect } from "vitest";
import {
  DESIGNATED_ENG_CHANNEL_ID,
  filterActionableEmails,
  isDeclinedCalendarEvent,
  isEmailNoise,
  isEmailUrgentHeuristic,
  isOrganizedMeetingChangeEmail,
  isPromotionOrBlastEmail,
  isSlackNoise,
  shouldDisplayCalendarEvent,
} from "@/lib/noise-filters";

describe("noise-filters email rules", () => {
  it("marks standing noise senders from email-triage.md", () => {
    expect(
      isEmailNoise({
        fromAddress: "gemini-notes@google.com",
        subject: "VGM Sync notes",
      }),
    ).toBe(true);
    expect(
      isEmailNoise({
        fromAddress: "alerts@email.neon.tech",
        subject: "Spending threshold exceeded",
      }),
    ).toBe(true);
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
        fromAddress: "alerts@email.neon.tech",
        subject: "Database alert",
      }),
    ).toBe(true);
    expect(
      isEmailNoise({
        fromAddress: "support@flagsmith.com",
        subject: "Feature flag update",
      }),
    ).toBe(true);
    expect(
      isEmailNoise({
        fromAddress: "tickets@jetserver.co.il",
        subject: "jetclients ticket",
      }),
    ).toBe(true);
  });

  it("marks promotions, blasts, and Linear digest as noise", () => {
    expect(
      isPromotionOrBlastEmail({
        subject: "Limited-time offer — 50% off",
      }),
    ).toBe(true);
    expect(
      isEmailNoise({
        fromAddress: "digest@linear.app",
        subject: "Your Linear digest",
      }),
    ).toBe(true);
  });

  it("marks RSVP acceptances as noise including Hebrew", () => {
    expect(
      isEmailNoise({
        subject: "Accepted: Weekly sync",
        snippet: "You accepted this invitation",
      }),
    ).toBe(true);
    expect(
      isEmailNoise({
        subject: "אישור השתתפות: סדנה",
      }),
    ).toBe(true);
    expect(
      isEmailNoise({
        subject: "Zoom meeting confirmation",
        snippet: "Your meeting is confirmed",
      }),
    ).toBe(true);
  });

  it("keeps IB login alerts as urgent (not noise)", () => {
    const email = {
      fromAddress: "alerts@interactivebrokers.com",
      subject: "IB login alert from new device",
    };
    expect(isEmailUrgentHeuristic(email)).toBe(true);
    expect(isEmailNoise(email)).toBe(false);
  });

  it("keeps organized meeting cancel/decline/reschedule visible", () => {
    const email = {
      subject: "Cancelled: Team standup you organized",
      snippet: "A participant declined",
    };
    expect(isOrganizedMeetingChangeEmail(email)).toBe(true);
    expect(isEmailNoise(email)).toBe(false);
  });

  it("filters actionable unread list", () => {
    const emails = [
      { fromAddress: "boss@tikal.co.il", subject: "Action needed" },
      { fromAddress: "notifications@github.com", subject: "CI failed" },
      {
        fromAddress: "hr@company.com",
        subject: "Accepted: 1:1",
        classification: null,
      },
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

  it("excludes Linear bot DMs", () => {
    expect(
      isSlackNoise({
        text: "Issue updated",
        username: "linear",
        isDirectMessage: true,
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

  it("keeps PR review asks in project-vgm-engineering channel", () => {
    expect(
      isSlackNoise({
        text: "Please review my PR when you have a moment",
        username: "bob",
        channelId: DESIGNATED_ENG_CHANNEL_ID,
      }),
    ).toBe(false);
    expect(
      isSlackNoise({
        text: "Please review my PR when you have a moment",
        username: "bob",
        channelName: "random",
      }),
    ).toBe(true);
  });
});
