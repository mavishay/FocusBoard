import { formatSlackWhen } from "./format-slack-when";
import { useSlackOpenActions } from "./SlackOpenActionsContext";

export function SlackSection() {
  const { actions, footnote, loading } = useSlackOpenActions();
  const now = new Date();

  return (
    <section className="ds-card" data-testid="slack-section">
      <h2>Slack</h2>
      <table>
        <thead>
          <tr>
            <th>מקור</th>
            <th>פעולה פתוחה</th>
            <th>מתי</th>
          </tr>
        </thead>
        <tbody>
          {actions.length === 0 ? (
            <tr>
              <td colSpan={3}>
                <span className="ds-empty">
                  {loading ? "טוען..." : "אין פעולות פתוחות"}
                </span>
              </td>
            </tr>
          ) : (
            actions.map((row) => (
              <tr key={`${row.workspace}-${row.ts}-${row.link}`}>
                <td>
                  <span className="ds-pill ds-pill-soon">{row.workspace}</span>
                </td>
                <td>
                  <a
                    href={row.link}
                    onClick={(event) => {
                      event.preventDefault();
                      void window.electronAPI?.shell?.openExternal(row.link);
                    }}
                  >
                    {row.text}
                  </a>
                </td>
                <td>{formatSlackWhen(row.ts, now)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="ds-footnote">{footnote}</p>
    </section>
  );
}
