import { setupServer } from "msw/node";

/**
 * Shared msw server. Tests register their own handlers with
 * `server.use(...)`; there are deliberately no defaults, so a screen that
 * starts calling a new endpoint fails loudly (setup.ts uses
 * `onUnhandledRequest: "error"`) rather than silently rendering an error
 * state that looks like a passing test.
 */
export const server = setupServer();
