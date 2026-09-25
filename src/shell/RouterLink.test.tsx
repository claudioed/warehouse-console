import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AppShell, NavigationProvider, LaunchTile } from "@warehouse/ui-kit";
import { RouterLink } from "./RouterLink";

function LocationProbe() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

const NAV = [
  { id: "overview", label: "Overview", href: "/", active: true },
  { id: "inventory", label: "Inventory", href: "/inventory", active: false },
];

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <NavigationProvider link={RouterLink}>
        <AppShell nav={NAV}>
          <LocationProbe />
          <LaunchTile
            context="inventory-storage"
            title="Inventory"
            description="Stock and reservations."
            href="/inventory"
          />
        </AppShell>
      </NavigationProvider>
    </MemoryRouter>,
  );
}

describe("RouterLink injection", () => {
  /**
   * The defect this guards: AppShell rendered a raw <a href> while the app
   * runs BrowserRouter, so every nav click was a full document navigation
   * that tore down the SPA and re-downloaded every Module Federation
   * remoteEntry.js. Client-side routing must move the location instead.
   */
  it("navigates the router in-place when a nav item is clicked", async () => {
    const user = userEvent.setup();
    renderShell();

    expect(screen.getByTestId("path")).toHaveTextContent("/");

    await user.click(screen.getByRole("link", { name: "Inventory" }));

    // A full page navigation would never update this; the component tree
    // would have been thrown away instead.
    expect(screen.getByTestId("path")).toHaveTextContent("/inventory");
  });

  it("routes launchpad tiles client-side too", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(
      screen.getByRole("link", { name: /Stock and reservations/ }),
    );
    expect(screen.getByTestId("path")).toHaveTextContent("/inventory");
  });

  it("marks the active nav item for assistive tech, not just by color", () => {
    renderShell();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Inventory" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("exposes a skip link as the first focus stop", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.tab();
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveFocus();
  });

  it("leaves external URLs to the browser rather than pushing a bogus route", () => {
    render(
      <MemoryRouter>
        <RouterLink href="https://example.com/docs">Docs</RouterLink>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "https://example.com/docs",
    );
  });
});
