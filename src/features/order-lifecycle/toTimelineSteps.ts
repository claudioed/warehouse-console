import type { TimelineStep } from "@warehouse/ui-kit";
import type { OrderLifecycle } from "./types";

/**
 * Turns the BFF's raw cross-service payload into the horizontal narrative
 * the Order Lifecycle screen renders: Received -> Allocated/Backordered ->
 * Released -> WorkUnit -> Task(s) -> Sealed/Labeled.
 *
 * Deliberately a pure function separate from the screen component: this
 * is the one place the "which service owns which stage" mapping lives,
 * and it's easy to unit test without mounting React.
 */
export function toTimelineSteps(lc: OrderLifecycle): TimelineStep[] {
  const steps: TimelineStep[] = [];

  // ---- Stage 1: order-management -------------------------------------
  if (lc.orderManagement) {
    const om = lc.orderManagement;
    const backorderedLines = om.lines.filter((l) => l.status === "Backordered");
    steps.push({
      id: "order-received",
      context: "order-management",
      title: "Order received",
      state: "done",
      timestamp: om.receivedAt ?? undefined,
      detail: `${om.lines.length} line${om.lines.length === 1 ? "" : "s"}${
        om.promiseDate ? ` · promise ${om.promiseDate}` : ""
      }`,
    });
    steps.push({
      id: "order-allocation",
      context: "order-management",
      title: allocationTitle(om.status),
      state: allocationState(om.status),
      detail: om.lines.map((l) => `L${l.lineNo} ${l.sku} ×${l.quantity}`).join(" · "),
      warnings: backorderedLines.map(
        (l) => `Line ${l.lineNo} (${l.sku}) is backordered`,
      ),
    });
  } else {
    steps.push(unavailableStep("order-received", "order-management", "Order received"));
  }

  // ---- Stage 2: inventory-storage (reservations) ----------------------
  if (lc.inventory) {
    steps.push({
      id: "inventory-reserved",
      context: "inventory-storage",
      title: "Stock reserved",
      state: lc.inventory.reservations.length > 0 ? "done" : "pending",
      detail:
        lc.inventory.reservations.length > 0
          ? lc.inventory.reservations
              .map((r) => `${r.sku} ×${r.quantity} (${r.status})`)
              .join(" · ")
          : "No reservations yet",
    });
  }

  // ---- Stage 3: wes-work-planning (release) ---------------------------
  if (lc.planning) {
    const units = lc.planning.workUnits;
    const flags = units.some((u) => u.fragile || u.giftWrap);
    steps.push({
      id: "work-released",
      context: "wes-work-planning",
      title: "Work released",
      state: units.length > 0 ? "done" : "pending",
      detail:
        units.length > 0
          ? `${units.length} work unit${units.length === 1 ? "" : "s"} · ${units
              .map((u) => u.pathId)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(", ")}${flags ? " · special handling" : ""}`
          : "Not released yet",
    });
  } else {
    steps.push(unavailableStep("work-released", "wes-work-planning", "Work released"));
  }

  // ---- Stage 4: fulfillment-execution (PICK/PACK/SLAM) -----------------
  if (lc.fulfillment) {
    const tasks = lc.fulfillment.tasks;
    for (const type of ["PICK", "PACK", "SLAM"] as const) {
      const t = tasks.find((task) => task.taskType === type);
      if (!t) continue;
      const warnings: string[] = [];
      if (t.leaseExpiredCount > 0) {
        warnings.push(
          `Lease expired ${t.leaseExpiredCount}× before completion`,
        );
      }
      if (t.weightDiscrepancy) {
        warnings.push("Weight discrepancy detected at SLAM");
      }
      steps.push({
        id: `task-${type.toLowerCase()}`,
        context: "fulfillment-execution",
        title: taskTitle(type),
        state: taskState(t.status),
        detail: t.stationId ? `Station ${t.stationId}` : undefined,
        warnings,
      });
    }
    if (tasks.length === 0) {
      steps.push(
        unavailableStep(
          "task-pending",
          "fulfillment-execution",
          "Awaiting task creation",
        ),
      );
    }
    steps.push({
      id: "package-sealed",
      context: "fulfillment-execution",
      title: "Package sealed & labeled",
      state:
        lc.fulfillment.packageSealed && lc.fulfillment.labelApplied
          ? "done"
          : "pending",
    });
  } else {
    steps.push(unavailableStep("task-pending", "fulfillment-execution", "Picked, packed & sealed"));
  }

  return steps;
}

function unavailableStep(id: string, context: string, title: string): TimelineStep {
  return {
    id,
    context,
    title,
    state: "pending",
    detail: "Not reached yet, or this service didn't respond",
  };
}

function allocationTitle(status: string): string {
  switch (status) {
    case "Allocated":
      return "Fully allocated";
    case "PartiallyAllocated":
      return "Partially allocated";
    case "Backordered":
      return "Backordered";
    case "Released":
    case "PartiallyReleased":
      return "Allocated";
    case "Cancelled":
      return "Cancelled before allocation";
    default:
      return "Allocation pending";
  }
}

function allocationState(status: string): TimelineStep["state"] {
  switch (status) {
    case "Allocated":
    case "Released":
    case "PartiallyReleased":
      return "done";
    case "PartiallyAllocated":
      return "warning";
    case "Backordered":
      return "warning";
    case "Cancelled":
      return "error";
    default:
      return "active";
  }
}

function taskTitle(type: "PICK" | "PACK" | "SLAM"): string {
  return { PICK: "Picked", PACK: "Packed", SLAM: "SLAM / weigh-check" }[type];
}

function taskState(status: "PENDING" | "CLAIMED" | "COMPLETED"): TimelineStep["state"] {
  const map: Record<"PENDING" | "CLAIMED" | "COMPLETED", TimelineStep["state"]> = {
    PENDING: "pending",
    CLAIMED: "active",
    COMPLETED: "done",
  };
  return map[status];
}
