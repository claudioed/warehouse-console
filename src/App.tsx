import { lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppShell, type NavItem } from "@warehouse/ui-kit";
import { OverviewScreen } from "./features/overview/OverviewScreen";
import { OrderLifecycleScreen } from "./features/order-lifecycle/OrderLifecycleScreen";
import { RemoteBoundary } from "./shell/RemoteBoundary";

const NAV: Omit<NavItem, "active">[] = [
  { id: "overview", label: "Overview", href: "/" },
  { id: "order-lifecycle", label: "Order Lifecycle", href: "/order-lifecycle" },
  { id: "order-mgmt", label: "Orders", href: "/order-management" },
  { id: "inventory", label: "Inventory", href: "/inventory" },
  { id: "planning", label: "Planning", href: "/planning" },
  { id: "fulfillment", label: "Fulfillment", href: "/fulfillment" },
  { id: "workforce", label: "Workforce", href: "/workforce" },
  { id: "facility", label: "Facility", href: "/facility" },
];

// Each lazy() call MUST run exactly once, at module load, not inside a
// component render -- otherwise React remounts the remote (re-triggering
// its Module Federation fetch and losing its internal state) on every
// Shell re-render, which happens on every navigation via useLocation.
// See RemoteBoundary's doc comment for the full rationale.
/* eslint-disable react-refresh/only-export-components */
// @ts-expect-error -- remote module resolved at runtime by Module Federation
const OrdersRemote = lazy(() => import("order_mgmt_mfe/App"));
// @ts-expect-error -- remote module resolved at runtime by Module Federation
const InventoryRemote = lazy(() => import("inventory_mfe/App"));
// @ts-expect-error -- remote module resolved at runtime by Module Federation
const PlanningRemote = lazy(() => import("planning_mfe/App"));
// @ts-expect-error -- remote module resolved at runtime by Module Federation
const FulfillmentRemote = lazy(() => import("fulfillment_mfe/App"));
// @ts-expect-error -- remote module resolved at runtime by Module Federation
const WorkforceRemote = lazy(() => import("workforce_mfe/App"));
// @ts-expect-error -- remote module resolved at runtime by Module Federation
const FacilityRemote = lazy(() => import("facility_mfe/App"));
/* eslint-enable react-refresh/only-export-components */

function Shell() {
  const location = useLocation();
  const nav: NavItem[] = NAV.map((item) => ({
    ...item,
    active: item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href),
  }));

  return (
    <AppShell nav={nav}>
      <Routes>
        <Route path="/" element={<OverviewScreen />} />
        <Route path="/order-lifecycle" element={<OrderLifecycleScreen />} />
        <Route
          path="/order-management/*"
          element={<RemoteBoundary label="Orders" component={OrdersRemote} />}
        />
        <Route
          path="/inventory/*"
          element={<RemoteBoundary label="Inventory" component={InventoryRemote} />}
        />
        <Route
          path="/planning/*"
          element={<RemoteBoundary label="Planning" component={PlanningRemote} />}
        />
        <Route
          path="/fulfillment/*"
          element={<RemoteBoundary label="Fulfillment" component={FulfillmentRemote} />}
        />
        <Route
          path="/workforce/*"
          element={<RemoteBoundary label="Workforce" component={WorkforceRemote} />}
        />
        <Route
          path="/facility/*"
          element={<RemoteBoundary label="Facility" component={FacilityRemote} />}
        />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
