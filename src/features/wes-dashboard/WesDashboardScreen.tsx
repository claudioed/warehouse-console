import type { ReactElement } from "react";
import { CONSOLE_REPORTS_URL } from "../../config";
import { ReportDashboard } from "../reports/ReportDashboard";

/**
 * The WES half of the console's analytics: the *when and in what order*
 * of the warehouse -- how work was planned, released, executed, and
 * staffed. Its four sections come from wes-work-planning,
 * fulfillment-execution and workforce-management.
 */
export function WesDashboardScreen(): ReactElement {
  return (
    <ReportDashboard
      title="WES Dashboard"
      subtitle="When & in what order: planning, fulfillment, labor. Eventually-consistent projections — each card shows how far behind it is."
      url={CONSOLE_REPORTS_URL.wes}
    />
  );
}
