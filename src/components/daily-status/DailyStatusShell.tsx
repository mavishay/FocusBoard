import "./daily-status.css";
import { CalendarSection } from "./CalendarSection";
import { DailyStatusFooter } from "./DailyStatusFooter";
import { DailyStatusHeader } from "./DailyStatusHeader";
import { EmailsSection } from "./EmailsSection";
import { MetricsStrip } from "./MetricsStrip";
import { NextUpBanner } from "./NextUpBanner";
import { SlackSection } from "./SlackSection";
import { TasksSections } from "./TasksSections";

export function DailyStatusShell() {
  return (
    <div className="daily-status" dir="rtl" lang="he" data-testid="daily-status-shell">
      <div className="ds-wrap">
        <DailyStatusHeader />
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
  );
}
