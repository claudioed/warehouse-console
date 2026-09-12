/**
 * Endpoint configuration for warehouse-console.
 *
 * One console image has to serve more than one environment, so these are
 * resolved at RUNTIME from `window.__WAREHOUSE_CONFIG__.apiOrigin` (published
 * by runtime-config.ts from nginx's /config.json before the app mounts)
 * rather than baked in at build time. This closes the long-standing
 * "one image is only good for the environment it was built for" gap.
 *
 * In the kind cluster the fleet deliberately splits its two edges onto two
 * independent host entrypoints, and neither proxies to the other:
 *
 *   http://localhost        -> Nginx web gateway -> this shell + the remotes
 *   http://localhost:8000   -> Kong              -> every bounded context API
 *
 * So `apiOrigin` is a genuinely different origin from the page, and Kong
 * carries the matching CORS policy. Every context is addressed uniformly as
 * `<apiOrigin>/api/<context>`.
 *
 * In Vite development each service is still reached directly on its own port,
 * matching e2e-tests/env.sh's HTTP_PORT map.
 */
import type { WarehouseConfig } from "./runtime-config";

export interface ServiceBaseUrls {
  orderManagement: string;
  inventoryStorage: string;
  wesWorkPlanning: string;
  fulfillmentExecution: string;
  workforceManagement: string;
  facilityLayout: string;
}

/** Kong's path prefix for each bounded context. */
const API_PATHS: Record<keyof ServiceBaseUrls, string> = {
  orderManagement: "/api/order-management",
  inventoryStorage: "/api/inventory-storage",
  wesWorkPlanning: "/api/wes-work-planning",
  fulfillmentExecution: "/api/fulfillment-execution",
  workforceManagement: "/api/workforce-management",
  facilityLayout: "/api/facility-layout",
};

/** Standalone dev ports, mirroring e2e-tests/env.sh's HTTP_PORT map. */
const DEV_BASE_URLS: ServiceBaseUrls = {
  orderManagement: "http://localhost:8086",
  inventoryStorage: "http://localhost:8082",
  wesWorkPlanning: "http://localhost:8083",
  fulfillmentExecution: "http://localhost:8084",
  workforceManagement: "http://localhost:8085",
  facilityLayout: "http://localhost:8081",
};

const BFF_API_PATH = "/api/warehouse-ops-agent";
const DEV_BFF_BASE_URL = "http://localhost:8096";

const MISSING_ORIGIN = "window.__WAREHOUSE_CONFIG__.apiOrigin is required in production";

function apiOriginOf(
  runtimeConfig: Partial<WarehouseConfig>,
  isProduction: boolean,
): string | undefined {
  const apiOrigin = runtimeConfig.apiOrigin?.replace(/\/+$/, "");
  if (!apiOrigin) {
    // Falling back to a developer port in a real deployment would leave the
    // console silently talking to nothing, so refuse to start instead.
    if (isProduction) {
      throw new Error(MISSING_ORIGIN);
    }
    return undefined;
  }
  return apiOrigin;
}

export function resolveServiceBaseUrls(
  runtimeConfig: Partial<WarehouseConfig>,
  isProduction: boolean,
): ServiceBaseUrls {
  const apiOrigin = apiOriginOf(runtimeConfig, isProduction);
  if (apiOrigin === undefined) {
    return DEV_BASE_URLS;
  }
  // Built explicitly rather than via Object.fromEntries: that returns a
  // string-index signature which does not structurally satisfy ServiceBaseUrls,
  // so it would need an unsound double cast to compile.
  return {
    orderManagement: `${apiOrigin}${API_PATHS.orderManagement}`,
    inventoryStorage: `${apiOrigin}${API_PATHS.inventoryStorage}`,
    wesWorkPlanning: `${apiOrigin}${API_PATHS.wesWorkPlanning}`,
    fulfillmentExecution: `${apiOrigin}${API_PATHS.fulfillmentExecution}`,
    workforceManagement: `${apiOrigin}${API_PATHS.workforceManagement}`,
    facilityLayout: `${apiOrigin}${API_PATHS.facilityLayout}`,
  };
}

export function resolveBffBaseUrl(
  runtimeConfig: Partial<WarehouseConfig>,
  isProduction: boolean,
): string {
  const apiOrigin = apiOriginOf(runtimeConfig, isProduction);
  return apiOrigin === undefined ? DEV_BFF_BASE_URL : `${apiOrigin}${BFF_API_PATH}`;
}

const runtimeConfig = window.__WAREHOUSE_CONFIG__ ?? {};

export const SERVICE_BASE_URL: ServiceBaseUrls = resolveServiceBaseUrls(
  runtimeConfig,
  import.meta.env.PROD,
);

/** The BFF lives inside warehouse-ops-agent itself (new routes on its
 *  existing HTTP server, reusing the 5 already-built MCP client ports)
 *  rather than as a separate process -- see the "single BFF" decision in
 *  the MFE architecture proposal. */
export const BFF_BASE_URL: string = resolveBffBaseUrl(runtimeConfig, import.meta.env.PROD);

/** The two analytical report endpoints backing the WMS and WES dashboards.
 *  Both answer the same envelope shape (see features/reports/types.ts) and
 *  both take optional `?from=&to=` (default: trailing 24h). These are
 *  eventually-consistent projections, not live reads -- every section
 *  carries its own freshness lag, which the dashboards surface rather than
 *  hide. */
export const CONSOLE_REPORTS_URL = {
  wms: `${BFF_BASE_URL}/console/reports/wms`,
  wes: `${BFF_BASE_URL}/console/reports/wes`,
} as const;
