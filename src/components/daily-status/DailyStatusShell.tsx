import "./daily-status.css";
import { CalendarSection } from "./CalendarSection";
import { DailyQuote } from "./DailyQuote";
import { DailyStatusFooter } from "./DailyStatusFooter";
import { DailyStatusHeader } from "./DailyStatusHeader";
import { EmailsSection } from "./EmailsSection";
import { MetricsStrip } from "./MetricsStrip";
import { NextUpBanner } from "./NextUpBanner";
import { SlackOpenActionsProvider } from "./SlackOpenActionsContext";
import { SlackSection } from "./SlackSection";
import { TasksSections } from "./TasksSections";

export function DailyStatusShell() {
  return (
    <SlackOpenActionsProvider>
    <div className="daily-status" dir="rtl" lang="he" data-testid="daily-status-shell">
      <div className="ds-wrap">
        <DailyStatusHeader />
        <DailyQuote />
        <MetricsStrip />
        <NextUpBanner />
        <div className="ds-main-row">
          <CalendarSection />
          <TasksSections />
        </div>
        <div className="ds-bottom">
          <EmailsSection />
          <SlackSection />
        </div>
        <DailyStatusFooter />
      </div>
    </div>
    </SlackOpenActionsProvider>
  );
}
