import { useCallback, useEffect, useState } from "react";
import { filterActionableEmails } from "@/lib/noise-filters";
import { CLASSIFICATION_GET_EMAILS_MAX_LIMIT } from "@/lib/classification-constants";
import { useDailyStatusRefresh } from "./DailyStatusRefreshContext";
import { formatEmailWhen } from "./format-email-when";
import {
  PLACEHOLDER_EMAILS,
  PLACEHOLDER_EMAILS_FOOTNOTE,
} from "./placeholder-data";

interface ClassifiedEmail {
  id: string;
  accountId: string;
  subject: string | null;
  fromAddress: string | null;
  snippet: string | null;
  receivedAt: string | null;
  classification: string | null;
  isRead: number;
}

interface GmailAccount {
  id: string;
  displayName: string;
}

interface EmailRow {
  id: string;
  source: string;
  subject: string;
  receivedAt: string | null;
}

function hasElectronAPI(): boolean {
  return typeof window !== "undefined" && "electronAPI" in window;
}

function buildEmailFootnote(rows: EmailRow[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.source, (counts.get(row.source) ?? 0) + 1);
  }

  const breakdown = Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => `${label}: ${count}`)
    .join(" · ");

  return (
    `${breakdown || "אין מיילים unread"}. ` +
    "סוננו: promotions/ads/blasts, GitHub, Gemini notes, Flagsmith, Jetserver/jetclients, " +
    "Neon alerts, cursor[bot]/vercel[bot], Linear digest, RSVP acceptances, Zoom confirmations."
  );
}

export function EmailsSection() {
  const { refreshGeneration } = useDailyStatusRefresh();
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [footnote, setFootnote] = useState(PLACEHOLDER_EMAILS_FOOTNOTE);
  const [usePlaceholder, setUsePlaceholder] = useState(() => !hasElectronAPI());
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  const loadEmails = useCallback(async () => {
    if (!hasElectronAPI()) {
      setUsePlaceholder(true);
      setRows(
        PLACEHOLDER_EMAILS.map((row, index) => ({
          id: `placeholder-${index}`,
          source: row.source,
          subject: row.subject,
          receivedAt: null,
        })),
      );
      setFootnote(PLACEHOLDER_EMAILS_FOOTNOTE);
      setLoading(false);
      return;
    }

    setUsePlaceholder(false);
    setLoading(true);

    try {
      const [emails, accounts] = await Promise.all([
        window.electronAPI.classification.getEmails({
          limit: CLASSIFICATION_GET_EMAILS_MAX_LIMIT,
        }),
        window.electronAPI.gmail.listAccounts(),
      ]);

      const accountLabels = new Map(
        accounts.map((account: GmailAccount) => [account.id, account.displayName]),
      );

      const displayEmails = (emails as ClassifiedEmail[])
        .filter((email) => email.isRead === 0)
        .filter((email) =>
          filterActionableEmails([
            {
              fromAddress: email.fromAddress,
              subject: email.subject,
              snippet: email.snippet,
              classification: email.classification,
            },
          ]).length > 0,
        )
        .slice(0, 10)
        .map((email) => ({
          id: email.id,
          source: accountLabels.get(email.accountId) ?? email.accountId,
          subject: email.subject ?? "(ללא נושא)",
          receivedAt: email.receivedAt,
        }));

      setRows(displayEmails);
      setFootnote(buildEmailFootnote(displayEmails));
    } catch {
      setRows([]);
      setFootnote("שגיאה בטעינת מיילים");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmails();
  }, [loadEmails, refreshGeneration]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const displayRows = usePlaceholder
    ? PLACEHOLDER_EMAILS.map((row, index) => ({
        id: `placeholder-${index}`,
        source: row.source,
        subject: row.subject,
        when: row.when,
      }))
    : rows.map((row) => ({
        id: row.id,
        source: row.source,
        subject: row.subject,
        when: formatEmailWhen(row.receivedAt, now),
      }));

  const displayFootnote = usePlaceholder ? PLACEHOLDER_EMAILS_FOOTNOTE : footnote;

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
          {loading && !usePlaceholder ? (
            <tr>
              <td colSpan={3}>
                <span className="ds-empty">טוען מיילים...</span>
              </td>
            </tr>
          ) : displayRows.length === 0 ? (
            <tr>
              <td colSpan={3}>
                <span className="ds-empty">אין מיילים unread אחרי סינון noise</span>
              </td>
            </tr>
          ) : (
            displayRows.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="ds-pill ds-pill-soon">{row.source}</span>
                </td>
                <td>{row.subject}</td>
                <td>{row.when}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="ds-footnote">{displayFootnote}</p>
    </section>
  );
}
