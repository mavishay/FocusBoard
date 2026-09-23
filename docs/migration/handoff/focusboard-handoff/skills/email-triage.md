---
name: email-triage
description: >-
  Use when triaging unread Gmail across connected accounts — classify
  urgent/action/noise with timestamps; auto-accept in-hours conflict-free
  calendar invites; auto-mark meeting acceptances and other noise as read; alert
  on urgent; keep and surface cancel/decline/reschedule of meetings the user
  created; digest then walk items one-by-one.
---
---
name: email-triage
description: >-
  Use when triaging unread Gmail across connected accounts — classify
  urgent/action/noise with timestamps; auto-accept in-hours conflict-free
  calendar invites; auto-mark meeting acceptances and other noise as read; alert
  on urgent; keep and surface cancel/decline/reschedule of meetings the user
  created; digest then walk items one-by-one.
---
# Email triage

Scan **every connected Gmail account** (discover namespaces/status first; do not assume a single inbox). Work in the user's timezone (Asia/Bangkok). Work week: **Sun–Thu**.

## Modes
- **`urgent-watch`** — classify unread; alert only on **urgent**; auto-handle **noise**, **meeting acceptances**, and **auto-acceptable calendar invites**; stay silent if nothing urgent (and no invite needing a decision). For each urgent item that needs a reply, start the **one-by-one decision** flow (below) after the alert.
- **`action-digest`** — classify; show overview digest; then walk **action** (and remaining urgent / invite decisions / organizer change notices) items **one by one**. Stay silent if empty of action+urgent+invite-asks.
- **`full`** — same as digest but also list noise samples if useful.

## Fetch
For each connected Gmail account in parallel:
1. Search unread threads (inbox/unread).
2. Pull enough context (subject, from, snippet/body, **message date**).
3. Tag with **account label**.

Cap volume (newest first). Auth-fail: note once, continue.

## Always show **when**
Every alert, digest row, and one-by-one card **must** include:
- Absolute time in the user's timezone (e.g. `11/9 14:22`)
- Short relative age (e.g. `לפני 3 ימים`)

Use the newest message time on the thread that triggered the item.

## Classification (exactly one bucket)

### 1. Urgent
Immediate attention: near deadline, blocker, outage, payment/security, VIP crisis, "need you now".

### 2. Action
Reply owed, approval, follow-up, form, scheduling — can wait for digest.
Calendar invites that **fail** the auto-accept rules below land here as invite decisions.
**Organizer change notices** (see below) land here — keep unread and notify.

### 3. Noise
Auto mark-as-read without asking:
- Promotions, ads, cold sales, blasts, large lists
- Standing noise: GitHub notifications, Gemini meeting notes, **Flagsmith** (`@flagsmith.com`), **Jetserver** (`@jetserver.co.il`, jetclients tickets / support), **Neon alerts** (`alerts@email.neon.tech`, spending threshold / monthly limit), **cursor[bot]** and **vercel[bot]** (Cursor/Vercel bot notification emails), plus memory/preferences
- **Meeting acceptances / confirmations** — RSVP "Accepted" / "Yes" / Hebrew אישור השתתפות / "accepted this invitation" emails (e.g. Arye confirming Velora weekly). These are FYI only; mark read and do not surface.

### 4. Calendar invites (special — before Action)
When unread mail is a **calendar invitation** (Google invite / "Invitation:" subject / ICS):

1. Parse the event **start** and **end** in Asia/Bangkok.
2. Check for conflicts on **all three** calendars in parallel: Velora (`user-Google-calendar`), Tikal (`user-Google-calendar--tikal`), Personal (`user-Google-calendar--personal`) via `list_events` over the invite window. A conflict = any overlapping event (ignore all-day soft reminders only if clearly non-blocking and user preference says so — default: treat timed overlaps as conflict).
3. **Auto-accept** when **all** of:
   - Event day is a workday **Sun–Thu**
   - Start ≥ **09:00** and end ≤ **17:30** (entirely inside the window)
   - No conflicting timed event on any of the three calendars
4. On auto-accept: call `respond_to_event` with accept on the **correct calendar account** that received the invite, then mark the invite email as read. Do **not** surface in digest (optional count: "N invites auto-accepted").
5. **Otherwise** (outside hours, weekend, conflict, or ambiguous times): treat as Action — one-by-one ask **לאשר / לא לאשר / דלג** (do not auto-decline). Show when, title, conflict if any.

### 5. Organizer change notices (special — Action / alert)
When mail is about an event the **user organized / created** (you are the organizer on calendar, or invite was sent from the user's calendar):
- **Cancel**, **decline**, or **reschedule / time-change request** from an attendee → **keep unread**, classify as **Action** (or **Urgent** if the meeting is today/soon), and **notify** in urgent-watch or digest. Do **not** auto-mark read.
- Pure **acceptances** on those same events → Noise (mark read), per above.

If unsure whether the user is organizer, check the matching calendar event's organizer field across the three calendars before auto-reading.

## Actions by bucket
| Bucket | Behavior |
|---|---|
| **Urgent** | Alert immediately (account · **when** · from · subject · why · link). Then one-by-one decision if a reply/task is needed. |
| **Action** | Overview row in digest, then one-by-one decision. Do **not** mark read unless asked (except after invite accept/decline they chose). |
| **Noise** | Mark as read automatically; do not surface (optional count in digest). Includes meeting acceptances. |
| **Invite auto-accept** | Accept on calendar + mark invite email read; silent unless digest notes the count. |
| **Organizer cancel/decline/reschedule** | Keep unread; surface and notify; walk one-by-one. |

Never send/reply/archive/trash/forward unless the user explicitly chooses that in the decision flow (or asks in chat). Auto-accept of calendar invites is the exception above.

## One-by-one decision (Action + Urgent-with-work)
**Do not** open with a bulk "convert to tasks" widget.

1. After the short overview digest (if any), process **one thread at a time**, oldest-open or highest-priority first.
2. For each item show: account · **when** · from · subject · what they need · link · **proposed reply draft** (in the user's voice; sample their style in that thread when helpful — see send-on-behalf).
3. Ask with a widget (values like natural replies), options roughly:
   - **שלח את הטיוטה בשמי** — send/reply via connector after they confirm (use DraftExternalMessage when they want to edit first; direct send only if they clearly said send)
   - **אגיד לך מה לענות** — wait for their wording, then draft/send as they ask
   - **הפוך למשימה ב־TickTick** — create only after this choice
   - **דלג / אחר כך** — leave unread, move to next
4. For **calendar invites that need a decision**, use options: **לאשר** / **לא לאשר** / **דלג** (and TickTick only if useful).
5. Finish that item before presenting the next. Never batch-convert or batch-send.
6. Skip items already decided earlier in this conversation unless new mail arrived.

### TickTick conversion due date
When the user picks **הפוך למשימה ב־TickTick** (or asks in chat to convert mail to TickTick), always set **due = today** (Asia/Bangkok, all-day). Do **not** spill to later days for the 3/day Eisenhower cap — these conversions may exceed the daily cap, same as other user-explicit one-offs. Only use a different due if the user names one.

If the right move is only a lasting to-do with no reply, still offer the same four choices (draft can be "no reply needed — task only" and highlight the task option).

## Digest overview format
Skimmable table **before** the walkthrough:
1. **דחוף** — account · **when** · from · subject · why
2. **לביצוע** — account · **when** · from · subject · what (include invite decisions and organizer change notices)
3. Optional: noise auto-read count · invites auto-accepted count · acceptances auto-read count

Then: "מתחיל אחד־אחד…" and the first decision card.

## Deduping / auth
Same thread id once. Repeated Gmail auth failure → pause calling routine and tell the user which account to reconnect.
