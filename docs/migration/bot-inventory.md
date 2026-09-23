# FocusBoard Bot → Electron Inventory

**Ground truth pack:** [`docs/migration/handoff/focusboard-handoff/`](handoff/focusboard-handoff/) (Personal ops assistant handoff, 2026-09-23)

| Artifact | Path in pack |
|---|---|
| Live HTML snapshot | `FocusBoard.index.html` (15:16 Asia/Bangkok) |
| HTML refresh routine | `routines/routine-notion-status-refresh.txt` (legacy slug) |
| Skills | `skills/*.md` |
| Routines | `routines/*.txt` |
| Bot metadata | `meta.json` |

**Legend:** `ported` · `pending` · `wontfix`

**Write policy (all FocusBoard refresh paths):** display-only — no TickTick creates, Slack posts, email send, or Notion writes.

---

## HTML structure lock

See `FocusBoard.index.html` + `routine-notion-status-refresh.txt`. Electron maps to `DailyStatusShell`.

| Region | Requirement |
|---|---|
| Root | `lang=he` `dir=rtl` |
| Header | `FocusBoard · סטטוס יומי` + weekday · date · time · refresh note |
| Metrics ×4 | פגישות שנותרו \| משימות היום \| מיילים unread \| Slack פתוח (ok/warn/hot) |
| Next-up | Single banner line |
| Main | LEFT calendar table \| RIGHT TickTick today + tomorrow stack |
| Bottom | mail \| Slack tables |
| Footer | `נתונים נכתבו מחדש {HH:MM} בנגקוק · מתעדכנים כל 5 דק׳ ע״י FocusBoard HTML refresh routine · …` |

### CSS tokens

`--bg:#0f1419` `--card:#1a2332` `--border:#2d3a4d` `--text:#e7ecf3` `--muted:#8b9bb4` `--accent:#5b9fd4` + green/amber/red metric tones. Segoe UI, tables, `max-width:1100px`.

### Refresh cadence

| Layer | Schedule | Electron |
|---|---|---|
| **Data rewrite** | `*/5 9-17 * * 0-4` Asia/Bangkok (Sun–Thu) | `DailyStatusRefreshProvider` (5 min poll while visible) + backend cron |
| **Browser reload** | meta refresh 60s + JS `setInterval` + focus-if-stale | **wontfix** — Electron polls data, no `location.reload` |

---

## Skills inventory

| Skill | Source | Status | In-app mechanism | Follow-up |
|---|---|---|---|---|
| **email-triage** | `skills/email-triage.md` | **partial** | `noise-filters.ts` + classifier; daily-status mail list | #85 invites, #87 digests/urgent + one-by-one |
| **slack-triage** | `skills/slack-triage.md` | **partial** | `noise-filters.ts` + `open-actions-service` | #88 digests/urgent + one-by-one |
| **ticktick-eisenhower-triage** | `skills/ticktick-eisenhower-triage.md` | **pending** | Task planner partial; no Eisenhower writes | [#89](https://github.com/mavishay/FocusBoard/issues/89) |
| **morning-focus-list** | `skills/morning-focus-list.md` | **pending** | — | [#86](https://github.com/mavishay/FocusBoard/issues/86) |
| **getting-started** | `skills/getting-started.md` | **wontfix** | In-app onboarding (#12/#13) | — |

---

## Routines inventory

| Routine file | Schedule (Asia/Bangkok, Sun–Thu) | Status | In-app mechanism | Follow-up |
|---|---|---|---|---|
| **routine-notion-status-refresh** | `*/5 9-17 * * 0-4` | **ported** | `DailyStatusShell` + `DailyStatusRefreshProvider` + section hooks | — (#73) |
| **routine-morning-focus-list** | 09:00 | **pending** | — | [#86](https://github.com/mavishay/FocusBoard/issues/86) |
| **routine-email-urgent-watch** | `*/10 8-18` | **pending** | In-app cron + classifier urgent | [#87](https://github.com/mavishay/FocusBoard/issues/87) |
| **routine-email-action-digest-9am** | 09:09 | **pending** | Scheduled notification / chat digest | [#87](https://github.com/mavishay/FocusBoard/issues/87) |
| **routine-email-action-digest-12-30** | 12:30 | **pending** | Scheduled notification / chat digest | [#87](https://github.com/mavishay/FocusBoard/issues/87) |
| **routine-email-action-digest-5pm** | 17:07 | **pending** | Scheduled notification / chat digest | [#87](https://github.com/mavishay/FocusBoard/issues/87) |
| **routine-slack-urgent-watch** | `*/10 8-18` | **pending** | In-app cron + Slack service | [#88](https://github.com/mavishay/FocusBoard/issues/88) |
| **routine-slack-action-digest-9am** | 09:00 | **pending** | Scheduled notification / chat digest | [#88](https://github.com/mavishay/FocusBoard/issues/88) |
| **routine-slack-action-digest-12-30** | 12:30 | **pending** | Scheduled notification / chat digest | [#88](https://github.com/mavishay/FocusBoard/issues/88) |
| **routine-slack-action-digest-5pm** | 17:00 | **pending** | Scheduled notification / chat digest | [#88](https://github.com/mavishay/FocusBoard/issues/88) |

---

## Email noise rules (`src/lib/noise-filters.ts`)

From `email-triage.md` § Noise + morning-focus-list:

| Rule | Implementation |
|---|---|
| Promotions, ads, cold sales, blasts, large lists | `isPromotionOrBlastEmail` |
| GitHub (`notifications@github.com`, github notifiers) | domain + sender patterns |
| Gemini meeting notes (`gemini-notes@google.com`) | domain pattern |
| Flagsmith (`@flagsmith.com`, usage/overage) | domain + body patterns |
| Jetserver (`@jetserver.co.il`, jetclients) | domain pattern |
| Neon (`alerts@email.neon.tech`, spending threshold / monthly limit) | domain + body patterns |
| `cursor[bot]`, `vercel[bot]` | sender patterns |
| Linear digest | sender patterns |
| RSVP Accepted/Yes, Hebrew `אישור השתתפות`, Zoom confirmation | `isMeetingRsvpAcceptance` |
| Organizer cancel/decline/reschedule | **not noise** — `isOrganizedMeetingChangeEmail` |
| IB login alerts | **not noise** for triage — `isEmailUrgentHeuristic` |
| Calendar invite auto-accept (09:00–17:30, no conflict, 3 cals) | **pending** | [#85](https://github.com/mavishay/FocusBoard/issues/85) |

**Mail footnote (live HTML):** `src/lib/daily-status-copy.ts` → `EMAIL_NOISE_FOOTNOTE_SUFFIX`

---

## Slack noise rules (`src/lib/noise-filters.ts`)

From `slack-triage.md` + live HTML footnote:

| Rule | Implementation |
|---|---|
| Bots, channel chatter | `botId`, `bot_message` |
| Linear bot DMs | `isLinearBotDm` |
| Unrelated PR review asks | `isUnrelatedPrReviewAsk` — **except** channel `C0BASNN6YU9` |
| Shavit PR-bot PASS/approved/merge-ready/review | `isShavitPrBotNoise` (human Shavit non-PR surfaces) |
| Manual exclusions (HTML footnote) | Jay, Adam blockers (deferred) — documented in `SLACK_EXCLUSIONS_FOOTNOTE` |
| Open-actions cutoff | after 2026-09-16 17:04 Bangkok — `DEFAULT_SLACK_CUTOFF_ISO` / `slack_cutoff_iso` |
| Workspaces | Velora + Tikal |

---

## Shared modules

| Module | Role |
|---|---|
| `src/lib/noise-filters.ts` | Standing email/Slack noise rules (unit-tested) |
| `src/lib/daily-status-copy.ts` | Locked Hebrew footnotes + routine names |
| `src/components/daily-status/DailyStatusRefreshContext.tsx` | 5-minute in-app data sync |
| `electron/main/slack/filters.ts` | Main-process Slack adapter |

---

## Follow-up issues (not in #73)

| Issue | Scope |
|---|---|
| [#85](https://github.com/mavishay/FocusBoard/issues/85) | Calendar `responseStatus` + in-hours invite auto-accept |
| [#86](https://github.com/mavishay/FocusBoard/issues/86) | Morning focus list routine + skill |
| [#87](https://github.com/mavishay/FocusBoard/issues/87) | Email urgent watch + action digests (09:09/12:30/17:07) |
| [#88](https://github.com/mavishay/FocusBoard/issues/88) | Slack urgent watch + action digests (09:00/12:30/17:00) |
| [#89](https://github.com/mavishay/FocusBoard/issues/89) | TickTick Eisenhower triage (≤3/day cap, recurring skip) |
