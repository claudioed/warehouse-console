import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { Card } from "@warehouse/ui-kit";
import { useDocumentTitle } from "../../shell/useDocumentTitle";

/**
 * Previously an unmatched URL rendered the shell chrome with a completely
 * empty <main> -- a blank page with working navigation and no explanation.
 */
export function NotFoundScreen(): ReactElement {
  useDocumentTitle("Page not found");

  return (
    <Card title="Page not found">
      <p style={{ color: "var(--wh-color-text-muted)", marginTop: 0 }}>
        That address doesn&rsquo;t match any screen in the console.
      </p>
      <Link to="/">Back to the Floor</Link>
    </Card>
  );
}
