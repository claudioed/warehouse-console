/**
 * Local-dev endpoint config for warehouse-console.
 *
 * Mirrors e2e-tests/env.sh's HTTP_PORT map exactly -- keep these two files
 * in sync by hand for now (v1: no shared config-generation step). In a
 * real deployment these become env vars injected at container start
 * (VITE_* build-time or a small /config.json runtime fetch -- Vite envs
 * are baked in at build time, which doesn't fit "one image, many
 * environments"; swap to the runtime-config.json pattern before this
 * goes past a single local/staging deployment).
 */
export const SERVICE_BASE_URL = {
  orderManagement: "http://localhost:8086",
  inventoryStorage: "http://localhost:8082",
  wesWorkPlanning: "http://localhost:8083",
  fulfillmentExecution: "http://localhost:8084",
  workforceManagement: "http://localhost:8085",
  facilityLayout: "http://localhost:8081",
} as const;

/** The BFF lives inside warehouse-ops-agent itself (new routes on its
 *  existing HTTP server, reusing the 5 already-built MCP client ports)
 *  rather than as a separate process -- see the "single BFF" decision in
 *  the MFE architecture proposal. Same port as ops-agent's own API
 *  (8096 in e2e-tests/env.sh), new path prefix. */
export const BFF_BASE_URL = "http://localhost:8096";
