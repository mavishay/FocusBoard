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
  formatSlackMetricsCutoffHint,
  formatSlackWorkspaceFooter,
} from "./format-slack-when";
import { useDailyStatusRefresh } from "./DailyStatusRefreshContext";

export interface SlackOpenActionRow {
  workspace: string;
  text: string;
  link: string;
  ts: string;
}

export interface SlackOpenActionsState {
  actions: SlackOpenActionRow[];
  totalOpen: number;
  byWorkspace: Array<{ label: string; count: number }>;
  footnote: string;
  metricsHintSuffix: string;
  connected: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const EMPTY_STATE: SlackOpenActionsState = {
  actions: [],
  totalOpen: 0,
  byWorkspace: [],
  footnote: "ממתין לחיבור Slack · הוסף workspace ב-Settings",
  metricsHintSuffix: "ממתין לחיבור Slack",
  connected: false,
  loading: false,
  refresh: async () => {},
};

const SlackOpenActionsContext = createContext<SlackOpenActionsState>(EMPTY_STATE);

function hasSlackApi(): boolean {
  return typeof window !== "undefined" && Boolean(window.electronAPI?.slack);
}

export function SlackOpenActionsProvider({ children }: { children: ReactNode }) {
  const { refreshGeneration } = useDailyStatusRefresh();
  const [actions, setActions] = useState<SlackOpenActionRow[]>([]);
  const [totalOpen, setTotalOpen] = useState(0);
  const [byWorkspace, setByWorkspace] = useState<
    Array<{ label: string; count: number }>
  >([]);
  const [footnote, setFootnote] = useState(EMPTY_STATE.footnote);
  const [metricsHintSuffix, setMetricsHintSuffix] = useState(
    EMPTY_STATE.metricsHintSuffix,
  );
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!hasSlackApi()) {
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.slack.getOpenActions();
      setActions(result.actions);
      setTotalOpen(result.totalOpen);
      setByWorkspace(result.byWorkspace);
      setConnected(result.connected);
      setFootnote(
        formatSlackWorkspaceFooter(
          result.byWorkspace,
          result.cutoffIso,
          result.connected,
        ),
      );
      setMetricsHintSuffix(
        result.connected
          ? formatSlackMetricsCutoffHint(result.cutoffIso)
          : "ממתין לחיבור Slack",
      );
    } catch (error) {
      console.error("[SlackOpenActions] Failed to refresh:", error);
      setActions([]);
      setTotalOpen(0);
      setByWorkspace([]);
      setConnected(false);
      setFootnote("שגיאה בטעינת Slack · בדוק חיבור ב-Settings");
      setMetricsHintSuffix("ממתין לחיבור Slack");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshGeneration]);

  const value = useMemo(
    () => ({
      actions,
      totalOpen,
      byWorkspace,
      footnote,
      metricsHintSuffix,
      connected,
      loading,
      refresh,
    }),
    [
      actions,
      totalOpen,
      byWorkspace,
      footnote,
      metricsHintSuffix,
      connected,
      loading,
      refresh,
    ],
  );

  return (
    <SlackOpenActionsContext.Provider value={value}>
      {children}
    </SlackOpenActionsContext.Provider>
  );
}

export function useSlackOpenActions(): SlackOpenActionsState {
  return useContext(SlackOpenActionsContext);
}
