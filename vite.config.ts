import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

// warehouse-console: the shell. Owns routing, top nav, the site switcher,
// and the one cross-cutting screen no single bounded context owns (Order
// Lifecycle) -- everything else is lazy-loaded from a remote at runtime.
//
// Local dev remote URLs match the port map already established in
// e2e-tests/env.sh's HTTP_PORT block, offset into the 51xx range so the
// six MFE dev servers never collide with each service's own 80xx Go API
// port when both are running side by side on one machine.
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "warehouse_console",
      remotes: {
        order_mgmt_mfe: {
          type: "module",
          name: "order_mgmt_mfe",
          entry: "http://localhost:5181/remoteEntry.js",
        },
        inventory_mfe: {
          type: "module",
          name: "inventory_mfe",
          entry: "http://localhost:5182/remoteEntry.js",
        },
        planning_mfe: {
          type: "module",
          name: "planning_mfe",
          entry: "http://localhost:5183/remoteEntry.js",
        },
        fulfillment_mfe: {
          type: "module",
          name: "fulfillment_mfe",
          entry: "http://localhost:5184/remoteEntry.js",
        },
        workforce_mfe: {
          type: "module",
          name: "workforce_mfe",
          entry: "http://localhost:5185/remoteEntry.js",
        },
        facility_mfe: {
          type: "module",
          name: "facility_mfe",
          entry: "http://localhost:5186/remoteEntry.js",
        },
        process_path_mfe: {
          type: "module",
          name: "process_path_mfe",
          entry: "http://localhost:5189/remoteEntry.js",
        },
        labor_mfe: {
          type: "module",
          name: "labor_mfe",
          entry: "http://localhost:5187/remoteEntry.js",
        },
      },
      shared: {
        react: { singleton: true, requiredVersion: "^19.2.8" },
        "react-dom": { singleton: true, requiredVersion: "^19.2.8" },
        "react-router-dom": { singleton: true, requiredVersion: "^7.18.3" },
        "@warehouse/ui-kit": { singleton: true },
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    cors: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
    cors: true,
  },
  build: {
    target: "esnext",
    modulePreload: false,
  },
});
