---
name: slack-triage
description: >-
  Use when triaging Slack across connected workspaces — classify
  urgent/action/FYI/noise with timestamps, alert on urgent, digest then walk
  items one-by-one (draft in their language / ask what to say / TickTick /
  skip); auto-skip unrelated PR reviews unless in C0BASNN6YU9.
---
# Slack triage

Scan **every connected Slack account/workspace** (e.g. Velora/`default` and `tikal`). User timezone. Use stored Slack user ids for mentions when available.

## Modes
- **`urgent-watch`** — alert only on **urgent**; dismiss **noise**; stay silent if none. Then one-by-one decision for urgent items that need a reply/task.
- **`action-digest`** — overview digest, then walk **action** (+ remaining urgent) **one by one**. Stay silent if empty.
- **`full`** — same, may include FYI list in the overview.

## Fetch
For each account in parallel: mentions, DMs, unreplied asks (private-capable search when available). Pull channel, from, snippet, permalink, **message time**. Tag account label. Cap newest-first.

## Always show **when**
Every alert, digest row, and one-by-one card **must** include:
- Absolute time in the user's timezone (e.g. `11/9 14:22`)
- Short relative age (e.g. `לפני 3 ימים`)

## Reply language
Drafts and sent replies are always in **the other party's language** (match the message being answered), even if the user discusses the item in another language in chat.

## Classification (exactly one)

### 1. Urgent
Immediate mid-task: deadline, blocker, outage, incident, VIP "now".

### 2. Action
Reply/approval/follow-up that can wait for digest.

### 3. FYI
Worth knowing; no clear ask — overview only, **no** one-by-one unless the user asks.

### 4. Noise
Dismiss without asking:
- Channel chatter, bots, resolved threads, standing Slack-noise prefs
- **PR review requests** that are not directly related to the user’s own work/repos — **unless** the ask appears in Slack channel `C0BASNN6YU9` (project-vgm-engineering). Auto-skip those from digests and one-by-one.

## Dismiss / mark read
Use a real mark-read API if it exists. Otherwise record handled `ts`+channel and say dismissed *from triage* only — never invent mark-read. Never send/react/reply unless chosen in the decision flow.

## One-by-one decision (Action + Urgent-with-work)
**Do not** open with a bulk convert-to-tasks widget.

1. Short overview digest first (with **when** on every row).
2. Then **one message/thread at a time**.
3. For each: account · **when** · channel · from · snippet · link · **proposed reply draft** (in **their** language; match the user's voice in that DM/channel — see send-on-behalf).
4. Widget options (natural values):
   - **שלח את הטיוטה בשמי**
   - **אגיד לך מה לענות**
   - **הפוך למשימה ב־TickTick**
   - **דלג / אחר כך**
5. Complete that item before the next. Create tasks / send only after explicit choice. Skip already-decided items unless a new reply arrived.

## Digest overview format
1. **דחוף** — account · **when** · channel · from · why · link
2. **לביצוע / לענות** — account · **when** · channel · from · what · link
3. **כדאי להכיר** (FYI) — with **when**
4. Noise dismissed count
5. Then one-by-one walkthrough for action/urgent only

## Deduping / auth
Same `ts`+channel once. Repeated auth failure → pause routine and name the Slack account to reconnect.
