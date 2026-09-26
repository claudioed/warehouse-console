# Micro-frontend remote pitfalls (console-side)

Companion to CLAUDE.md's Module Federation section — these are pitfalls
this shell has already hit that belong to the remote-hosting side of the
contract, not covered elsewhere in this repo's docs yet.

## 1. `vite.config.ts` in a remote must stay in object form

If a remote's `vite.config.ts` is ever converted to the callback form
(`defineConfig(({ command }) => ({...}))`) to compute a deployment `base`,
that remote's `vitest.config.ts` — which does `mergeConfig(viteConfig,
defineConfig({...}))` — throws `Error: Cannot merge config in form of
callback` and kills its entire test suite. This shell only ever consumes
remotes as built artifacts, but when debugging "why did this remote's CI
`web` job go red on an unrelated change," check for this first before
assuming the shell's own wiring broke.

## 2. A remote's `remoteEntry.js` being tiny and relative is correct

A built remote's `dist/remoteEntry.js` under a `/mfes/<context>/` base is a
~144-byte file containing a RELATIVE re-export
(`./assets/virtual_mf-REMOTE_ENTRY_ID...js`), not an absolute
`/mfes/<context>/`-prefixed import. That is expected — `dist/index.html`
carries the absolute URLs, and every JS chunk resolves relative to
wherever `remoteEntry.js` was actually fetched from (origin-relative
resolution, via `new URL("../" + e, import.meta.url)`), which is exactly
what a path-mounted remote needs. If a remote "isn't loading" and the
`remoteEntry.js` for it looks suspiciously small/relative, that is NOT the
bug — check the actual fetched URL and the browser console's network tab
instead of "fixing" the remote's `base` config.

## 3. Selector collisions mean the wrong pod can answer a probe

Every backend service chart's `selectorLabels` helper historically emitted
only `app.kubernetes.io/name` + `app.kubernetes.io/instance`, identical
across a service's OLTP/MCP/projector/reports pods — so a request routed
"to" a service's OLTP endpoint could be answered by its reports pod
instead (verified live via response headers). This has been fixed
fleet-wide (charts now scope by `app.kubernetes.io/component` too, and
`warehouse-infra`'s CI runs a selector-collision conformance check), but
if a console screen shows implausible/stale data from a specific backend
and everything else checks out, confirm which actual pod answered via
`kubectl get endpointslices -l kubernetes.io/service-name=<svc>` before
assuming this shell's fetch/caching logic is at fault.

## 4. The localhost edge is two independent gateways, not one

`http://localhost` (Nginx) serves this shell and every remote's static
assets at `/mfes/<context>/`; `http://localhost:8000` (Kong) serves every
backend REST API at `/api/<context>`. Neither proxies to the other — this
is a deliberate, reviewed split (`warehouse-infra/docs/exposure/
localhost-edge-topology.md`), not a gap. The `apiOrigin` that `src/runtime-config.ts` reads from
`/config.json` (and `src/config.ts` builds every API URL from) must point at
the Kong origin, never at Nginx's.
