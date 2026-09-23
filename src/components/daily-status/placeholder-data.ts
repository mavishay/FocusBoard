export type MetricTone = "ok" | "warn" | "hot";

export interface MetricPlaceholder {
  label: string;
  value: string;
  hint: string;
  tone: MetricTone;
}

export interface CalendarRow {
  when: string;
  title: string;
  source: string;
  status: string;
  statusVariant: "done" | "soon" | "later" | "skip";
  sourceVariant: "later" | "soon";
}

export interface TaskRow {
  title: string;
  project: string;
  priority: string;
  priorityVariant: "hi" | "med";
}

export interface EmailRow {
  source: string;
  subject: string;
  when: string;
}

export const PLACEHOLDER_METRICS: MetricPlaceholder[] = [
  {
    label: "פגישות שנותרו היום",
    value: "5",
    hint: "אירועים היום 8 · Velora 2 · Tikal 6 · Personal 0",
    tone: "hot",
  },
  {
    label: "משימות היום",
    value: "5",
    hint: "due היום 5 · overdue 1 · מחר 4",
    tone: "hot",
  },
  {
    label: "מיילים unread",
    value: "3",
    hint: "Velora 1 · Tikal 2 · Personal 0 · אחרי סינון noise",
    tone: "warn",
  },
  {
    label: "Slack פתוח",
    value: "0",
    hint: "Velora 0 · Tikal 0 · אחרי cutoff 16/9 17:04",
    tone: "ok",
  },
];

export const PLACEHOLDER_NEXT_UP =
  "Next up: סדנת משוב ל- GLים 14:00 (Tikal, עכשיו) · נותרו היום 5 פגישות · unread: 3 · Slack פתוח: 0.";

export const PLACEHOLDER_CALENDAR: CalendarRow[] = [
  {
    when: "01:00–01:45",
    title: "Devops Office Hours",
    source: "Velora",
    status: "הסתיים",
    statusVariant: "done",
    sourceVariant: "later",
  },
  {
    when: "10:00–11:00",
    title: "MIT",
    source: "Tikal",
    status: "הסתיים",
    statusVariant: "done",
    sourceVariant: "later",
  },
  {
    when: "13:00–13:45",
    title: "Fullstack Qtr Planning & Match",
    source: "Tikal",
    status: "הסתיים",
    statusVariant: "done",
    sourceVariant: "later",
  },
  {
    when: "14:00–17:00",
    title: "סדנת משוב ל- GLים",
    source: "Tikal",
    status: "בקרוב",
    statusVariant: "soon",
    sourceVariant: "later",
  },
  {
    when: "16:30–17:00",
    title: "Agentic Engineer Modules Sync",
    source: "Tikal",
    status: "בקרוב",
    statusVariant: "soon",
    sourceVariant: "later",
  },
  {
    when: "16:30–17:00",
    title: "Productize AI Assets to Solutions",
    source: "Tikal",
    status: "בקרוב",
    statusVariant: "soon",
    sourceVariant: "later",
  },
  {
    when: "17:00–17:30",
    title: "Frontend Tech Circle Sync",
    source: "Tikal",
    status: "בקרוב",
    statusVariant: "soon",
    sourceVariant: "later",
  },
  {
    when: "21:30–22:00",
    title: "VGM Sync",
    source: "Velora",
    status: "בקרוב",
    statusVariant: "soon",
    sourceVariant: "later",
  },
];

export const PLACEHOLDER_CALENDAR_FOOTNOTE =
  "היום: 8 אירועים (Velora 2 · Tikal 6 · Personal 0) · אירועים confirmed/לא declined בלבד · Showcase / Infra Automation / Product Engineer Course לא נכללו (declined).";

export const PLACEHOLDER_TASKS_TODAY: TaskRow[] = [
  {
    title: "להעביר כסף שכירות לרכב",
    project: "Personal",
    priority: "גבוהה · p5",
    priorityVariant: "hi",
  },
  {
    title: "דיווח מס הונג קונג",
    project: "Personal",
    priority: "בינונית · p3",
    priorityVariant: "med",
  },
  {
    title: "להתכונן לטיול עם זיו",
    project: "Personal",
    priority: "בינונית · p3",
    priorityVariant: "med",
  },
  {
    title: "לעשות שיחת סטטוס עם שי ששון",
    project: "Tikal",
    priority: "בינונית · p3",
    priorityVariant: "med",
  },
  {
    title: "תכנון רילוקיישן - מקסיקו",
    project: "Personal",
    priority: "בינונית · p3",
    priorityVariant: "med",
  },
];

export const PLACEHOLDER_TASKS_TODAY_FOOTNOTE =
  "due בפועל בלבד; overdue: 1 (להשקיע בעידכון הלינקדין מ־21/9).";

export const PLACEHOLDER_TASKS_TOMORROW: TaskRow[] = [
  {
    title: "ביצוע רודמאפים רבעון רביעי",
    project: "Tikal",
    priority: "גבוהה · p5",
    priorityVariant: "hi",
  },
  {
    title: "קביעת תאריכים לרודמאפ",
    project: "Tikal",
    priority: "גבוהה · p5",
    priorityVariant: "hi",
  },
  {
    title: "חיסון לכלבות",
    project: "Personal",
    priority: "גבוהה · p5",
    priorityVariant: "hi",
  },
  {
    title: "טיפול דיווח 90 יום",
    project: "Personal",
    priority: "גבוהה · p5",
    priorityVariant: "hi",
  },
];

export const PLACEHOLDER_TASKS_TOMORROW_FOOTNOTE = "due בפועל בלבד; 4 משימות.";

export const PLACEHOLDER_EMAILS: EmailRow[] = [
  {
    source: "Tikal",
    subject: "Fullstack BP Sync — תיקון של החלק הראשון באוטומציה (Ortal)",
    when: "23/9 13:12 · לפני ~1 שע׳",
  },
  {
    source: "Velora",
    subject: "Adam Henry mentioned you — לנקות VGM/UGFP ב-Linear",
    when: "22/9 23:13 · לפני ~15 שע׳",
  },
  {
    source: "Tikal",
    subject: "דיווחי שעות - ספטמבר 2026",
    when: "22/9 17:10 · לפני ~21 שע׳",
  },
];

export const PLACEHOLDER_EMAILS_FOOTNOTE =
  "Velora: 1 · Tikal: 2 · Personal: 0. GitHub/Gemini/Flagsmith/Neon/Jetserver/cursor[bot]/vercel[bot]/Linear digest/RSVP/Zoom confirmation/IB login סוננו; GitLab !13 skipped; Noa/Octopus הומרו למשימות ולא מוצגים.";

export const PLACEHOLDER_SLACK_FOOTNOTE =
  "Velora: 0 · Tikal: 0 · נסרקו mentions ו־DMs אחרי cutoff 16/9 17:04. Shavit PR-bot (#153/#336/#393/#406/#347), Jay, Adam blockers (deferred), Linear bots מוחרגים.";
