import "@testing-library/jest-dom/vitest";
import { beforeAll, afterEach, afterAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./mocks/server";

// "error" rather than "bypass": a screen that reaches for an endpoint no
// test has stubbed should fail loudly, not quietly render its error state
// and still pass.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  server.resetHandlers();
  // Unmount between cases so a getByText never matches a leftover tree.
  cleanup();
});

afterAll(() => server.close());
