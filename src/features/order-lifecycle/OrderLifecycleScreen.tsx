import { useState, type FormEvent } from "react";
import { Card, StatusPill, Timeline, useFetch } from "@warehouse/ui-kit";
import { BFF_BASE_URL } from "../../config";
import type { OrderLifecycle } from "./types";
import { toTimelineSteps } from "./toTimelineSteps";

/**
 * The headline cross-service feature: search by OrderId, see the full
 * lifecycle -- Received -> Allocated/Backordered -> Released -> WorkUnit
 * -> Task(s) -> Sealed -- as one linear narrative pulling from 4 bounded
 * contexts via the console-bff.
 *
 * Lives in the SHELL, not any one remote, because it's fundamentally
 * cross-service data -- no single bounded context owns "the whole order
 * story" and none should have to reach into another's database to render
 * it (governance charter: no cross-service DB reads, ever).
 */
export function OrderLifecycleScreen() {
  const [query, setQuery] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);

  const url = orderId
    ? `${BFF_BASE_URL}/console/orders/${encodeURIComponent(orderId)}/lifecycle`
    : null;
  const { data, loading, error } = useFetch<OrderLifecycle>(url);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) setOrderId(trimmed);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--wh-space-5)" }}>
      <div>
        <h1 style={{ fontSize: "var(--wh-font-size-2xl)", margin: 0 }}>
          Order Lifecycle
        </h1>
        <p style={{ color: "var(--wh-color-text-muted)", marginTop: 4 }}>
          Search an order to see its full journey across order-management,
          inventory-storage, wes-work-planning, and fulfillment-execution.
        </p>
      </div>

      <form onSubmit={onSubmit} style={{ display: "flex", gap: "var(--wh-space-2)" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Order ID, e.g. ORD-2026-000412"
          style={{
            flex: 1,
            maxWidth: 420,
            padding: "10px 12px",
            borderRadius: "var(--wh-radius-md)",
            border: "1px solid var(--wh-color-border)",
            background: "var(--wh-color-bg-sunken)",
            color: "var(--wh-color-text)",
            fontFamily: "var(--wh-font-mono)",
            fontSize: "var(--wh-font-size-sm)",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 18px",
            borderRadius: "var(--wh-radius-md)",
            border: "none",
            background: "var(--wh-color-accent)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "var(--wh-font-size-sm)",
            cursor: "pointer",
          }}
        >
          Track order
        </button>
      </form>

      {error && (
        <Card>
          <div style={{ color: "var(--wh-color-status-danger)" }}>
            Couldn't load order {orderId}: {error.message}
          </div>
        </Card>
      )}

      {loading && (
        <Card title="Loading…">
          <div style={{ color: "var(--wh-color-text-muted)" }}>
            Fetching from order-management, inventory-storage,
            wes-work-planning, and fulfillment-execution…
          </div>
        </Card>
      )}

      {data && !loading && (
        <Card
          title={`Order ${data.orderId}`}
          actions={
            data.orderManagement && (
              <StatusPill status={data.orderManagement.status} />
            )
          }
        >
          <Timeline steps={toTimelineSteps(data)} />
        </Card>
      )}

      {!data && !loading && !error && (
        <Card>
          <div style={{ color: "var(--wh-color-text-muted)", textAlign: "center" }}>
            Enter an order ID above to see its lifecycle.
          </div>
        </Card>
      )}
    </div>
  );
}
