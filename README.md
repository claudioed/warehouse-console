# warehouse-console

The React SPA shell for the [warehouse-systems](https://github.com/claudioed?tab=repositories&q=warehouse)
micro-frontend console. Owns routing, top navigation, the shared design system, and two
cross-cutting screens:

- **Operations Overview** (`/`) — a control-tower landing page: a live KPI strip (pick/pack/
  SLAM queue depth, active sites) plus a launchpad grid into every bounded context, following
  established enterprise WMS/ops-dashboard conventions (Manhattan Active WM's shift-start KPI
  row, SAP Fiori's app-tile launchpad, Grafana/Datadog-style stat panels).
- **Order Lifecycle** (`/order-lifecycle`) — traces one order across all four services that
  touch it (order-management → inventory-storage → wes-work-planning → fulfillment-execution)
  by calling the `console-bff` endpoint on `warehouse-ops-agent`.

Everything else (`/order-management`, `/inventory`, `/planning`, `/fulfillment`, `/workforce`,
`/facility`) is a Module Federation remote owned by that bounded context's own repo — this
shell only lazy-loads and hosts them; it never contains their business logic.

## Study project disclaimer

This repository, and every other repository in the `warehouse-systems` set, is a personal
study project exploring Domain-Driven Design, hexagonal architecture, and micro-frontend
composition patterns. It is not production software and has no support guarantees.

## Architecture

- **Module Federation** (`@module-federation/vite`) — this app is the federation *host*;
  each remote is built and deployed independently by its own bounded-context repo.
- **No shared database, ever** — cross-service views (Order Lifecycle) go through each
  service's own REST API via a thin BFF (`console-bff`, hosted inside `warehouse-ops-agent`),
  never a shared DB.
- **`@warehouse/ui-kit`** — the shared design-tokens + component library every remote and
  this shell consume, so the same domain status renders identically everywhere it appears.

## Local development

Requires `@warehouse/ui-kit` checked out as a sibling directory (`../warehouse-ui-kit`,
built at least once) and each remote's own dev server running on its assigned port:

| Remote | Port | Repo |
|---|---|---|
| order-mgmt-mfe | 5181 | order-management |
| inventory-mfe | 5182 | inventory-storage |
| planning-mfe | 5183 | wes-work-planning |
| fulfillment-mfe | 5184 | fulfillment-execution |
| workforce-mfe | 5185 | workforce-management |
| facility-mfe | 5186 | facility-layout |

```bash
# one-time: build the sibling ui-kit
(cd ../warehouse-ui-kit && npm install && npm run build)

npm install
npm run dev          # :5173
npm run typecheck    # tsc -b --noEmit
npm run lint         # oxlint
npm run build

# with the shell + all 6 remotes + all 5 backend services + BFF running:
npm run verify:routes   # headless Playwright smoke check of every route
```

The console's own service base URLs (`src/config.ts`) point at local-dev ports matching
`e2e-tests/env.sh`; swap to a runtime `/config.json` fetch before any multi-environment
deployment (Vite env vars are baked in at build time, which doesn't fit "one image, many
environments").
