/**
 * Shape of the BFF's GET /console/orders/{id}/lifecycle response.
 *
 * This is a NEW read model (nothing in any Go service returns this shape
 * today) that the BFF assembles by fanning out to each service's existing
 * REST API and joining on the orderRef thread documented in the MFE data
 * exploration: OrderId (order-management) -> WorkUnit enqueue reference
 * (wes-work-planning) -> Task.orderRef (fulfillment-execution).
 *
 * Every stage is independently optional/nullable BECAUSE the BFF must
 * tolerate one upstream service being slow or down without blocking the
 * whole timeline -- a stage with data: null renders as "not reached yet /
 * unavailable", never a blocking spinner for the other stages.
 */
export interface OrderLifecycle {
  orderId: string;
  orderManagement: OrderStage | null;
  inventory: InventoryStage | null;
  planning: PlanningStage | null;
  fulfillment: FulfillmentStage | null;
}

export interface OrderStage {
  status: string;
  allowPartialShipment: boolean;
  promiseDate: string | null;
  lines: Array<{
    lineNo: number;
    sku: string;
    quantity: number;
    status: string;
  }>;
  receivedAt: string | null;
}

export interface InventoryStage {
  reservations: Array<{
    sku: string;
    quantity: number;
    status: string;
  }>;
}

export interface PlanningStage {
  workUnits: Array<{
    workUnitId: string;
    pathId: string;
    status: string;
    fragile: boolean;
    giftWrap: boolean;
  }>;
}

export interface FulfillmentStage {
  tasks: Array<{
    taskId: string;
    taskType: "PICK" | "PACK" | "SLAM";
    status: "PENDING" | "CLAIMED" | "COMPLETED";
    stationId: string | null;
    weightDiscrepancy: boolean;
    leaseExpiredCount: number;
  }>;
  packageSealed: boolean;
  labelApplied: boolean;
}
