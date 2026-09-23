# FocusBoard Bot → Electron Inventory

**Authoritative HTML snapshot:** 2026-09-23 15:16 Asia/Bangkok  
**Live path:** `/Users/mavishay/FocusBoard/index.html` (machineId `7e0a8f1b-f84b-4693-830c-c5dd7167c0fd`)  
**Also:** Personal ops assistant + [xAI bot export](https://x.ai/bot/NYay_A-4aSCDjgDOJ2py3)

**Legend:** `ported` · `pending` · `wontfix`

---

## HTML structure lock (Electron daily-status must match)

| Region | Live HTML copy / structure | Electron component |
|---|---|---|
| Root | `lang=he` `dir=rtl` | `DailyStatusShell` |
| Header title | `FocusBoard · סטטוס יומי` | `DailyStatusHeader` |
| Header meta | `{weekday} · {date} · {HH:MM} בנגקוק · ריפרש דפדפן כל 60 ש׳` | `ELECTRON_HEADER_REFRESH_NOTE` → `ריענון נתונים כל 5 דק׳` |
| Metrics (×4) | פגישות שנותרו \| משימות היום \| מיילים unread \| Slack פתוח | `MetricsStrip` |
| Metric hints | meetings: `אירועים היום N · Velora …` · tasks: `due היום … overdue … מחר …` · mail: `… אחרי סינון noise` · slack: `… אחרי cutoff 16/9 17:04` | `metrics.ts` + `formatSlackMetricsCutoffHint` |
| Next-up | `Next up:` + meeting + counts | `NextUpBanner` |
| Main LEFT | `יומן · היום DD/M` table: מתי \| פגישה \| מקור \| סטטוס | `CalendarSection` |
| Main RIGHT | `משימות · היום` + `משימות · מחר` tables: משימה \| פרויקט \| חשיבות | `TasksSections` |
| Bottom LEFT | `מיילים` table + noise footnote | `EmailsSection` |
| Bottom RIGHT | `Slack` table + cutoff/exclusions footnote | `SlackSection` |
| Footer | see **Footer copy lock** below | `DailyStatusFooter` |

### CSS tokens (locked — `daily-status.css`)

```css
--bg: #0f1419;
--card: #1a2332;
--border: #2d3a4d;
--text: #e7ecf3;
--muted: #8b9bb4;
--accent: #5b9fd4;
--green: #3ecf8e;
--amber: #f0b429;
--red: #f07178;
```

Font: Segoe UI / system-ui. **Tables**, not card-redesign. `max-width: 1100px` wrap.

### Browser refresh (legacy HTML only — `wontfix` in Electron)

```html
<meta http-equiv="refresh" content="60" />
```

```js
setInterval(function () { location.reload(); }, 60000);
// + visibilitychange reload if tab focused after >60s stale
```

Electron replaces this with **5-minute data poll** (`DailyStatusRefreshProvider`) — no full window reload.

### Footer copy lock

**Live HTML (2026-09-23 15:16):**

```
FocusBoard · נתונים נכתבו מחדש 15:16 בנגקוק · מתעדכנים כל 5 דק׳ ע״י FocusBoard HTML refresh routine · הדפדפן מרענן כל דקה · Asia/Bangkok · Sun–Thu 09:00–17:30
```

**Electron (`formatDailyStatusFooter`):** same structure; `FocusBoard refresh routine` (not HTML); **omits** `הדפדפן מרענן כל דקה`.

### Mail footnote copy lock (`src/lib/daily-status-copy.ts`)

```
{Velora: N · Tikal: N · Personal: N}. GitHub/Gemini/Flagsmith/Neon/Jetserver/cursor[bot]/vercel[bot]/Linear digest/RSVP/Zoom confirmation/IB login סוננו; GitLab !13 skipped; Noa/Octopus הומרו למשימות ולא מוצגים.
```

### Slack footnote copy lock

```
Velora: 0 · Tikal: 0 · נסרקו mentions ו־DMs אחרי cutoff 16/9 17:04. Shavit PR-bot (#153/#336/#393/#406/#347), Jay, Adam blockers (deferred), Linear bots מוחרגים.
```

Open-actions cutoff: after **2026-09-16 ~17:04 Bangkok** clear-all (`DEFAULT_SLACK_CUTOFF_ISO` / `slack_cutoff_iso` setting).

---

## Exact email noise rules (`src/lib/noise-filters.ts`)

| Category | Patterns |
|---|---|
| Promotions & blasts | unsubscribe, promotion, advertisement, cold outreach, blast, newsletter, limited-time offer, mailing list |
| GitHub | notification emails |
| Gemini | meeting notes |
| Flagsmith | `@flagsmith.com` |
| Jetserver | `@jetserver.co.il`, jetclients |
| Neon | `alerts@email.neon.tech` |
| Bots | `cursor[bot]`, `vercel[bot]` |
| RSVP / Zoom | Accepted:, Hebrew `אישור השתתפות`, “accepted this invitation”, Zoom confirmation |
| Linear digest | digest notification emails |

**Never noise:** organizer cancel/decline/reschedule; IB login (`isEmailUrgentHeuristic`).

**Pending (#85):** in-hours conflict-free calendar invite auto-accept.

---

## Exact Slack noise rules

| Category | Rule |
|---|---|
| Bots / channel chatter | `botId`, `bot_message` |
| Linear bot DMs | `isLinearBotDm` |
| Unrelated PR review asks | noise unless channel `C0BASNN6YU9` (project-vgm-engineering) |
| Shavit PR-bot | PASS / approved / merge-ready / review → noise; human Shavit non-PR surfaces |
| Manual exclusions (footnote) | Jay, Adam blockers (deferred), Linear bots |
| Workspaces | Velora + Tikal |

---

## Routine / skill inventory

| Routine / Skill | Schedule (Asia/Bangkok, Sun–Thu) | Status | Mechanism |
|---|---|---|---|
| FocusBoard data refresh | `*/5 9-17` | **ported** | `DailyStatusRefreshProvider` |
| Footer last refresh | on sync | **ported** | `formatDailyStatusFooter` |
| Calendar / tasks / mail / Slack | 5m | **ported** | section components + hooks |
| Email + Slack noise | on list/scan | **ported** | `noise-filters.ts` + `daily-status-copy.ts` |
| 60s browser reload | legacy | **wontfix** | Electron data poll instead |
| HTML file rewrite | legacy | **wontfix** | — |
| Morning focus / digests / Eisenhower | various | **pending** | #86–#89 |

---

## Shared modules

| Module | Purpose |
|---|---|
| `src/lib/noise-filters.ts` | Email/Slack/calendar noise rules |
| `src/lib/daily-status-copy.ts` | Locked Hebrew footnotes + header/footer copy |
| `src/components/daily-status/DailyStatusRefreshContext.tsx` | 5-minute data refresh |
| `electron/main/slack/filters.ts` | Main-process Slack adapter |

---

## Follow-up issues

| Issue | Title |
|---|---|
| [#85](https://github.com/mavishay/FocusBoard/issues/85) | Calendar declined filter + in-hours invite auto-accept |
| [#86](https://github.com/mavishay/FocusBoard/issues/86) | Morning focus list + 09:00 schedule |
| [#87](https://github.com/mavishay/FocusBoard/issues/87) | Email digest + urgent scans |
| [#88](https://github.com/mavishay/FocusBoard/issues/88) | Slack digest + urgent scans |
| [#89](https://github.com/mavishay/FocusBoard/issues/89) | TickTick Eisenhower triage |
