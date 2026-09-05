import type { ReactElement } from "react";
import {
  BarChart,
  Card,
  FreshnessBadge,
  FunnelChart,
  LineChart,
  useFetch,
} from "@warehouse/ui-kit";
import type { ReportResponse, ReportSection } from "./types";

/**
 * The body shared by the WMS and WES dashboards. Both consume the exact
 * same console-reports envelope and differ only in title, subtitle and
 * which endpoint they read, so the rendering rules -- chart selection,
 * per-section degradation, freshness -- live here once.
 *
 * Two failure modes, deliberately kept distinct:
 *
 *  - The whole request fails (BFF down, network error, unparseable body):
 *    the dashboard has nothing true to say, so it says so, once.
 *  - A single section arrives with `available: false`: an expected,
 *    routine condition when one upstream context is degraded. That card
 *    shows "—" in the same spirit as OverviewScreen's KPI tiles, and the
 *    other sections still render their real numbers. Never fabricate a
 *    number to keep a card looking healthy.
 */
export function ReportDashboard({
  title,
  subtitle,
  url,
}: {
  title: string;
  subtitle: string;
  url: string;
}): ReactElement {
  const { data, loading, error } = useFetch<ReportResponse>(url);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--wh-space-5)" }}>
      <div>
        <h1 style={{ fontSize: "var(--wh-font-size-2xl)", margin: 0 }}>{title}</h1>
        <p style={{ color: "var(--wh-color-text-muted)", marginTop: 4 }}>{subtitle}</p>
      </div>

      {error && (
        <Card title="Dashboard temporarily unavailable">
          <div style={{ color: "var(--wh-color-status-danger)" }}>
            Couldn't reach the console reports service: {error.message}
          </div>
          <div style={{ color: "var(--wh-color-text-muted)", marginTop: "var(--wh-space-2)" }}>
            No numbers are shown rather than stale or invented ones. Retry once the
            BFF is reachable.
          </div>
        </Card>
      )}

      {loading && !data && (
        <Card title="Loading…">
          <div style={{ color: "var(--wh-color-text-muted)" }}>
            Reading analytical projections from each bounded context…
          </div>
        </Card>
      )}

      {data && (
        <>
          <ReportWindow report={data} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: "var(--wh-space-4)",
            }}
          >
            {data.sections.map((section) => (
              <SectionCard key={section.id} section={section} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** The reporting window and read instant, so nobody mistakes these
 *  projections for a live view of right now. */
function ReportWindow({ report }: { report: ReportResponse }): ReactElement {
  return (
    <div
      style={{
        color: "var(--wh-color-text-muted)",
        fontSize: "var(--wh-font-size-xs)",
        fontFamily: "var(--wh-font-mono)",
      }}
    >
      {formatInstant(report.from)} → {formatInstant(report.to)} · generated{" "}
      {formatInstant(report.generatedAt)}
    </div>
  );
}

function SectionCard({ section }: { section: ReportSection }): ReactElement {
  return (
    <Card
      title={section.title}
      actions={
        section.available ? (
          <FreshnessBadge lagSeconds={section.freshnessLagSeconds} />
        ) : undefined
      }
    >
      {section.available ? (
        <SectionChart section={section} />
      ) : (
        <SectionUnavailable section={section} />
      )}
      <div
        style={{
          marginTop: "var(--wh-space-3)",
          color: "var(--wh-color-text-muted)",
          fontSize: "var(--wh-font-size-xs)",
        }}
      >
        source: {section.sourceContext}
      </div>
    </Card>
  );
}

function SectionChart({ section }: { section: ReportSection }): ReactElement {
  const empty = (
    <div style={{ color: "var(--wh-color-text-muted)" }}>No data in this window.</div>
  );

  switch (section.chartKind) {
    case "funnel":
      return <FunnelChart stages={section.series} emptyState={empty} />;
    case "bar":
      return <BarChart data={section.series} emptyState={empty} />;
    case "line":
      return <LineChart data={section.series} emptyState={empty} />;
    default:
      // A chartKind this build doesn't know how to draw -- say so plainly
      // rather than silently guessing a chart type for real numbers.
      return (
        <div style={{ color: "var(--wh-color-text-muted)" }}>
          Unsupported chart type "{section.chartKind}" — update the console to render
          this section.
        </div>
      );
  }
}

/** One section's upstream is degraded. Same "—" convention the Overview
 *  KPI tiles use for an unreachable endpoint. */
function SectionUnavailable({ section }: { section: ReportSection }): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--wh-space-2)",
        minHeight: 128,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "var(--wh-font-size-2xl)",
          color: "var(--wh-color-text-muted)",
        }}
      >
        —
      </div>
      <div style={{ color: "var(--wh-color-status-warning)" }}>Data unavailable</div>
      <div
        style={{
          color: "var(--wh-color-text-muted)",
          fontSize: "var(--wh-font-size-xs)",
        }}
      >
        {section.error ?? `${section.sourceContext} did not answer for this window.`}
      </div>
    </div>
  );
}

/** Compact local-time rendering; falls back to the raw string rather than
 *  showing "Invalid Date" if the BFF ever sends something unparseable. */
function formatInstant(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
