import {
  PLACEHOLDER_EMAILS,
  PLACEHOLDER_EMAILS_FOOTNOTE,
} from "./placeholder-data";

export function EmailsSection() {
  return (
    <section className="ds-card" data-testid="emails-section">
      <h2>מיילים</h2>
      <table>
        <thead>
          <tr>
            <th>מקור</th>
            <th>נושא</th>
            <th>מתי</th>
          </tr>
        </thead>
        <tbody>
          {PLACEHOLDER_EMAILS.map((row) => (
            <tr key={`${row.source}-${row.subject}`}>
              <td>
                <span className="ds-pill ds-pill-soon">{row.source}</span>
              </td>
              <td>{row.subject}</td>
              <td>{row.when}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ds-footnote">{PLACEHOLDER_EMAILS_FOOTNOTE}</p>
    </section>
  );
}
