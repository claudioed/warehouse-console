/**
 * Dev-only smoke check: loads every route in a real headless browser and
 * confirms each one renders without page errors or failed requests.
 * Requires the shell (npm run dev, :5173) and all 6 remotes' dev servers
 * to already be running -- this does not start them for you.
 *
 * Usage: npm run verify:routes
 */
const { chromium } = require("playwright");

const routes = [
  { path: "/", label: "overview" },
  { path: "/order-lifecycle", label: "order-lifecycle" },
  { path: "/order-management", label: "order-management" },
  { path: "/inventory", label: "inventory" },
  { path: "/planning", label: "planning" },
  { path: "/fulfillment", label: "fulfillment" },
  { path: "/workforce", label: "workforce" },
  { path: "/facility", label: "facility" },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(`[${page.url()}] PAGE ERROR: ${err.message}`));
  page.on("requestfailed", (req) => {
    if (!req.url().includes("mf-types") && !req.url().includes("@vite")) {
      errors.push(`[${page.url()}] REQUEST FAILED: ${req.url()} ${req.failure()?.errorText}`);
    }
  });

  for (const route of routes) {
    console.log(`=== ${route.label} (${route.path}) ===`);
    await page.goto(`http://localhost:5173${route.path}`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(800);
    const bodyText = await page.locator("body").innerText();
    console.log(bodyText.slice(0, 500));
    console.log();
  }

  console.log("=== ERRORS COLLECTED ===");
  console.log(errors.length === 0 ? "none" : errors.join("\n"));
  await browser.close();
  process.exit(errors.length === 0 ? 0 : 1);
})();
