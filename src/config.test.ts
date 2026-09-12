import { describe, expect, it } from "vitest";
import { resolveServiceBaseUrls, resolveBffBaseUrl } from "./config";

describe("resolveServiceBaseUrls", () => {
  it("builds every context's API base under the runtime API origin", () => {
    expect(resolveServiceBaseUrls({ apiOrigin: "http://localhost:8000" }, true)).toEqual({
      orderManagement: "http://localhost:8000/api/order-management",
      inventoryStorage: "http://localhost:8000/api/inventory-storage",
      wesWorkPlanning: "http://localhost:8000/api/wes-work-planning",
      fulfillmentExecution: "http://localhost:8000/api/fulfillment-execution",
      workforceManagement: "http://localhost:8000/api/workforce-management",
      facilityLayout: "http://localhost:8000/api/facility-layout",
    });
  });

  it("fails loudly when a production build has no runtime API origin", () => {
    expect(() => resolveServiceBaseUrls({}, true)).toThrow(
      "window.__WAREHOUSE_CONFIG__.apiOrigin is required in production",
    );
  });

  it("retains the per-service dev ports in Vite development", () => {
    expect(resolveServiceBaseUrls({}, false)).toEqual({
      orderManagement: "http://localhost:8086",
      inventoryStorage: "http://localhost:8082",
      wesWorkPlanning: "http://localhost:8083",
      fulfillmentExecution: "http://localhost:8084",
      workforceManagement: "http://localhost:8085",
      facilityLayout: "http://localhost:8081",
    });
  });
});

describe("resolveBffBaseUrl", () => {
  it("routes the ops-agent BFF through the same API origin", () => {
    expect(resolveBffBaseUrl({ apiOrigin: "http://localhost:8000" }, true)).toBe(
      "http://localhost:8000/api/warehouse-ops-agent",
    );
  });

  it("retains the standalone BFF port in Vite development", () => {
    expect(resolveBffBaseUrl({}, false)).toBe("http://localhost:8096");
  });
});
