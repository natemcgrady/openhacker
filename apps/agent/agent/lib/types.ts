export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type FindingCategory =
  | "dependency"
  | "injection"
  | "authz"
  | "ssrf"
  | "secrets"
  | "xss"
  | "deserialization"
  | "other";

export type Target = {
  id: string;
  name: string;
  /** "owner/name" on GitHub. */
  repo: string;
  branch: string;
  provider: "github";
  hasToken: boolean;
  autoRemediate: boolean;
  createdAt: string;
  lastScanAt?: string;
  lastScanStatus?: "ok" | "error";
  lastScanError?: string;
};

export type Finding = {
  id: string;
  targetId: string;
  title: string;
  severity: Severity;
  category: FindingCategory;
  packageName?: string;
  installedVersion?: string;
  advisoryIds?: string[];
  location?: { file: string; startLine?: number; endLine?: number; symbol?: string };
  proof: { status: "proven" | "likely" | "unconfirmed"; evidence?: string; poc?: string };
  remediation?: { summary: string; fixedVersion?: string; prUrl?: string };
  status: "open" | "triaged" | "fixed" | "ignored" | "false_positive";
  references?: string[];
  firstSeen: string;
  lastSeen: string;
};

export type Settings = {
  /** Gateway model id used by the eve agent for deep analysis. */
  model: string;
  autoRemediate: boolean;
  integrations: {
    github: { connected: boolean };
    hackerone: { connected: boolean; handle?: string };
  };
};

export const DEFAULT_SETTINGS: Settings = {
  model: "anthropic/claude-sonnet-4.6",
  autoRemediate: false,
  integrations: {
    github: { connected: false },
    hackerone: { connected: false },
  },
};
