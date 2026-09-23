# FocusBoard Bot → Electron Inventory

**Authoritative sources:**
- Live HTML: `/Users/mavishay/FocusBoard/index.html` (machineId `7e0a8f1b-f84b-4693-830c-c5dd7167c0fd`)
- Personal ops assistant filter lists
- [xAI bot export](https://x.ai/bot/NYay_A-4aSCDjgDOJ2py3)

**Legend:** `ported` · `pending` · `wontfix`

---

## HTML structure lock (Electron daily-status must match)

| Region | Content | Electron component |
|---|---|---|
| Root | `lang=he` `dir=rtl` | `DailyStatusShell` |
| Header | `FocusBoard · סטטוס יומי` + weekday · date · time · refresh note | `DailyStatusHeader` |
| Metrics (×4) | פגישות שנותרו \| משימות היום \| מיילים unread \| Slack פתוח (ok/warn/hot) | `MetricsStrip` |
| Next-up | Single-line priority summary | `NextUpBanner` |
| Main LEFT | Calendar table: מתי \| פגישה \| מקור \| סטטוס | `CalendarSection` |
| Main RIGHT | TickTick today + tomorrow: משימה \| פרויקט \| חשיבות | `TasksSections` |
| Bottom LEFT | Mail: מקור \| נושא \| מתי | `EmailsSection` |
| Bottom RIGHT | Slack: מקור \| פעולה פתוחה \| מתי | `SlackSection` |
| Footer | Last refresh + 5 min cadence + TZ + work window | `DailyStatusFooter` |

**Legacy HTML behaviors (not ported to Electron):**
- Browser meta-refresh / JS `location.reload()` every 60s — replaced by in-app data poll every 5 min (`DailyStatusRefreshProvider`)
- Static HTML file rewrite on disk — **wontfix**; Electron is the daily driver
- Notion as primary dashboard — **wontfix**

**CSS tokens (locked):**

```css
--bg: #0f1419;
--card: #1a2332;
--border: #2d3a4d;
--text: #e7ecf3;
--muted: #8b9bb4;
--accent: #5b9fd4;
/* plus green / amber / red metric tones */
```

Font: Segoe UI / system-ui. Layout uses **tables**, not card-redesign.

---

## Exact email noise rules (`src/lib/noise-filters.ts`)

Auto mark-as-read / never Action or Urgent in daily-status:

| Category | Patterns / senders |
|---|---|
| Promotions & blasts | unsubscribe, promotion, advertisement, cold email/outreach, blast, newsletter, limited-time offer, mailing list |
| GitHub | notification emails (`notifications@github.com`, etc.) |
| Gemini | meeting notes |
| Flagsmith | `@flagsmith.com` |
| Jetserver | `@jetserver.co.il`, jetclients tickets/support |
| Neon | `alerts@email.neon.tech` |
| Bots | `cursor[bot]`, `vercel[bot]` notification emails |
| RSVP acceptances | Accepted:/RSVP Yes, “accepted this invitation”, Hebrew `אישור השתתפות`, Zoom confirmation |
| Linear digest | Linear digest notification emails |

**Never noise (keep unread / urgent):**

| Category | Rule |
|---|---|
| Organizer cancel/decline/reschedule | `isOrganizedMeetingChangeEmail` — Action/Urgent if soon |
| IB login alerts | `isEmailUrgentHeuristic` — always urgent, never filtered |

**Pending (follow-up #85):**

| Category | Rule |
|---|---|
| Calendar invites | Sun–Thu, start≥09:00, end≤17:30, no timed conflict on Velora+Tikal+Personal → auto-accept + mark read; else Action |

---

## Exact Slack noise rules (`src/lib/noise-filters.ts`)

| Category | Rule |
|---|---|
| Channel chatter, bots, resolved threads | `botId`, `bot_message` subtype |
| Linear bot DMs | `isLinearBotDm` |
| Unrelated PR review asks | Noise unless channel `C0BASNN6YU9` (project-vgm-engineering) or other designated eng channels |
| Shavit PR-bot | PASS / approved / merge-ready / review asks → noise |
| Human Shavit (non-PR) | Still surfaces |
| Workspaces | Velora (default) + Tikal |

**Slack open-actions cutoff:** After **2026-09-16 ~17:04 Bangkok** clear-all — only NEW actions after cutoff. Documented default: `DEFAULT_SLACK_CUTOFF_ISO` in `noise-filters.ts`. App setting: `slack_cutoff_iso` in `app_settings` (already wired in `open-actions-service.ts`).

---

## Routine / skill inventory

| Routine / Skill | Schedule (Asia/Bangkok, Sun–Thu) | Status | In-app mechanism |
|---|---|---|---|
| FocusBoard data refresh | `*/5 9-17` | **ported** | `DailyStatusRefreshProvider` + cron `onStatusUpdate` |
| Footer last refresh | on each sync | **ported** | `formatDailyStatusFooter` — `נתונים נכתבו מחדש {HH:MM} בנגקוק` |
| Calendar today (×3 cals) | 5m refresh | **ported** | `CalendarSection` + `calendar.syncAll` |
| TickTick today/tomorrow/overdue | 5m refresh | **ported** | `TasksSections` + `useTasks` |
| Gmail unread (×3, post-noise) | 5m refresh | **ported** | `EmailsSection` + `filterActionableEmails` |
| Slack open actions | 5m refresh | **ported** | `SlackOpenActionsContext` + cutoff setting |
| Email noise filters | on list/count | **ported** | `isEmailNoise` |
| Slack noise filters | on open-actions scan | **ported** | `isSlackNoise` + channel `C0BASNN6YU9` exception |
| Declined calendar exclusion | on render | **partial** | `shouldDisplayCalendarEvent` → #85 for API `responseStatus` |
| Calendar invite auto-accept | work hours | **pending** | #85 |
| Morning focus list | 09:00 | **pending** | #86 |
| Email digests | 09:09 / 12:30 / 17:07 | **pending** | #87 |
| Email urgent scan | `*/10 8-18` | **pending** | #87 |
| Slack digests | 09:00 / 12:30 / 17:00 | **pending** | #88 |
| Slack urgent scan | `*/10 8-18` | **pending** | #88 |
| Skill: morning-focus-list | ad hoc | **pending** | #86 |
| Skill: ticktick-eisenhower-triage | ad hoc | **pending** | #89 |
| Skill: email-triage | ad hoc | **ported** (partial) | classifier + noise module |
| Skill: slack-triage | ad hoc | **ported** (partial) | open-actions service |
| Skill: getting-started | ad hoc | **wontfix** | in-app onboarding |
| HTML file rewrite | legacy | **wontfix** | — |
| 60s browser reload | legacy | **wontfix** | Electron uses 5m data poll |

---

## Shared modules

| Module | Purpose |
|---|---|
| `src/lib/noise-filters.ts` | Email + Slack + calendar noise; exports `DESIGNATED_ENG_CHANNEL_ID`, `DEFAULT_SLACK_CUTOFF_ISO` |
| `src/components/daily-status/DailyStatusRefreshContext.tsx` | 5-minute data refresh while daily-status visible |
| `electron/main/slack/filters.ts` | Main-process adapter for shared Slack rules |

---

## Follow-up issues

| Issue | Title |
|---|---|
| [#85](https://github.com/mavishay/FocusBoard/issues/85) | Calendar declined filter + in-hours invite auto-accept |
| [#86](https://github.com/mavishay/FocusBoard/issues/86) | Port morning-focus-list skill + 09:00 schedule |
| [#87](https://github.com/mavishay/FocusBoard/issues/87) | Email digest + urgent scan schedules |
| [#88](https://github.com/mavishay/FocusBoard/issues/88) | Slack digest + urgent scan schedules |
| [#89](https://github.com/mavishay/FocusBoard/issues/89) | TickTick Eisenhower triage (write path) |
