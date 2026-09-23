export interface SlackOpenAction {
  workspace: string;
  text: string;
  link: string;
  ts: string;
}

export interface SlackWorkspaceCount {
  label: string;
  count: number;
}

export interface SlackOpenActionsResult {
  actions: SlackOpenAction[];
  totalOpen: number;
  byWorkspace: SlackWorkspaceCount[];
  cutoffIso: string | null;
  scannedAt: string;
  connected: boolean;
}

export interface SlackSettings {
  cutoffIso: string | null;
  excludedSenders: string[];
}
