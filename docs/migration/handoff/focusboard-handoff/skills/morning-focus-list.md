---
name: Morning focus list
description: >-
  Use when building a start-of-day focus list from TickTick (Eisenhower triage
  with max 3 tasks due per day), PRs, Linear, Slack, calendar, and unread email
  — with GitHub/Gemini/Flagsmith/Jetserver/Neon/cursor[bot]/vercel[bot] noise
  filtered.
---
# Morning focus list

## Sources (gather in parallel after TickTick triage)
0. **TickTick Eisenhower triage** — run [TickTick Eisenhower triage](sand-workflow:ticktick-eisenhower-triage) first (or in parallel with other reads, but apply due updates **and the daily due cap of ≤3 tasks/day** before composing the personal-tasks section). Use the user's timezone and business days from context.
   The 3/day cap applies to triage/morning-focus overflow spreading ONLY — one-off tasks the user explicitly schedules on a day may exceed 3; do not auto-spill those.
1. **GitHub** — open PRs authored by the user: readiness, CI, age, stacks (same spirit as eod-report). Prefer work/Velora scope when the user has that convention.
2. **Linear** — issues assigned to me in **In Progress** or **PR** only (omit backlog / Next).
3. **Slack** — recent mentions and clear follow-ups needing attention.
4. **Calendar** — today's meetings from every connected Google Calendar account; merge and tag source when helpful.
5. **Unread email** — prefer running [email-triage](sand-workflow:email-triage) in `action-digest` or summarizing actionable to-dos and must-know items. Summarize only; never send/archive unless asked.

## Email noise (always)
- **Ignore** GitHub notification emails (`notifications@github.com` / github notifiers) — do not put them in the focus list.
- **Ignore** Gemini meeting notes (`gemini-notes@google.com`), e.g. “VGM Sync” — do not put them in the focus list.
- **Ignore** Flagsmith (`@flagsmith.com`, usage/overage alerts) — do not put them in the focus list.
- **Ignore** Jetserver (`@jetserver.co.il`, jetclients tickets / support) — do not put them in the focus list.
- **Ignore** Neon alerts (`alerts@email.neon.tech`, spending threshold / monthly limit) — do not put them in the focus list.
- **Ignore** cursor[bot] and vercel[bot] notification emails — do not put them in the focus list.
- When any of those appear unread, **auto-mark as read** (remove `UNREAD`) without asking.

## Output
Short skimmable focus list in chat:
- Meetings first (by time)
- **TickTick — do today** — **at most 3** post-triage dues (+ **one optional undated gap-filler**)
- Brief note if overflow was spilled to later business days
- **TickTick Q4 proposals** (awaiting approval — never auto-delete)
- Blockers / red CI
- Urgent email asks (non-noise only)
- Review-ready PRs
- In Progress tickets
- Slack follow-ups

Bold blockers and time-sensitive items. No fluff. Do not post to Slack unless asked.
