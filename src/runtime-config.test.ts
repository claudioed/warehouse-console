import { afterEach, describe, expect, it, vi } from "vitest";
import { loadRuntimeConfig, validateRuntimeConfig } from "./runtime-config";

afterEach(() => {
  delete window.__WAREHOUSE_CONFIG__;
});

describe("validateRuntimeConfig", () => {
  it("accepts an HTTP API origin and normalizes the trailing slash", () => {
    expect(validateRuntimeConfig({ apiOrigin: "http://localhost:8000/" })).toEqual({
      apiOrigin: "http://localhost:8000",
    });
  });

  it("accepts an HTTPS API origin", () => {
    expect(validateRuntimeConfig({ apiOrigin: "https://api.example.test" })).toEqual({
      apiOrigin: "https://api.example.test",
    });
  });

  it.each([
    ["a non-object", "nope"],
    ["null", null],
    ["a missing apiOrigin", {}],
    ["an empty apiOrigin", { apiOrigin: "   " }],
    ["a non-string apiOrigin", { apiOrigin: 8000 }],
    ["a relative apiOrigin", { apiOrigin: "/api" }],
    ["a non-HTTP scheme", { apiOrigin: "ftp://api.example.test" }],
    ["an origin carrying a path", { apiOrigin: "http://localhost:8000/api" }],
    ["an origin carrying credentials", { apiOrigin: "http://u:p@localhost:8000" }],
    ["an origin carrying a query", { apiOrigin: "http://localhost:8000/?a=1" }],
  ])("rejects %s", (_label, value) => {
    expect(() => validateRuntimeConfig(value)).toThrow();
  });
});

describe("loadRuntimeConfig", () => {
  it("fetches config.json without caching and publishes the validated contract", async () => {
    const fetchConfig = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ apiOrigin: "https://api.example.test/" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(loadRuntimeConfig(fetchConfig)).resolves.toEqual({
      apiOrigin: "https://api.example.test",
    });
    expect(fetchConfig).toHaveBeenCalledWith("/config.json", { cache: "no-store" });
    expect(window.__WAREHOUSE_CONFIG__).toEqual({
      apiOrigin: "https://api.example.test",
    });
  });

  // The console is served by nginx with an SPA fallback: a missing /config.json
  // returns index.html with a 200, not a 404. Without an explicit ok/content
  // check the app would try to JSON.parse HTML and fail with a confusing
  // syntax error instead of naming the real problem.
  it("rejects an unsuccessful config response without publishing it", async () => {
    const fetchConfig = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ apiOrigin: "https://api.example.test" }), {
        status: 503,
      }),
    );

    await expect(loadRuntimeConfig(fetchConfig)).rejects.toThrow(
      "Unable to load runtime configuration (HTTP 503)",
    );
    expect(window.__WAREHOUSE_CONFIG__).toBeUndefined();
  });

  it("rejects a config response that is not JSON without publishing it", async () => {
    const fetchConfig = vi.fn().mockResolvedValue(
      new Response("<!doctype html><title>console</title>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    await expect(loadRuntimeConfig(fetchConfig)).rejects.toThrow(
      "Runtime configuration must be JSON",
    );
    expect(window.__WAREHOUSE_CONFIG__).toBeUndefined();
  });
});
