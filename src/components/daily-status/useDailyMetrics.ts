import { useCallback, useEffect, useState } from "react";
import { CLASSIFICATION_GET_EMAILS_MAX_LIMIT } from "@/lib/classification-constants";
import {
  buildMetricsCards,
  countTaskDueBuckets,
  countUnreadMailByAccount,
  EMPTY_METRICS,
  mergeAccountCounts,
  type MetricCard,
} from "./metrics";
import { useSlackOpenActions } from "./SlackOpenActionsContext";
import { useDailyStatusRefresh } from "./DailyStatusRefreshContext";

interface NormalizedTask {
  dueAt: string | null;
  completed: boolean;
}

function normalizeGoogleTasks(
  tasks: Array<{ due?: string | null; dueAt?: string | null; status: string }>
): NormalizedTask[] {
  return tasks.map((task) => ({
    dueAt: task.due ?? task.dueAt ?? null,
    completed: task.status === "completed",
  }));
}

function normalizeTickTickTasks(
  tasks: Array<{ dueDate?: string | null; status: string | number }>
): NormalizedTask[] {
  return tasks.map((task) => ({
    dueAt: task.dueDate ?? null,
    completed: task.status === "1" || task.status === 1,
  }));
}

export function useDailyMetrics(): MetricCard[] {
  const [metrics, setMetrics] = useState<MetricCard[]>(EMPTY_METRICS);
  const { refreshGeneration } = useDailyStatusRefresh();
  const { totalOpen, byWorkspace, metricsHintSuffix } = useSlackOpenActions();

  const refresh = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.calendar?.getTodayEvents) {
      return;
    }

    try {
      const [
        remainingMeetings,
        calendarSummary,
        googleTasks,
        ticktickTasks,
        emails,
        gmailAccounts,
      ] = await Promise.all([
        api.calendar.getTodayEvents(),
        api.calendar.getTodaySummary(),
        api.googleTasks.listTasks(),
        api.ticktick.listTasks(),
        api.classification.getEmails({ limit: CLASSIFICATION_GET_EMAILS_MAX_LIMIT }),
        api.gmail.listAccounts(),
      ]);

      const accountLabels = new Map(
        gmailAccounts.map((account) => [account.id, account.displayName])
      );
      const accountList = gmailAccounts.map((account) => ({
        label: account.displayName,
      }));

      const taskCounts = countTaskDueBuckets([
        ...normalizeGoogleTasks(googleTasks),
        ...normalizeTickTickTasks(ticktickTasks),
      ]);

      const unreadByAccount = mergeAccountCounts(
        accountList,
        countUnreadMailByAccount(emails, accountLabels)
      );

      const calendarByAccount = mergeAccountCounts(
        accountList,
        calendarSummary.byAccount
      );

      const slackByAccount =
        byWorkspace.length > 0
          ? byWorkspace
          : accountList.map((account) => ({
              label: account.label,
              count: 0,
            }));

      setMetrics(
        buildMetricsCards({
          remainingMeetings: remainingMeetings.length,
          calendarSummary: {
            totalToday: calendarSummary.totalToday,
            byAccount: calendarByAccount,
          },
          taskCounts,
          unreadByAccount,
          slackOpen: totalOpen,
          slackByAccount,
          slackHintSuffix: metricsHintSuffix,
        })
      );
    } catch (error) {
      console.error("[useDailyMetrics] Failed to refresh metrics:", error);
    }
  }, [byWorkspace, metricsHintSuffix, totalOpen]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshGeneration]);

  return metrics;
}
