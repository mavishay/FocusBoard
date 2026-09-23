# FocusBoard Bot → Electron Inventory

Source: Personal ops assistant + [xAI bot export](https://x.ai/bot/NYay_A-4aSCDjgDOJ2py3) + legacy HTML refresh routine on Mac (`/Users/mavishay/FocusBoard/index.html`).

**Legend:** `ported` = implemented in Electron · `pending` = tracked follow-up · `wontfix` = intentionally out of scope for desktop app

| Routine / Skill | Schedule (Asia/Bangkok, Sun–Thu unless noted) | Status | In-app mechanism | Notes |
|---|---|---|---|---|
| **FocusBoard HTML refresh** | `*/5 9-17` + browser reload 60s | **ported** | `DailyStatusRefreshProvider` + cron `onStatusUpdate` | Replaces static HTML rewrite; React daily-status shell is display-only |
| **Daily status footer (last refresh + TZ)** | on each refresh | **ported** | `DailyStatusFooter` + `formatDailyStatusFooter` | Uses `Asia/Bangkok` default via `getDailyStatusTimezone()` |
| **Calendar today (×3 Google cals)** | part of 5m refresh | **ported** | `CalendarSection` → `calendar.getFilteredEvents` + `calendar.syncAll` | Declined-title filter via `shouldDisplayCalendarEvent`; API `responseStatus` pending #74 |
| **TickTick today / tomorrow / overdue** | part of 5m refresh | **ported** | `TasksSections` + `useTasks` | Read-only display in daily-status; sync via refresh provider |
| **Gmail unread (×3, post-noise)** | part of 5m refresh | **ported** | `EmailsSection` + `filterActionableEmails` | Noise rules in `src/lib/noise-filters.ts` |
| **Slack open actions (post-triage)** | part of 5m refresh | **ported** | `SlackOpenActionsContext` + `electron/main/slack/open-actions-service.ts` | Shared Slack noise via `isSlackNoise` |
| **Header metric cards** | part of 5m refresh | **ported** | `useDailyMetrics` + `metrics.ts` | Unread mail counts use shared email noise filter |
| **Next-up banner** | 60s clock + data refresh | **ported** | `useNextUpData` | Meeting / unread / Slack summary |
| **Email noise auto-read rules** | on fetch/classify | **ported** | `src/lib/noise-filters.ts` (`isEmailNoise`) | GitHub, Gemini notes, Flagsmith, Jetserver, Neon, cursor[bot], vercel[bot], RSVP Yes |
| **Slack noise exclusions** | on open-actions scan | **ported** | `src/lib/noise-filters.ts` (`isSlackNoise`) + `electron/main/slack/filters.ts` | Shavit PR-bot, unrelated PR asks, linear/pr-bot bots |
| **Organized meeting cancel/decline/reschedule** | always notify | **ported** | `isOrganizedMeetingChangeEmail` | Keeps unread despite other noise heuristics |
| **Declined calendar exclusion** | on render | **partial** | `shouldDisplayCalendarEvent` (title + optional `attendeeResponseStatus`) | Full Google Calendar attendee status → #85 |
| **Morning focus list** | 09:00 | **pending** | — | Follow-up #86 |
| **Email digests** | 09:09 / 12:30 / 17:07 | **pending** | scheduled notification / digest job | Follow-up #87 |
| **Email urgent scan** | `*/10 8-18` | **pending** | in-app cron + classifier | Follow-up #87 |
| **Slack digests** | 09:00 / 12:30 / 17:00 | **pending** | scheduled notification job | Follow-up #88 |
| **Slack urgent scan** | `*/10 8-18` | **pending** | in-app cron + Slack service | Follow-up #88 |
| **Skill: morning-focus-list** | ad hoc | **pending** | AI chat / planner integration | Follow-up #86 |
| **Skill: ticktick-eisenhower-triage** | ad hoc | **pending** | task planner + TickTick write APIs | Follow-up #89 (TickTick OAuth/write path) |
| **Skill: email-triage** | ad hoc | **ported** (partial) | classification rules + LLM classifier | Auto-read side effects not yet wired |
| **Skill: slack-triage** | ad hoc | **ported** (partial) | open-actions service | No send/reply from dashboard |
| **Skill: getting-started** | ad hoc | **wontfix** | onboarding wizard | Replaced by in-app onboarding (#12) |
| **TickTick Eisenhower moves (due-date triage)** | ad hoc | **pending** | — | Urgency from due, importance from priority, spill cap ≤3, skip recurring → #89 |
| **In-hours conflict-free invite auto-accept** | 09:00–17:30 workday | **pending** | calendar IPC + Gmail mark-read | Follow-up #85 |
| **HTML file rewrite on disk** | legacy | **wontfix** | — | Electron app is the daily driver |
| **Notion as primary dashboard** | legacy | **wontfix** | — | Per product direction |
| **Write policy (no TickTick create / Slack send from refresh)** | always | **ported** | display-only daily-status | CRUD exists elsewhere in app by design |

## Design tokens (ported)

| Token | Value | Where |
|---|---|---|
| Background | `#0f1419` | `src/components/daily-status/daily-status.css` |
| Card | `#1a2332` | same |
| Border | `#2d3a4d` | same |
| Text | `#e7ecf3` | same |
| Muted | `#8b9bb4` | same |
| Accent | `#5b9fd4` | same |
| Font | Segoe UI stack | same |
| Layout | header → metrics → next-up → calendar\|tasks → mail\|slack → footer | `DailyStatusShell` |

## Shared modules

| Module | Purpose |
|---|---|
| `src/lib/noise-filters.ts` | Email + Slack + calendar display noise rules (unit-tested) |
| `src/components/daily-status/DailyStatusRefreshContext.tsx` | 5-minute auto-refresh orchestration while daily-status is mounted |
| `electron/main/slack/filters.ts` | Main-process Slack filter adapter (re-exports shared rules) |

## Follow-up issues

| Issue | Title |
|---|---|
| [#85](https://github.com/mavishay/FocusBoard/issues/85) | Calendar attendee declined filter + in-hours invite auto-accept |
| [#86](https://github.com/mavishay/FocusBoard/issues/86) | Port morning-focus-list skill + 09:00 schedule |
| [#87](https://github.com/mavishay/FocusBoard/issues/87) | Email digest + urgent scan schedules (09:09/12:30/17:07, */10 8-18) |
| [#88](https://github.com/mavishay/FocusBoard/issues/88) | Slack digest + urgent scan schedules (09:00/12:30/17:00, */10 8-18) |
| [#89](https://github.com/mavishay/FocusBoard/issues/89) | TickTick Eisenhower triage (OAuth write path, spill cap, recurring skip) |
