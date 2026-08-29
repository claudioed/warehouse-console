import { useState, useEffect } from "react";
import { KpiStat, LaunchTile } from "@warehouse/ui-kit";
import { SERVICE_BASE_URL } from "../../config";

/**
 * The console's landing page: a KPI control-tower strip plus a launchpad
 * grid into each bounded context, following the two conventions every
 * major WMS/ops console converges on independently --
 *
 *  - Manhattan Active WM's home dashboard: a top row of live KPI tiles
 *    (open orders, exceptions, backlog) with threshold-driven color, the
 *    first thing a supervisor sees at the start of a shift.
 *  - SAP Fiori's launchpad: a flat grid of app tiles, one per business
 *    function, each carrying its own live badge -- the standard SAP
 *    pattern once you have more than a handful of apps/contexts (we have
 *    6 remotes, squarely in "needs a launchpad, not just a top nav"
 *    territory).
 *
 * Numbers here are fetched live from each service's own already-existing
 * REST endpoint (no new backend surface). A metric intentionally shows
 * "—" rather than a fabricated number when its endpoint isn't reachable
 * or needs parameters this screen doesn't have yet (e.g. workforce's
 * staffing-gap requires a specific building/shift) -- never invent a
 * number to fill a tile.
 */

interface QueueDepth {
  taskType: string;
  depth: number;
}

interface Site {
  siteCode: string;
  name: string;
  status: string;
}

function useSimpleFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return { data, error };
}

export function OverviewScreen() {
  const pick = useSimpleFetch<QueueDepth>(`${SERVICE_BASE_URL.fulfillmentExecution}/queues/PICK/depth`);
  const pack = useSimpleFetch<QueueDepth>(`${SERVICE_BASE_URL.fulfillmentExecution}/queues/PACK/depth`);
  const slam = useSimpleFetch<QueueDepth>(`${SERVICE_BASE_URL.fulfillmentExecution}/queues/SLAM/depth`);
  const sites = useSimpleFetch<Site[]>(`${SERVICE_BASE_URL.facilityLayout}/sites`);

  const pickTone = pick.data && pick.data.depth > 20 ? "danger" : pick.data && pick.data.depth > 5 ? "warning" : "success";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--wh-space-6)" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "var(--wh-font-size-2xl)" }}>Operations Overview</h1>
        <p style={{ margin: "var(--wh-space-2) 0 0", color: "var(--wh-color-text-muted)" }}>
          Live signal from every bounded context. Click a tile to drill into that service's screen.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "var(--wh-space-4)",
        }}
      >
        <KpiStat
          label="Pick queue"
          value={pick.error ? "—" : (pick.data?.depth ?? "…")}
          caption="pending PICK tasks"
          tone={pick.error ? "neutral" : pick.data ? pickTone : "neutral"}
          href="/fulfillment"
        />
        <KpiStat
          label="Pack queue"
          value={pack.error ? "—" : (pack.data?.depth ?? "…")}
          caption="pending PACK tasks"
          href="/fulfillment"
        />
        <KpiStat
          label="SLAM queue"
          value={slam.error ? "—" : (slam.data?.depth ?? "…")}
          caption="pending SLAM tasks"
          href="/fulfillment"
        />
        <KpiStat
          label="Active sites"
          value={sites.error ? "—" : (sites.data?.length ?? "…")}
          caption="registered facilities"
          href="/facility"
        />
      </div>

      <div>
        <h2 style={{ margin: "0 0 var(--wh-space-4)", fontSize: "var(--wh-font-size-lg)" }}>Bounded contexts</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--wh-space-4)",
          }}
        >
          <LaunchTile
            context="cross-service"
            title="Order Lifecycle"
            description="Trace one order's journey across every context, end to end."
            href="/order-lifecycle"
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
            badge={sites.data ? `${sites.data.length} site${sites.data.length === 1 ? "" : "s"}` : undefined}
            href="/facility"
          />
        </div>
      </div>
    </div>
  );
}
