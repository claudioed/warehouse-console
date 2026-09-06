import { useEffect } from "react";

const BASE = "Warehouse Console";

/**
 * Sets the tab title per route.
 *
 * Routing is the shell's concern (ADR-0002), so this lives here rather
 * than in @warehouse/ui-kit. Without it every tab reads "Warehouse
 * Console", which makes browser history and a multi-tab ops workflow --
 * one tab per order being chased -- effectively unusable.
 */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : BASE;
  }, [title]);
}
