import type { ReactElement } from "react";
import { CONSOLE_REPORTS_URL } from "../../config";
import { ReportDashboard } from "../reports/ReportDashboard";

/**
 * The WMS half of the console's analytics: the *what and where* of the
 * warehouse -- what was ordered, where inventory actually is, how the
 * catalog is growing. Its three sections come from order-management,
 * inventory-storage and (via the BFF) the catalog projection.
 *
 * Lives in the shell rather than any one remote for the same reason
 * Order Lifecycle does: it reads across bounded contexts, and no single
 * context owns the cross-cutting picture.
 */
export function WmsDashboardScreen(): ReactElement {
  return (
    <ReportDashboard
      title="WMS Dashboard"
      subtitle="What & where: inventory, orders, catalog. Eventually-consistent projections — each card shows how far behind it is."
      url={CONSOLE_REPORTS_URL.wms}
    />
  );
}
