import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ELECTRON_FOOTER_DATA_NOTE,
  FOOTER_WORK_WINDOW,
} from "@/lib/daily-status-copy";
import { getDailyStatusTimezone } from "./timezone";

/** In-app poll every 5 min while daily-status visible (cron: 9-17 Sun-Thu Asia/Bangkok). */
export const DAILY_STATUS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export interface DailyStatusRefreshState {
  lastRefreshedAt: Date | null;
  refreshing: boolean;
  refreshGeneration: number;
  refreshAll: () => Promise<void>;
}

const DEFAULT_STATE: DailyStatusRefreshState = {
  lastRefreshedAt: null,
  refreshing: false,
  refreshGeneration: 0,
  refreshAll: async () => {},
};

const DailyStatusRefreshContext =
  createContext<DailyStatusRefreshState>(DEFAULT_STATE);

function hasElectronAPI(): boolean {
  return typeof window !== "undefined" && "electronAPI" in window;
}

async function syncRemoteSources(): Promise<void> {
  if (!hasElectronAPI()) {
    return;
  }

  const api = window.electronAPI;
  const jobs: Array<Promise<unknown>> = [];

  if (api.calendar?.syncAll) {
    jobs.push(api.calendar.syncAll());
  }
  if (api.gmail?.syncAll) {
    jobs.push(api.gmail.syncAll());
  }

  const [gtAccounts, ttAccounts] = await Promise.all([
    api.googleTasks?.listAccounts?.() ?? Promise.resolve([]),
    api.ticktick?.listAccounts?.() ?? Promise.resolve([]),
  ]);

  if (gtAccounts.length > 0 && api.googleTasks?.sync) {
    jobs.push(api.googleTasks.sync(gtAccounts[0].id));
  }
  if (ttAccounts.length > 0 && api.ticktick?.sync) {
    jobs.push(api.ticktick.sync(ttAccounts[0].id));
  }

  await Promise.allSettled(jobs);
}

export function DailyStatusRefreshProvider({ children }: { children: ReactNode }) {
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshGeneration, setRefreshGeneration] = useState(0);

  const refreshAll = useCallback(async () => {
    if (!hasElectronAPI()) {
      return;
    }

    setRefreshing(true);
    try {
      await syncRemoteSources();
      setLastRefreshedAt(new Date());
      setRefreshGeneration((value) => value + 1);
    } catch (error) {
      console.error("[DailyStatusRefresh] Failed to refresh:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!hasElectronAPI()) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshAll();
    }, DAILY_STATUS_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [refreshAll]);

  useEffect(() => {
    if (!hasElectronAPI()) {
      return;
    }

    const unsubscribe = window.electronAPI.cron.onStatusUpdate(() => {
      setLastRefreshedAt(new Date());
      setRefreshGeneration((value) => value + 1);
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      lastRefreshedAt,
      refreshing,
      refreshGeneration,
      refreshAll,
    }),
    [lastRefreshedAt, refreshing, refreshGeneration, refreshAll],
  );

  return (
    <DailyStatusRefreshContext.Provider value={value}>
      {children}
    </DailyStatusRefreshContext.Provider>
  );
}

export function useDailyStatusRefresh(): DailyStatusRefreshState {
  return useContext(DailyStatusRefreshContext);
}

function formatFooterTimeLabel(
  lastRefreshedAt: Date,
  timeZone: string,
): string {
  const time = lastRefreshedAt.toLocaleTimeString("he-IL", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (timeZone === "Asia/Bangkok") {
    return `${time} בנגקוק`;
  }

  const tzLabel = timeZone.replace(/_/g, " ");
  return `${time} ${tzLabel}`;
}

/**
 * Live HTML footer (2026-09-23 snapshot):
 * `… נתונים נכתבו מחדש {HH:MM} בנגקוק · מתעדכנים כל 5 דק׳ ע״י FocusBoard HTML refresh routine · הדפדפן מרענן כל דקה · …`
 * Electron omits the browser-reload segment (data poll only, no `location.reload`).
 */
export function formatDailyStatusFooter(
  lastRefreshedAt: Date | null,
  timeZone: string = getDailyStatusTimezone(),
): string {
  const tzLabel = timeZone.replace(/_/g, " ");
  if (!lastRefreshedAt) {
    return `FocusBoard · ממתין לריענון ראשון · ${tzLabel} · ${FOOTER_WORK_WINDOW}`;
  }

  const timeLabel = formatFooterTimeLabel(lastRefreshedAt, timeZone);

  return (
    `FocusBoard · נתונים נכתבו מחדש ${timeLabel} · ` +
    `${ELECTRON_FOOTER_DATA_NOTE} · ` +
    `${tzLabel} · ${FOOTER_WORK_WINDOW}`
  );
}
