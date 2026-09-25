import { formatInstant, type TimelineStep } from "@warehouse/ui-kit";
import type { OrderLifecycle, FulfillmentStage } from "./types";

/** How many order lines to spell out before collapsing the rest. The
 *  previous implementation joined every line into one unbounded string, so
 *  a 20-line order wrapped across the whole card. */
const MAX_LINES_SHOWN = 6;

/**
 * Turns the BFF's raw cross-service payload into the narrative the Order
 * Lifecycle screen renders: Received -> Allocated/Backordered -> Reserved
 * -> Released -> Task(s) -> Sealed -> Labeled.
 *
 * Deliberately a pure function separate from the screen component: this is
 * the one place the "which service owns which stage" mapping lives, and it
 * is testable without mounting React.
 *
 * The BFF returns `null` for a stage when that service did not answer --
 * which is NOT the same as the order not having reached that stage yet.
 * Every branch below keeps those two apart: `pending` means "not yet",
 * `unavailable` means "we asked and got nothing". Collapsing them (as this
 * function used to) tells an operator a reassuring story about a broken
 * observability path.
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
      timestamp: om.receivedAt ? formatInstant(om.receivedAt) : undefined,
      detail: `${om.lines.length} line${om.lines.length === 1 ? "" : "s"}${
        om.promiseDate ? ` · promise ${formatInstant(om.promiseDate)}` : ""
      }`,
    });
    steps.push({
      id: "order-allocation",
      context: "order-management",
      title: allocationTitle(om.status),
      state: allocationState(om.status),
      detail: summariseLines(om.lines),
      warnings: backorderedLines.map(
        (l) => `Line ${l.lineNo} (${l.sku}) is backordered`,
      ),
    });
  } else {
    // Both steps this stage owns must be accounted for. Previously only
    // "Order received" was emitted here and the allocation step silently
    // disappeared from the timeline.
    steps.push(
      unavailableStep("order-received", "order-management", "Order received"),
      unavailableStep("order-allocation", "order-management", "Allocated"),
    );
  }

  // ---- Stage 2: inventory-storage (reservations) ----------------------
  if (lc.inventory) {
    const reservations = lc.inventory.reservations;
    steps.push({
      id: "inventory-reserved",
      context: "inventory-storage",
      title: "Stock reserved",
      state: reservations.length > 0 ? "done" : "pending",
      detail:
        reservations.length > 0
          ? reservations
              .map((r) => `${r.sku} ×${r.quantity} (${r.status})`)
              .join(" · ")
          : "No reservations yet",
    });
  } else {
    // This branch did not exist. With inventory-storage down the stage
    // vanished entirely, so the timeline jumped from allocation straight
    // to release with no indication anything was missing.
    steps.push(
      unavailableStep("inventory-reserved", "inventory-storage", "Stock reserved"),
    );
  }

  // ---- Stage 3: wes-work-planning (release) ---------------------------
  if (lc.planning) {
    const units = lc.planning.workUnits;
    const flags = units.some((u) => u.fragile || u.giftWrap);
    const paths = [...new Set(units.map((u) => u.pathId))];
    steps.push({
      id: "work-released",
      context: "wes-work-planning",
      title: "Work released",
      state: units.length > 0 ? "done" : "pending",
      detail:
        units.length > 0
          ? `${units.length} work unit${units.length === 1 ? "" : "s"} · ${paths.join(", ")}${
              flags ? " · special handling" : ""
            }`
          : "Not released yet",
    });
  } else {
    steps.push(
      unavailableStep("work-released", "wes-work-planning", "Work released"),
    );
  }

  // ---- Stage 4: fulfillment-execution (PICK/PACK/SLAM) -----------------
  if (lc.fulfillment) {
    steps.push(...fulfillmentSteps(lc.fulfillment));
  } else {
    steps.push(
      unavailableStep("task-pick", "fulfillment-execution", "Picked"),
      unavailableStep("task-pack", "fulfillment-execution", "Packed"),
      unavailableStep("task-slam", "fulfillment-execution", "SLAM / weigh-check"),
      unavailableStep("package-sealed", "fulfillment-execution", "Package sealed"),
      unavailableStep("package-labeled", "fulfillment-execution", "Label applied"),
    );
  }

  return steps;
}

function fulfillmentSteps(f: FulfillmentStage): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const tasks = f.tasks;

  if (tasks.length === 0) {
    steps.push({
      id: "task-pending",
      context: "fulfillment-execution",
      title: "Awaiting task creation",
      state: "pending",
      detail: "No tasks created for this order yet",
    });
  }

  for (const type of ["PICK", "PACK", "SLAM"] as const) {
    // Every task of this type, not just the first. An order picked across
    // three zones has three PICK tasks; `tasks.find(...)` rendered one and
    // silently dropped the rest.
    const ofType = tasks.filter((task) => task.taskType === type);
    ofType.forEach((t, i) => {
      const warnings: string[] = [];
      if (t.leaseExpiredCount > 0) {
        warnings.push(`Lease expired ${t.leaseExpiredCount}× before completion`);
      }
      if (t.weightDiscrepancy) {
        warnings.push("Weight discrepancy detected at SLAM");
      }
      steps.push({
        id: `task-${type.toLowerCase()}-${t.taskId || i}`,
        context: "fulfillment-execution",
        title:
          ofType.length > 1
            ? `${taskTitle(type)} (${i + 1} of ${ofType.length})`
            : taskTitle(type),
        state: taskState(t.status),
        detail: t.stationId ? `Station ${t.stationId}` : undefined,
        warnings,
      });
    });
  }

  // Sealing and labeling are separate physical events. Collapsing them
  // into one dot made "sealed but the label failed" -- an exception someone
  // must act on -- look identical to "not packed yet".
  steps.push({
    id: "package-sealed",
    context: "fulfillment-execution",
    title: "Package sealed",
    state: f.packageSealed ? "done" : "pending",
  });
  steps.push({
    id: "package-labeled",
    context: "fulfillment-execution",
    title: "Label applied",
    state: f.labelApplied
      ? "done"
      : f.packageSealed
        ? // Sealed but unlabeled is a stall, not a normal waiting state.
          "warning"
        : "pending",
    detail:
      f.packageSealed && !f.labelApplied
        ? "Sealed, but no label has been applied yet"
        : undefined,
  });

  return steps;
}

/**
 * A stage whose owning service did not answer. Distinct from `pending`:
 * we are not saying it has not happened, we are saying we do not know.
 */
function unavailableStep(
  id: string,
  context: string,
  title: string,
): TimelineStep {
  return {
    id,
    context,
    title,
    state: "unavailable",
    unavailableReason: `No signal from ${context}`,
  };
}

function summariseLines(
  lines: { lineNo: number; sku: string; quantity: number }[],
): string {
  const shown = lines
    .slice(0, MAX_LINES_SHOWN)
    .map((l) => `L${l.lineNo} ${l.sku} ×${l.quantity}`)
    .join(" · ");
  const rest = lines.length - MAX_LINES_SHOWN;
  return rest > 0 ? `${shown} · +${rest} more` : shown;
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

function taskState(
  status: "PENDING" | "CLAIMED" | "COMPLETED",
): TimelineStep["state"] {
  const map: Record<"PENDING" | "CLAIMED" | "COMPLETED", TimelineStep["state"]> =
    {
      PENDING: "pending",
      CLAIMED: "active",
      COMPLETED: "done",
    };
  return map[status];
}
