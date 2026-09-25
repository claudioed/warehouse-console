import { describe, expect, it } from "vitest";
import { toTimelineSteps } from "./toTimelineSteps";
import type { OrderLifecycle } from "./types";

function lifecycle(overrides: Partial<OrderLifecycle> = {}): OrderLifecycle {
  return {
    orderId: "ord-1",
    orderManagement: {
      status: "Released",
      allowPartialShipment: false,
      promiseDate: null,
      receivedAt: null,
      lines: [{ lineNo: 1, sku: "SKU-A", quantity: 2, status: "Released" }],
    },
    inventory: { reservations: [{ sku: "SKU-A", quantity: 2, status: "ACTIVE" }] },
    planning: {
      workUnits: [
        {
          workUnitId: "ord-1-line-1",
          pathId: "pick-zone-a",
          status: "Released",
          fragile: false,
          giftWrap: false,
        },
      ],
    },
    fulfillment: {
      tasks: [],
      packageSealed: false,
      labelApplied: false,
    },
    ...overrides,
  };
}

const task = (over: Record<string, unknown> = {}) => ({
  taskId: "t1",
  taskType: "PICK" as const,
  status: "COMPLETED" as const,
  stationId: "ST-1",
  weightDiscrepancy: false,
  leaseExpiredCount: 0,
  ...over,
});

describe("toTimelineSteps", () => {
  /**
   * The worst of the original defects: stage 2 had no `else` branch, so a
   * dead inventory-storage made the stage disappear entirely and the
   * timeline jumped from allocation straight to release with no sign that
   * anything was missing.
   */
  it("still renders the inventory stage when inventory-storage is down", () => {
    const steps = toTimelineSteps(lifecycle({ inventory: null }));
    const inventory = steps.find((s) => s.id === "inventory-reserved");

    expect(inventory).toBeDefined();
    expect(inventory?.state).toBe("unavailable");
    expect(inventory?.unavailableReason).toContain("inventory-storage");
  });

  it("marks a missing stage as unavailable, never as pending", () => {
    const steps = toTimelineSteps(
      lifecycle({ orderManagement: null, inventory: null, planning: null, fulfillment: null }),
    );
    expect(steps.every((s) => s.state === "unavailable")).toBe(true);
    expect(steps.some((s) => s.state === "pending")).toBe(false);
  });

  it("keeps both order-management steps when that service is down", () => {
    const steps = toTimelineSteps(lifecycle({ orderManagement: null }));
    // Previously only "Order received" survived; the allocation step was
    // silently dropped.
    expect(steps.filter((s) => s.context === "order-management")).toHaveLength(2);
  });

  /**
   * `tasks.find(t => t.taskType === type)` returned only the first task of
   * each type, so a multi-zone pick hid the rest with no "+2 more".
   */
  it("renders every task of a type, not just the first", () => {
    const steps = toTimelineSteps(
      lifecycle({
        fulfillment: {
          tasks: [
            task({ taskId: "p1", stationId: "ST-1" }),
            task({ taskId: "p2", stationId: "ST-2" }),
            task({ taskId: "p3", stationId: "ST-3" }),
          ],
          packageSealed: false,
          labelApplied: false,
        },
      }),
    );

    const picks = steps.filter((s) => s.id.startsWith("task-pick-"));
    expect(picks).toHaveLength(3);
    expect(picks.map((p) => p.detail)).toEqual([
      "Station ST-1",
      "Station ST-2",
      "Station ST-3",
    ]);
    expect(picks[0].title).toBe("Picked (1 of 3)");
  });

  /**
   * packageSealed && labelApplied were collapsed into one dot, so "sealed
   * but the label failed" looked exactly like "not packed yet".
   */
  it("separates sealing from labeling and flags a sealed-but-unlabeled package", () => {
    const steps = toTimelineSteps(
      lifecycle({
        fulfillment: { tasks: [], packageSealed: true, labelApplied: false },
      }),
    );

    const sealed = steps.find((s) => s.id === "package-sealed");
    const labeled = steps.find((s) => s.id === "package-labeled");

    expect(sealed?.state).toBe("done");
    expect(labeled?.state).toBe("warning");
    expect(labeled?.detail).toContain("no label");
  });

  it("does not flag labeling before the package is even sealed", () => {
    const steps = toTimelineSteps(
      lifecycle({
        fulfillment: { tasks: [], packageSealed: false, labelApplied: false },
      }),
    );
    expect(steps.find((s) => s.id === "package-labeled")?.state).toBe("pending");
  });

  it("collapses a long line list instead of running on forever", () => {
    const lines = Array.from({ length: 20 }, (_, i) => ({
      lineNo: i + 1,
      sku: `SKU-${i}`,
      quantity: 1,
      status: "Released",
    }));
    const steps = toTimelineSteps(
      lifecycle({
        orderManagement: {
          status: "Released",
          allowPartialShipment: false,
          promiseDate: null,
          receivedAt: null,
          lines,
        },
      }),
    );
    expect(steps.find((s) => s.id === "order-allocation")?.detail).toContain(
      "+14 more",
    );
  });

  it("distinguishes 'no reservations yet' from 'inventory did not answer'", () => {
    const empty = toTimelineSteps(lifecycle({ inventory: { reservations: [] } }));
    expect(empty.find((s) => s.id === "inventory-reserved")?.state).toBe("pending");

    const down = toTimelineSteps(lifecycle({ inventory: null }));
    expect(down.find((s) => s.id === "inventory-reserved")?.state).toBe(
      "unavailable",
    );
  });

  it("treats a cancelled order as an error, not a completed stage", () => {
    const steps = toTimelineSteps(
      lifecycle({
        orderManagement: {
          status: "Cancelled",
          allowPartialShipment: false,
          promiseDate: null,
          receivedAt: null,
          lines: [{ lineNo: 1, sku: "A", quantity: 1, status: "Cancelled" }],
        },
      }),
    );
    expect(steps.find((s) => s.id === "order-allocation")?.state).toBe("error");
  });
});
