import { isEmailNoise } from "@/lib/noise-filters";

export type MetricTone = "ok" | "warn" | "hot";

export interface MetricCard {
  id: "meetings" | "tasks" | "mail" | "slack";
  label: string;
  value: string;
  hint: string;
  tone: MetricTone;
}

export interface AccountCount {
  label: string;
  count: number;
}

export interface CalendarEventSummary {
  totalToday: number;
  byAccount: AccountCount[];
}

export interface TaskDueCounts {
  today: number;
  overdue: number;
  tomorrow: number;
}

export interface ClassifiedEmail {
  accountId: string;
  classification: string;
  fromAddress?: string | null;
  subject?: string | null;
  snippet?: string | null;
}

export interface MetricsInput {
  remainingMeetings: number;
  calendarSummary: CalendarEventSummary;
  taskCounts: TaskDueCounts;
  unreadByAccount: AccountCount[];
  slackOpen: number;
  slackByAccount: AccountCount[];
  slackHintSuffix?: string;
}

// Default thresholds (configurable later):
// meetings remaining: 0=ok, 1-3=warn, 4+=hot
// tasks due today: 0-2=ok, 3-5=warn, 6+=hot
// unread mail (post-noise): 0-1=ok, 2-4=warn, 5+=hot
// slack open actions: 0=ok, 1-2=warn, 3+=hot

export function toneForMeetingsRemaining(count: number): MetricTone {
  if (count <= 0) return "ok";
  if (count <= 3) return "warn";
  return "hot";
}

export function toneForTasksToday(count: number): MetricTone {
  if (count <= 2) return "ok";
  if (count <= 5) return "warn";
  return "hot";
}

export function toneForUnreadMail(count: number): MetricTone {
  if (count <= 1) return "ok";
  if (count <= 4) return "warn";
  return "hot";
}

export function toneForSlackOpen(count: number): MetricTone {
  if (count <= 0) return "ok";
  if (count <= 2) return "warn";
  return "hot";
}

export function formatAccountBreakdown(
  counts: AccountCount[],
  suffix?: string
): string {
  const parts = counts.map(({ label, count }) => `${label} ${count}`);
  const base = parts.join(" · ");
  return suffix ? `${base} · ${suffix}` : base;
}

export function mergeAccountCounts(
  accounts: Array<{ label: string }>,
  counts: AccountCount[]
): AccountCount[] {
  const countMap = new Map(counts.map((entry) => [entry.label, entry.count]));
  return accounts.map((account) => ({
    label: account.label,
    count: countMap.get(account.label) ?? 0,
  }));
}

export type DueDay = "overdue" | "today" | "tomorrow" | "other";

export function getDueDay(
  dueAt: string | null,
  now: Date = new Date()
): DueDay | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.floor(
    (startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  return "other";
}

export function countTaskDueBuckets(
  tasks: Array<{ dueAt: string | null; completed: boolean }>,
  now: Date = new Date()
): TaskDueCounts {
  const counts: TaskDueCounts = { today: 0, overdue: 0, tomorrow: 0 };
  for (const task of tasks) {
    if (task.completed) continue;
    const bucket = getDueDay(task.dueAt, now);
    if (bucket === "today") counts.today += 1;
    else if (bucket === "overdue") counts.overdue += 1;
    else if (bucket === "tomorrow") counts.tomorrow += 1;
  }
  return counts;
}

export function countUnreadMailByAccount(
  emails: ClassifiedEmail[],
  accountLabels: Map<string, string>
): AccountCount[] {
  const counts = new Map<string, number>();
  for (const email of emails) {
    if (
      isEmailNoise({
        fromAddress: email.fromAddress,
        subject: email.subject,
        snippet: email.snippet,
        classification: email.classification,
      })
    ) {
      continue;
    }
    const label = accountLabels.get(email.accountId) ?? email.accountId;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function buildMetricsCards(input: MetricsInput): MetricCard[] {
  const meetingsBreakdown = formatAccountBreakdown(input.calendarSummary.byAccount);
  const meetingsHint = `אירועים היום ${input.calendarSummary.totalToday} · ${meetingsBreakdown}`;

  const tasksHint = `due היום ${input.taskCounts.today} · overdue ${input.taskCounts.overdue} · מחר ${input.taskCounts.tomorrow}`;

  const unreadTotal = input.unreadByAccount.reduce(
    (sum, entry) => sum + entry.count,
    0
  );
  const mailHint = formatAccountBreakdown(
    input.unreadByAccount,
    "אחרי סינון noise"
  );

  const slackHint = formatAccountBreakdown(
    input.slackByAccount,
    input.slackHintSuffix
  );

  return [
    {
      id: "meetings",
      label: "פגישות שנותרו היום",
      value: String(input.remainingMeetings),
      hint: meetingsHint,
      tone: toneForMeetingsRemaining(input.remainingMeetings),
    },
    {
      id: "tasks",
      label: "משימות היום",
      value: String(input.taskCounts.today),
      hint: tasksHint,
      tone: toneForTasksToday(input.taskCounts.today),
    },
    {
      id: "mail",
      label: "מיילים unread",
      value: String(unreadTotal),
      hint: mailHint,
      tone: toneForUnreadMail(unreadTotal),
    },
    {
      id: "slack",
      label: "Slack פתוח",
      value: String(input.slackOpen),
      hint: slackHint,
      tone: toneForSlackOpen(input.slackOpen),
    },
  ];
}

export const EMPTY_METRICS: MetricCard[] = buildMetricsCards({
  remainingMeetings: 0,
  calendarSummary: { totalToday: 0, byAccount: [] },
  taskCounts: { today: 0, overdue: 0, tomorrow: 0 },
  unreadByAccount: [],
  slackOpen: 0,
  slackByAccount: [],
  slackHintSuffix: "ממתין לחיבור Slack",
});
