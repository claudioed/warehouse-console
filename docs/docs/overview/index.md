---
id: index
title: Overview
sidebar_label: Overview
---

# Warehouse Console

The React SPA shell for the `warehouse-systems` micro-frontend fleet. It owns
routing, top navigation, the shared design system, and four cross-cutting
screens that no single bounded context owns:

- **Operations Overview** (`/`) — a control-tower landing page: a live KPI
  strip plus a launchpad grid into every bounded context.
- **Order Lifecycle** (`/order-lifecycle`) — traces one order across the four
  services that touch it (order-management → inventory-storage →
  wes-work-planning → fulfillment-execution) via `console-bff`.
- **WMS Dashboard** (`/wms-dashboard`) — the *what & where* of the warehouse:
  order funnel, inventory flow accuracy, catalog growth.
- **WES Dashboard** (`/wes-dashboard`) — the *when & in what order*: planning
  throughput, fulfillment throughput, labor management and performance.

Everything else (`/order-management`, `/inventory`, `/planning`,
`/fulfillment`, `/workforce`, `/facility`) is a Module Federation **remote**
owned and deployed by that bounded context's own repo — this shell only
lazy-loads and hosts them; it never contains their business logic.

## Study project disclaimer

This repository, and every other repository in the `warehouse-systems` set,
is a personal study project exploring Domain-Driven Design, hexagonal
architecture, and micro-frontend composition patterns. It is not production
software and has no support guarantees.

## Where to go next

- [Getting started](./getting-started.md) — local dev setup, the remote port
  map, and the verification scripts.
- [Module Federation](../architecture/module-federation.md) — how the host/remote
  wiring works and the rules for lazy-loading a remote safely.
- [Cross-cutting screens](../architecture/cross-cutting-screens.md) — how Order
  Lifecycle and the WMS/WES dashboards read from `console-bff`.
- [Context map](../ecosystem/context-map.md) — how this shell fits among the six
  bounded-context services and `warehouse-ops-agent`.
