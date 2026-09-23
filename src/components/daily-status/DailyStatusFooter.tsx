import {
  formatDailyStatusFooter,
  useDailyStatusRefresh,
} from "./DailyStatusRefreshContext";
import { getDailyStatusTimezone } from "./timezone";

export function DailyStatusFooter() {
  const { lastRefreshedAt, refreshing } = useDailyStatusRefresh();
  const footer = formatDailyStatusFooter(
    lastRefreshedAt,
    getDailyStatusTimezone(),
  );

  return (
    <footer className="ds-footer" data-testid="daily-status-footer">
      {footer}
      {refreshing ? " · מרענן..." : ""}
    </footer>
  );
}
