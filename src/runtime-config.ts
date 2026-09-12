/**
 * Runtime configuration for the console shell.
 *
 * One console image has to work in more than one environment, so the API
 * location cannot be a build-time constant (the long-standing gap noted in
 * config.ts). Instead nginx serves a small `/config.json` next to the bundle,
 * the shell fetches it before mounting, and publishes the validated result on
 * `window.__WAREHOUSE_CONFIG__` — which every Module Federation remote reads
 * to build its own API base.
 *
 * Validation is deliberately strict and fail-fast. A console that boots with a
 * malformed or missing API origin would render an empty, silently-broken UI;
 * far better to refuse to start and say why.
 */
export interface WarehouseConfig {
  /** Scheme + host + port ONLY, no trailing slash, e.g. "http://localhost:8000". */
  apiOrigin: string;
}

declare global {
  interface Window {
    __WAREHOUSE_CONFIG__?: WarehouseConfig;
  }
}

export function validateRuntimeConfig(value: unknown): WarehouseConfig {
  if (typeof value !== "object" || value === null) {
    throw new Error("Runtime configuration must be an object");
  }

  const apiOrigin = Reflect.get(value, "apiOrigin");
  if (typeof apiOrigin !== "string" || apiOrigin.trim() === "") {
    throw new Error("Runtime configuration apiOrigin must be a non-empty string");
  }

  let parsed: URL;
  try {
    parsed = new URL(apiOrigin);
  } catch {
    throw new Error("Runtime configuration apiOrigin must be an absolute URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Runtime configuration apiOrigin must use HTTP or HTTPS");
  }

  // An origin carrying a path/query/credentials would be silently dropped when
  // remotes append their own "/api/<context>" suffix, so reject it outright
  // rather than quietly ignoring the extra part.
  if (
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error("Runtime configuration apiOrigin must contain only an origin");
  }

  return { apiOrigin: parsed.origin };
}

export async function loadRuntimeConfig(
  fetchConfig: typeof fetch = fetch,
): Promise<WarehouseConfig> {
  const response = await fetchConfig("/config.json", { cache: "no-store" });

  // The console is served by nginx with an SPA fallback, so a MISSING
  // /config.json comes back as index.html with a 200 rather than a 404.
  // Without both of these checks the app would try to JSON.parse HTML and
  // fail with a confusing syntax error instead of naming the real problem.
  if (!response.ok) {
    throw new Error(`Unable to load runtime configuration (HTTP ${response.status})`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    throw new Error(
      `Runtime configuration must be JSON, received "${contentType || "no content type"}" ` +
        "— /config.json is probably missing and nginx served the SPA fallback",
    );
  }

  const config = validateRuntimeConfig(await response.json());
  window.__WAREHOUSE_CONFIG__ = config;
  return config;
}
