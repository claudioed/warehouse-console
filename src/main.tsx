import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@warehouse/ui-kit/tokens.css";
import "./styles/screens.css";
import { loadRuntimeConfig } from "./runtime-config";

const rootElement = document.getElementById("root")!;

/**
 * Boot order matters, and this is the reason for the dynamic import below.
 *
 * `window.__WAREHOUSE_CONFIG__` must be populated BEFORE any module that reads
 * it is evaluated. `./App` transitively imports `./config`, which resolves
 * every service URL at module scope, and each federated remote does the same
 * with its own config module the moment it is lazy-loaded. A static
 * `import { App } from "./App"` at the top of this file would be hoisted and
 * evaluated before `loadRuntimeConfig()` ever ran, so the shell would resolve
 * its endpoints against an empty config and throw in production.
 *
 * If the config cannot be loaded we deliberately render a plain, dependency-
 * free error instead of mounting: a console pointed at nothing is worse than
 * one that says why it refused to start.
 */
async function bootstrap(): Promise<void> {
  await loadRuntimeConfig();
  const { App } = await import("./App");
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error("warehouse-console failed to start", error);
  rootElement.textContent = `warehouse-console failed to start: ${message}`;
});
