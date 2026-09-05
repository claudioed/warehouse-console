---
id: getting-started
title: Getting Started
sidebar_label: Getting Started
---

# Getting started

## Prerequisites

`@warehouse/ui-kit` checked out as a sibling directory (`../warehouse-ui-kit`,
built at least once) and, for a full-fleet check, each remote's own dev
server running on its assigned port.

| Remote | Port | Repo |
|---|---|---|
| order-mgmt-mfe | 5181 | order-management |
| inventory-mfe | 5182 | inventory-storage |
| planning-mfe | 5183 | wes-work-planning |
| fulfillment-mfe | 5184 | fulfillment-execution |
| workforce-mfe | 5185 | workforce-management |
| facility-mfe | 5186 | facility-layout |

## Run it

```bash
# one-time: build the sibling ui-kit
(cd ../warehouse-ui-kit && npm install && npm run build)

npm install
npm run dev          # :5173
npm run typecheck    # tsc -b --noEmit
npm run lint         # oxlint
npm run build
```

## Verify

```bash
# with the shell + all 6 remotes + all 5 backend services + BFF running:
npm run verify:routes

# needs only the shell's own dev server -- stubs the console-bff report calls:
npm run verify:dashboards
```

`verify:routes` is a headless Playwright smoke check of every route,
including that client-side navigation never triggers a full-page reload and
that an unknown route renders the app's own "Page not found" screen (not a
server 404).

`verify:dashboards` covers the three states the report screens have to get
right — every section available (charts draw real geometry), one section
`available: false` (that one card degrades, the others still draw), and a
whole-request failure (one dashboard-level error state) — and writes
screenshots to `/tmp/warehouse-console-dashboards`.

## A known gap

The console's own service base URLs (`src/config.ts`) point at local-dev
ports matching `e2e-tests/env.sh`; swap to a runtime `/config.json` fetch
before any multi-environment deployment (Vite env vars are baked in at build
time, which doesn't fit "one image, many environments").
