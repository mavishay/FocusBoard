import { PLACEHOLDER_SLACK_FOOTNOTE } from "./placeholder-data";

export function SlackSection() {
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
          <tr>
            <td colSpan={3}>
              <span className="ds-empty">אין פעולות פתוחות</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="ds-footnote">{PLACEHOLDER_SLACK_FOOTNOTE}</p>
    </section>
  );
}
