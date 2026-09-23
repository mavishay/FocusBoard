import {
  PLACEHOLDER_CALENDAR,
  PLACEHOLDER_CALENDAR_FOOTNOTE,
} from "./placeholder-data";

function pillClass(variant: "done" | "soon" | "later" | "skip"): string {
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

export function CalendarSection() {
  const todayLabel = new Date().toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
  });

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
          {PLACEHOLDER_CALENDAR.map((row) => (
            <tr key={`${row.when}-${row.title}`}>
              <td>{row.when}</td>
              <td>{row.title}</td>
              <td>
                <span className={pillClass(row.sourceVariant)}>{row.source}</span>
              </td>
              <td>
                <span className={pillClass(row.statusVariant)}>{row.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ds-footnote">{PLACEHOLDER_CALENDAR_FOOTNOTE}</p>
    </section>
  );
}
