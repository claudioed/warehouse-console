import type { ReactElement } from "react";
import { LaunchTile, useFetch } from "@warehouse/ui-kit";
import { SERVICE_BASE_URL } from "../../config";
import { useDocumentTitle } from "../../shell/useDocumentTitle";

interface QueueDepth {
  taskType: string;
  depth: number;
}

interface Site {
  siteCode: string;
  name: string;
  status: string;
}

const POLL_MS = 30_000;

/**
 * The launchpad, on its own route.
 *
 * It used to sit underneath the landing page's KPI strip, which meant the
 * console shipped two competing navigation surfaces -- a top nav listing
 * every destination and a tile grid listing the same ones again, with the
 * tiles repeating KPI numbers already shown 200px above. SAP Fiori, the
 * pattern the tiles were modelled on, uses a launchpad INSTEAD of a
 * persistent top nav, not alongside it.
 *
 * Here it earns its place: the badges are read at the moment someone is
 * choosing where to go, which is when a live number is decision-relevant.
 */
export function ContextsScreen(): ReactElement {
  useDocumentTitle("Contexts");

  const pick = useFetch<QueueDepth>(
    `${SERVICE_BASE_URL.fulfillmentExecution}/queues/PICK/depth`,
    { pollMs: POLL_MS },
  );
  const sites = useFetch<Site[]>(`${SERVICE_BASE_URL.facilityLayout}/sites`, {
    pollMs: POLL_MS,
  });

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: "var(--wh-font-size-2xl)" }}>
        Bounded contexts
      </h1>
      <p
        style={{
          margin: "var(--wh-space-2) 0 var(--wh-space-5)",
          color: "var(--wh-color-text-muted)",
        }}
      >
        Each context owns and deploys its own screens. This shell only hosts
        them.
      </p>

      <div className="wh-contexts__grid">
        <LaunchTile
          context="cross-service"
          title="Order Lifecycle"
          description="Trace one order's journey across every context, end to end."
          href="/order-lifecycle"
        />
        <LaunchTile
          context="cross-service"
          title="WMS Dashboard"
          description="What & where — order funnel, inventory flow accuracy, catalog growth."
          href="/wms-dashboard"
        />
        <LaunchTile
          context="cross-service"
          title="WES Dashboard"
          description="When & in what order — planning, fulfillment and labor throughput."
          href="/wes-dashboard"
        />
        <LaunchTile
          context="order-management"
          title="Orders"
          description="Intake, allocation state, ship-complete policy."
          href="/order-management"
        />
        <LaunchTile
          context="inventory-storage"
          title="Inventory"
          description="Usable-inventory lookup, chaotic stow, revocable reservations."
          href="/inventory"
        />
        <LaunchTile
          context="wes-work-planning"
          title="Planning"
          description="Continuous release, flow balancing, work-pool telemetry."
          href="/planning"
        />
        <LaunchTile
          context="fulfillment-execution"
          title="Fulfillment"
          description="Pick/pack/SLAM task lifecycle, queue depth, station leases."
          badge={pick.data ? `${pick.data.depth} in PICK` : undefined}
          href="/fulfillment"
        />
        <LaunchTile
          context="workforce-management"
          title="Workforce"
          description="Staffing gap by path -- planned vs active headcount."
          href="/workforce"
        />
        <LaunchTile
          context="facility-layout"
          title="Facility"
          description="Sites, zones, aisles & coded storage slots."
          badge={
            sites.data
              ? `${sites.data.length} site${sites.data.length === 1 ? "" : "s"}`
              : undefined
          }
          href="/facility"
        />
        <LaunchTile
          context="process-path-management"
          title="Process Paths"
          description="The fleet's declared process-path catalogue -- define, revise, deactivate."
          href="/process-path"
        />
      </div>
    </div>
  );
}
