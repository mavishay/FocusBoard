import { useCallback, useEffect, useState } from "react";
import { useDailyStatusRefresh } from "./DailyStatusRefreshContext";
import {
  buildCalendarDisplayRows,
  buildCalendarFootnote,
  type CalendarApiEvent,
  type CalendarDisplayRow,
} from "./format-calendar-row";
import {
  PLACEHOLDER_CALENDAR,
  PLACEHOLDER_CALENDAR_FOOTNOTE,
} from "./placeholder-data";
import { getDailyStatusTimezone, getTodayDateKey } from "./timezone";

function pillClass(variant: CalendarDisplayRow["statusVariant"]): string {
  switch (variant) {
    case "done":
      return "ds-pill ds-pill-done";
    case "soon":
      return "ds-pill ds-pill-soon";
    case "skip":
      return "ds-pill ds-pill-skip";
    default:
      return "ds-pill ds-pill-later";
  }
}

function hasElectronAPI(): boolean {
  return typeof window !== "undefined" && "electronAPI" in window;
}

export function CalendarSection() {
  const { refreshGeneration } = useDailyStatusRefresh();
  const [rows, setRows] = useState<CalendarDisplayRow[]>([]);
  const [footnote, setFootnote] = useState(PLACEHOLDER_CALENDAR_FOOTNOTE);
  const [usePlaceholder, setUsePlaceholder] = useState(() => !hasElectronAPI());
  const [loading, setLoading] = useState(true);

  const loadCalendar = useCallback(async () => {
    if (!hasElectronAPI()) {
      setUsePlaceholder(true);
      setRows(PLACEHOLDER_CALENDAR);
      setFootnote(PLACEHOLDER_CALENDAR_FOOTNOTE);
      setLoading(false);
      return;
    }

    setUsePlaceholder(false);
    setLoading(true);

    const timeZone = getDailyStatusTimezone();
    const today = getTodayDateKey(new Date(), timeZone);

    try {
      const [events, accounts] = await Promise.all([
        window.electronAPI.calendar.getFilteredEvents(today, today),
        window.electronAPI.gmail.listAccounts(),
      ]);

      const accountsById = new Map(
        accounts.map((account) => [account.id, account]),
      );

      const displayRows = buildCalendarDisplayRows(
        events as CalendarApiEvent[],
        accountsById,
      );
      setRows(displayRows);
      setFootnote(buildCalendarFootnote(displayRows));
    } catch {
      setRows([]);
      setFootnote("שגיאה בטעינת יומן");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar, refreshGeneration]);

  const todayLabel = new Date().toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
  });

  const displayRows = usePlaceholder ? PLACEHOLDER_CALENDAR : rows;
  const displayFootnote = usePlaceholder ? PLACEHOLDER_CALENDAR_FOOTNOTE : footnote;

  return (
    <section className="ds-card" data-testid="calendar-section">
      <h2>יומן · היום {todayLabel}</h2>
      <table>
        <thead>
          <tr>
            <th>מתי</th>
            <th>פגישה</th>
            <th>מקור</th>
            <th>סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {loading && !usePlaceholder ? (
            <tr>
              <td colSpan={4}>
                <span className="ds-empty">טוען יומן...</span>
              </td>
            </tr>
          ) : displayRows.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <span className="ds-empty">אין אירועים להיום</span>
              </td>
            </tr>
          ) : (
            displayRows.map((row) => (
              <tr key={row.id ?? `${row.when}-${row.title}`}>
                <td>{row.when}</td>
                <td>{row.title}</td>
                <td>
                  <span className={pillClass(row.sourceVariant)}>{row.source}</span>
                </td>
                <td>
                  <span className={pillClass(row.statusVariant)}>{row.status}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="ds-footnote">{displayFootnote}</p>
    </section>
  );
}
