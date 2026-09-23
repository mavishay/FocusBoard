import {
  PLACEHOLDER_TASKS_TODAY,
  PLACEHOLDER_TASKS_TODAY_FOOTNOTE,
  PLACEHOLDER_TASKS_TOMORROW,
  PLACEHOLDER_TASKS_TOMORROW_FOOTNOTE,
  type TaskRow,
} from "./placeholder-data";

function TasksTable({ rows }: { rows: TaskRow[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>משימה</th>
          <th>פרויקט</th>
          <th>חשיבות</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.title}>
            <td>{row.title}</td>
            <td>{row.project}</td>
            <td>
              <span className={row.priorityVariant === "hi" ? "ds-hi" : "ds-med"}>
                {row.priority}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TasksSections() {
  const todayLabel = new Date().toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
  });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowLabel = tomorrow.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
  });

  return (
    <div className="ds-stack" data-testid="tasks-sections">
      <section className="ds-card">
        <h2>משימות · היום {todayLabel}</h2>
        <TasksTable rows={PLACEHOLDER_TASKS_TODAY} />
        <p className="ds-footnote">{PLACEHOLDER_TASKS_TODAY_FOOTNOTE}</p>
      </section>
      <section className="ds-card">
        <h2>משימות · מחר {tomorrowLabel}</h2>
        <TasksTable rows={PLACEHOLDER_TASKS_TOMORROW} />
        <p className="ds-footnote">{PLACEHOLDER_TASKS_TOMORROW_FOOTNOTE}</p>
      </section>
    </div>
  );
}
