import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mocks/server";
import { BFF_BASE_URL } from "../../config";
import { FloorScreen } from "./FloorScreen";
import type { DailyBrief } from "./types";

const URL = `${BFF_BASE_URL}/daily-brief`;

const HEALTHY_PATH = {
  pathId: "pick-zone-a",
  processPath: "PICK",
  backlog: { backlogDepth: 12, wip: 30, overAlarmThreshold: false },
  staffing: { plannedHeads: 14, activeHeads: 14, understaffed: false },
  queue: { depth: 22 },
  stuck: { count: 0 },
};

function brief(over: Partial<DailyBrief> = {}): DailyBrief {
  return {
    generatedAt: "2026-09-05T12:00:00Z",
    sites: [{ siteCode: "WH1", siteName: "Dallas", paths: [HEALTHY_PATH] }],
    openExceptions: [],
    ...over,
  };
}

const stub = (b: DailyBrief) => http.get(URL, () => HttpResponse.json(b));

describe("FloorScreen", () => {
  it("renders each site's paths with their live facts", async () => {
    server.use(stub(brief()));
    render(<FloorScreen />);

    await waitFor(() => expect(screen.getByText(/WH1 · pick-zone-a/)).toBeInTheDocument());
    expect(screen.getByText("PICK")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument(); // backlog
    expect(screen.getByText("22")).toBeInTheDocument(); // queue
    expect(screen.getByText("14/14")).toBeInTheDocument(); // heads
  });

  /**
   * The whole reason this screen is built on /daily-brief: the endpoint
   * reports WHICH upstreams went quiet. A missing reading must never be
   * rendered as a calm zero -- "0 stuck tasks" and "we could not ask about
   * stuck tasks" are different operational facts.
   */
  it("renders a missing fact as no-signal, not as zero", async () => {
    server.use(
      stub(
        brief({
          sites: [
            {
              siteCode: "WH1",
              siteName: "Dallas",
              paths: [
                {
                  pathId: "pick-zone-a",
                  processPath: "PICK",
                  backlog: null,
                  staffing: null,
                  queue: { depth: 5 },
                  stuck: null,
                  unavailable: [
                    "wes-work-planning: connection refused",
                    "workforce-management: client not configured",
                  ],
                },
              ],
            },
          ],
        }),
      ),
    );
    const { container } = render(<FloorScreen />);

    await waitFor(() =>
      expect(
        container.querySelectorAll(".wh-path__metric-value--nosignal").length,
      ).toBeGreaterThan(0),
    );

    // Never a fabricated zero for an absent reading.
    const stuck = container.querySelector(".wh-path__metrics");
    expect(within(stuck as HTMLElement).getAllByText("—").length).toBeGreaterThan(0);

    // And the failing services are named, not merely implied.
    expect(screen.getByText(/no signal from wes-work-planning/)).toBeInTheDocument();
    expect(
      screen.getByText(/no signal from workforce-management/),
    ).toBeInTheDocument();
    expect(screen.getByText(/connection refused/)).toBeInTheDocument();
  });

  it("distinguishes a real zero from an absent reading", async () => {
    server.use(stub(brief()));
    const { container } = render(<FloorScreen />);

    await waitFor(() =>
      expect(container.querySelector(".wh-path__metrics")).toBeInTheDocument(),
    );
    const metrics = container.querySelector(".wh-path__metrics") as HTMLElement;

    // A genuine reading of zero renders as "0"...
    expect(within(metrics).getByText("0")).toBeInTheDocument();
    // ...and nothing on the card claims a missing signal.
    expect(within(metrics).queryByText("—")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".wh-path__metric-value--nosignal")).toHaveLength(
      0,
    );
  });

  it("ranks exceptions with critical first", async () => {
    server.use(
      stub(
        brief({
          openExceptions: [
            {
              kind: "flow_balance_risk",
              siteCode: "WH1",
              pathId: "pack-1",
              severity: "warning",
              summary: "2 independent flow-imbalance signals",
              evidence: ["a"],
            },
            {
              kind: "flow_balance_risk",
              siteCode: "WH1",
              pathId: "pick-zone-a",
              severity: "critical",
              summary: "3 independent flow-imbalance signals",
              evidence: ["b"],
            },
          ],
        }),
      ),
    );
    const { container } = render(<FloorScreen />);

    await waitFor(() =>
      expect(container.querySelectorAll(".wh-exception")).toHaveLength(2),
    );
    const rows = [...container.querySelectorAll(".wh-exception")];
    expect(rows[0]).toHaveClass("wh-exception--critical");
    expect(rows[1]).toHaveClass("wh-exception--warning");
  });

  it("keeps exception evidence collapsed until asked for", async () => {
    const user = userEvent.setup();
    server.use(
      stub(
        brief({
          openExceptions: [
            {
              kind: "flow_balance_risk",
              siteCode: "WH1",
              pathId: "pick-zone-a",
              severity: "critical",
              summary: "3 independent flow-imbalance signals",
              evidence: [
                "wes-work-planning get_backlog_telemetry: over alarm threshold",
              ],
            },
          ],
        }),
      ),
    );
    render(<FloorScreen />);

    const toggle = await screen.findByRole("button", { name: /Evidence \(1\)/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/over alarm threshold/)).not.toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByText(/over alarm threshold/)).toBeInTheDocument();
  });

  /**
   * Alarm colour must come from the backend's own judgement
   * (overAlarmThreshold / understaffed), never a cutoff invented in the
   * shell -- that would be domain logic in the shell, which ADR-0002
   * forbids and which the old Overview screen did with a hardcoded >20.
   */
  it("takes alarm state from the backend flag, not from the number", async () => {
    server.use(
      stub(
        brief({
          sites: [
            {
              siteCode: "WH1",
              siteName: "Dallas",
              paths: [
                {
                  ...HEALTHY_PATH,
                  // A large backlog the backend does NOT consider alarming.
                  backlog: { backlogDepth: 900, wip: 30, overAlarmThreshold: false },
                },
              ],
            },
          ],
        }),
      ),
    );
    const { container } = render(<FloorScreen />);

    await waitFor(() => expect(screen.getByText("900")).toBeInTheDocument());
    expect(container.querySelectorAll(".wh-path__metric-value--alarm")).toHaveLength(
      0,
    );
  });

  it("offers a retry instead of a dead end when the brief cannot be loaded", async () => {
    server.use(http.get(URL, () => HttpResponse.json(null, { status: 503 })));
    render(<FloorScreen />);

    expect(
      await screen.findByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
    // The internal URL must never reach the operator.
    expect(screen.queryByText(new RegExp(BFF_BASE_URL))).not.toBeInTheDocument();
  });

  it("keeps the last good brief on screen when a refresh fails", async () => {
    let calls = 0;
    server.use(
      http.get(URL, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(brief())
          : HttpResponse.json(null, { status: 503 });
      }),
    );
    const user = userEvent.setup();
    render(<FloorScreen />);

    await waitFor(() => expect(screen.getByText("22")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() =>
      expect(screen.getByText(/refresh failed/)).toBeInTheDocument(),
    );
    // Still showing the last known good numbers, not a blank screen.
    expect(screen.getByText("22")).toBeInTheDocument();
  });
});
