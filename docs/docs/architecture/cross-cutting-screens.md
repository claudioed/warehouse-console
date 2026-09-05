---
id: cross-cutting-screens
title: Cross-cutting Screens
sidebar_label: Cross-cutting Screens
---

# Cross-cutting screens

Two screens exist because no single bounded-context remote can answer them
on its own: **Order Lifecycle** and the **WMS/WES report dashboards**. Both
are answered by `console-bff`, a set of routes added to `warehouse-ops-agent`'s
existing HTTP server (see that repo's ADR-0002 and ADR-0003) rather than a
separate BFF process or a shared database.

```mermaid
graph LR
  Console["warehouse-console"]
  BFF["console-bff (in warehouse-ops-agent)"]
  OM["order-management"]
  IS["inventory-storage"]
  WP["wes-work-planning"]
  FE["fulfillment-execution"]

  Console -->|"GET /console/order-lifecycle/:id"| BFF
  Console -->|"GET /console/reports/{wms,wes}"| BFF
  BFF --> OM
  BFF --> IS
  BFF --> WP
  BFF --> FE
```

## Order Lifecycle

Traces one order across the four services that touch it: order-management →
inventory-storage → wes-work-planning → fulfillment-execution. The console
renders whatever stage/state shape the BFF returns; it does not reinterpret
domain meaning (this shell is a downstream **Conformist** to the BFF's
Published Language).

## WMS / WES dashboards

Both read one section-oriented envelope
(`GET /console/reports/{wms,wes}?from=&to=`, default trailing 24h) and render
each section with the ui-kit's chart primitives, chosen by the section's own
`chartKind`.

These are **eventually-consistent analytical projections, not live reads** —
every card carries a `FreshnessBadge` so staleness is shown, never hidden. A
section whose upstream is degraded arrives as `available: false` and renders
as a single "data unavailable" card; the rest of the dashboard still shows
its real numbers. Only a whole-request failure produces a dashboard-level
error state.

This graceful-degradation contract is exercised end-to-end by
`npm run verify:dashboards` (see [Getting started](../overview/getting-started.md)),
which drives all three states — fully available, one section degraded, and a
whole-request failure — against a stubbed `console-bff`.
