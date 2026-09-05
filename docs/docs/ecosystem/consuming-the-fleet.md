---
id: consuming-the-fleet
title: Consuming the fleet
sidebar_label: Consuming the fleet
---

# Consuming the fleet

If you are adding a new remote to the console, or changing how an existing
one is hosted, here is what this shell expects from a bounded-context repo.

## To be hosted as a remote

1. A Vite + `@module-federation/vite` **remote** config exposing an
   `./App` entry, built and served independently (its own `package.json`,
   build, and dev server).
2. A stable dev port, added to the port table in
   [Getting started](../overview/getting-started.md).
3. `react`, `react-dom`, `react-router-dom`, and `@warehouse/ui-kit` declared
   as shared singletons with matching version ranges — a mismatch fails
   loudly rather than double-loading React.
4. No dependency on any other bounded context's storage or API from inside
   the remote — a remote talks only to its own service's REST API.

Once those are in place, this shell adds one `lazy()` import at module scope
in `App.tsx`, a route, and a nav/launchpad entry. See
[Module Federation](../architecture/module-federation.md) for the exact rule
around where `lazy()` may be called.

## To back a cross-cutting screen

Order Lifecycle and the WMS/WES dashboards are answered by `console-bff`
inside `warehouse-ops-agent`, not by this shell directly. A service
participates in those screens by being one of the endpoints `console-bff`
fans out to — that wiring lives in `warehouse-ops-agent`, not here. See
[Cross-cutting screens](../architecture/cross-cutting-screens.md).
