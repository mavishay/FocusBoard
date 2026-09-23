---
name: TickTick Eisenhower triage
description: >-
  Use when triaging TickTick tasks by Eisenhower using priority for importance
  and due-date bands for urgency (today/overdue, next 3 days, this week),
  enforcing a max of 3 tasks due per day (skipping known days off), updating
  dues, proposing Q4 deletes, and producing today's list — especially in morning
  focus.
---
# TickTick Eisenhower triage

Triage open TickTick tasks into Eisenhower quadrants from **priority (importance)** + **due date (urgency)**, update due dates for Q1–Q3, **enforce a daily due cap**, propose (never silently delete) Q4 actions, then emit today's execution report.

## Prerequisites
- TickTick MCP connected (`user-ticktick` or equivalent).
- User timezone and **business days** come from the calling routine/context (do not hardcode a person).
- Honor any **days off / holidays** recorded in agent memory (or stated by the user) — never place dues on those dates.

## Urgency from due date (no urgent tag required)

Interpret urgency bands in the user timezone (all-day dues count as that calendar day):

| Band | Hebrew sense | Rule |
|---|---|---|
| **בהול** | hottest | due **today**, or **overdue** |
| **דחוף מאוד** | very urgent | due within the **next 3 calendar days** (after today) |
| **דחוף** | urgent | due later this **calendar week** (after the 3-day window, still in the current week) |
| **לא דחוף** | not urgent | **no due date**, or due **after this calendar week** |

For Eisenhower **Urgent vs Not urgent**:
- **Urgent** = בהול **or** דחוף מאוד **or** דחוף (anything due this week including overdue/today)
- **Not urgent** = no due date, or due after this calendar week

Optional override tags still win if present: `e1`–`e4`.

## Importance from priority

| | Rule |
|---|---|
| **Important** | `priority` is **5** (high) or **3** (medium) |
| **Not important** | `priority` is **0** / unset or **1** (low) |

## Classification

| Quadrant | Meaning | Detect |
|---|---|---|
| **Q1** | Urgent + Important | Important **and** Urgent |
| **Q2** | Important + Not urgent | Important **and** Not urgent |
| **Q3** | Urgent + Not important | Not important **and** Urgent |
| **Q4** | Not urgent + Not important | Not important **and** Not urgent |

Skip completed (`status` 2) and abandoned (`status` -1). Prefer classifying parent tasks; still list open subtasks in reports when useful.

**Recurring exclusion:** if `repeatFlag` is set, **do not change due dates**. List them in a separate **Recurring (excluded)** section for visibility only.

**Order of operations:** classify from the task's **current** due + priority, then apply due updates (non-recurring Q1–Q3 only), then **apply the daily cap** (skipping days off). The next run will re-read the new dues.

## Due-date rules (Q1–Q3 — apply updates)

| Quadrant | Set due date to |
|---|---|
| **Q1** | **Today** (subject to daily cap below) |
| **Q2** | **+2 business days** from today |
| **Q3** | **Next business day** from today |

- Use `update_task` / `batch_update_tasks` with `dueDate` (+ `timeZone` when available).
- Skip rewrite if the due already matches the target day.
- Do **not** change priority unless the user asked.
- **Never** auto-shift recurring tasks.
- When computing “next business day” / spill slots, **skip known days off**.

## Daily due cap (hard rule)

**At most 3 non-recurring actionable tasks may share the same due day** (all-day dues in the user timezone). Count **parent tasks** toward the cap; open subtasks under a parent due that day do not each consume an extra slot unless they have their own independent due and no open parent on that day.

The 3/day cap applies to triage/morning-focus overflow spreading ONLY — one-off tasks the user explicitly schedules on a day may exceed 3; do not auto-spill those.

After Q1–Q3 placement (or whenever a day exceeds 3):

1. Rank tasks on the overloaded day by **importance** (priority 5 before 3 before 1/0), then by urgency band / original due.
2. **Keep the top 3** on that day.
3. **Push the overflow** to later **business days that are not days off**, filling each day up to 3, with realistic spacing (prefer next open business-day slots; do not stack 10 onto one future day). Prefer spreading high-priority overflow sooner than medium.
4. Never leave more than 3 on today after triage. Do not dump every Q1 onto today if that would break the cap — park overflow on upcoming business days instead.
5. **Never schedule on days off** from memory / user (e.g. holidays).

Mention the cap + spill summary in the execution report.

## Q4 — propose only

For Q4 tasks, **do not delete** and do not silently demote. Propose per task:
1. Delete, or
2. Change due date, or
3. Raise importance (priority 3 or 5)

Wait for **explicit user approval** before deleting or applying a Q4 change.

## Gather

1. `list_projects` (include inbox).
2. Load open tasks via `filter_tasks` / per-project `get_project_with_undone_tasks` / date queries as needed — cover undated and future-dated, not only “today”.
3. Classify; apply Q1–Q3 due updates (unless the caller asked for a dry run — then report proposals only).
4. Enforce the **daily due cap** (skip days off).
5. Build the execution report.

## Presentation (always)

Prefer a **pretty, scannable** report:
1. Short Eisenhower **2×2** (markdown table or mermaid `quadrantChart` / flowchart) with **counts** per quadrant.
2. Per quadrant: a markdown **table** with one task per row — columns like Task | Project | Due now | Proposed due | Band — or a bullet list with **one task per line** if a table is unwieldy.
3. Separate **Recurring (excluded)** section.
4. **Today's execution** block: do-today list (**≤3**) + one optional undated gap-filler + Q4 proposals awaiting approval + due-change / spill summary.

Keep Hebrew or English to match the user. No fluff.

## Today's execution report (always produce)

1. **Do today:** at most **3** open tasks due today after triage + cap. Include title, project, priority, urgency band.
2. **Optional gap-filler:** exactly **one** open task with **no due date**, preferring a large one (priority 5, else 3, else parent with many subtasks / longest content). Mark optional.
3. **Q4 proposals** awaiting approval.
4. **Due-date changes summary** (including spill from the daily cap).

## Safety
- Never delete without an explicit yes for those specific tasks.
- Prefer batch updates when many dues change.
- If TickTick auth fails, report and stop — do not invent tasks.
- Dry run = classify + propose only; no writes.
