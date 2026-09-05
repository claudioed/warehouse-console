/**
 * The console-reports envelope, served identically by
 * `GET /console/reports/wms` and `GET /console/reports/wes` on the
 * console-bff inside warehouse-ops-agent.
 *
 * Deliberately section-oriented rather than one flat metric bag: each
 * section names its own upstream context and can degrade on its own, so
 * one sick service costs you one card, never the whole dashboard.
 */

/** Which ui-kit chart primitive renders a section. */
export type ChartKind = "funnel" | "bar" | "line";

export interface ReportSection {
  /** Stable id, e.g. "order-funnel" -- used as the React key. */
  id: string;
  /** Human heading for the card, e.g. "Order Funnel". */
  title: string;
  /** The bounded context this section's numbers came from. */
  sourceContext: string;
  chartKind: ChartKind;
  /**
   * false when this section's upstream is down or erroring. A normal,
   * expected condition -- render the card as unavailable, do not treat it
   * as a failure of the request.
   */
  available: boolean;
  /** Why the section is unavailable; null when `available`. */
  error: string | null;
  /** Projection lag in seconds; null when the source can't report one. */
  freshnessLagSeconds: number | null;
  series: { label: string; value: number }[];
}

export interface ReportResponse {
  /** ISO-8601 bounds of the reporting window actually used. */
  from: string;
  to: string;
  /** ISO-8601 instant the projections were read. */
  generatedAt: string;
  sections: ReportSection[];
}
