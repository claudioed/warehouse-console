/**
 * Shape of `GET /daily-brief` on the console-bff inside
 * warehouse-ops-agent.
 *
 * This endpoint is a zero-argument, multi-site, multi-path control-tower
 * read model that already existed and that nothing in the console used.
 * Every fact is independently nullable BECAUSE the agent gathers them from
 * five different services and degrades per-signal rather than failing the
 * whole brief -- `unavailable` names exactly which upstreams went quiet,
 * which is what lets this screen distinguish "zero" from "unknown".
 */

/** info | warning | critical, ranked in that order by SEVERITY_RANK. */
export type Severity = "info" | "warning" | "critical";

export interface OpenException {
  /** Only "flow_balance_risk" exists today. */
  kind: string;
  siteCode: string;
  pathId: string;
  severity: Severity;
  summary: string;
  /** One line per contributing signal, naming the upstream tool it came
   *  from. Shown on demand rather than up front. */
  evidence: string[];
}

export interface BacklogFact {
  backlogDepth: number;
  wip: number;
  /** The BACKEND's judgement that this is alarming. The console must not
   *  invent its own cutoff -- deciding when a warehouse number is bad is
   *  domain logic and belongs upstream (ADR-0002). */
  overAlarmThreshold: boolean;
}

export interface StaffingFact {
  plannedHeads: number;
  activeHeads: number;
  understaffed: boolean;
}

export interface QueueFact {
  depth: number;
}

export interface StuckTasksFact {
  count: number;
}

export interface PathBrief {
  pathId: string;
  /** PICK | PACK | SLAM -- the process path this lane runs. */
  processPath: string;
  backlog?: BacklogFact | null;
  staffing?: StaffingFact | null;
  queue?: QueueFact | null;
  stuck?: StuckTasksFact | null;
  /** "<service>: <reason>" per upstream that did not answer. */
  unavailable?: string[];
  exceptions?: OpenException[];
}

export interface SiteBrief {
  siteCode: string;
  siteName: string;
  paths: PathBrief[];
}

export interface DailyBrief {
  generatedAt: string;
  sites: SiteBrief[];
  openExceptions: OpenException[];
}

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};
