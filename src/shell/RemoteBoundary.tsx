import { Component, Suspense, type ComponentType, type ReactNode } from "react";
import { Card } from "@warehouse/ui-kit";

/**
 * Wraps an already-lazy remote component in a Suspense boundary (loading
 * skeleton) and an error boundary (a remote that's down/broken renders an
 * inline "unavailable" card instead of white-screening the whole console).
 *
 * Callers must create the lazy component ONCE at module scope (e.g.
 * `const OrdersRemote = lazy(() => import("order_mgmt_mfe/App"))` in
 * App.tsx) and pass it in as `component` -- never call `lazy()` inside a
 * render function, which would remount the remote (and re-trigger its
 * Module Federation fetch) on every parent re-render.
 *
 * This is the mechanism that makes "one service's screen renders, the
 * screens for the other five don't have to" true at the shell level, not
 * just within the Order Lifecycle BFF response.
 */
export function RemoteBoundary({
  component: RemoteComponent,
  label,
}: {
  component: ComponentType;
  label: string;
}) {
  return (
    <RemoteErrorBoundary label={label}>
      <Suspense fallback={<RemoteSkeleton />}>
        <RemoteComponent />
      </Suspense>
    </RemoteErrorBoundary>
  );
}

function RemoteSkeleton() {
  return (
    <Card>
      <div
        style={{
          height: 240,
          borderRadius: "var(--wh-radius-md)",
          background: "var(--wh-color-bg-sunken)",
        }}
      />
    </Card>
  );
}

interface ErrorBoundaryState {
  error: Error | null;
}

class RemoteErrorBoundary extends Component<
  { children: ReactNode; label: string },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <Card title={this.props.label}>
          <div style={{ color: "var(--wh-color-status-danger)" }}>
            This module is unavailable right now
            {import.meta.env.DEV ? `: ${this.state.error.message}` : "."}
          </div>
        </Card>
      );
    }
    return this.props.children;
  }
}
