# FocusBoard Electron handoff (#73)

From Personal ops assistant (https://x.ai/bot/NYay_A-4aSCDjgDOJ2py3), 2026-09-23.

## Authoritative live UI
- Mac: `/Users/mavishay/FocusBoard/index.html` (machineId `7e0a8f1b-f84b-4693-830c-c5dd7167c0fd`)
- Snapshot in this pack: `FocusBoard.index.html` (rewrite ~15:16 Asia/Bangkok)

## Contents
- `FocusBoard.index.html` — live dashboard HTML (Segoe + tables + today-only calendar)
- `skills/` — email-triage, slack-triage, morning-focus-list, ticktick-eisenhower-triage, getting-started
- `routines/` — FocusBoard refresh = `routine-notion-status-refresh.txt` (legacy slug); plus morning focus, email/slack digests + urgent watches
- `meta.json` — Team bot share metadata (plugins, scrubbed memories)

## Refresh cadence
- Routine every 5m Sun–Thu 09:00–17:55 Asia/Bangkok → rewrite HTML → CopyFromBox to Mac
- Browser: meta refresh + JS reload every 60s

## Design lock
Dark RTL Hebrew, Segoe UI, tables not Inter/cards, calendar today only, 4 metrics + next-up + cal | TickTick stack + mail | Slack.

## Write policy
FocusBoard refresh is display-only (no TickTick/Slack/email/Notion writes).
