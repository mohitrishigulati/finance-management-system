// Acceptance tests T1-T3 (BLUEPRINT.md §17), run against a live dev server.
//
// Prerequisites:
//   1. Postgres running, migrations applied:  pnpm db:migrate
//   2. Dev server running:                    pnpm dev   (localhost:3000)
//   3. Meera fixture seeded:                  pnpm db:seed:meera
//      (note the "owner user_id" it prints — pass it as MEERA_USER_ID below)
//
// Run:  MEERA_USER_ID=<uuid> node tests/acceptance.mjs
//
// T0 (finance-core formulas) has its own suite: pnpm test:core
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const MEERA_USER_ID = process.env.MEERA_USER_ID;

if (!MEERA_USER_ID) {
  console.error("Set MEERA_USER_ID to the owner user_id printed by `pnpm db:seed:meera`.");
  process.exit(1);
}

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`PASS  ${name}`);
  } else {
    console.error(`FAIL  ${name}`);
    failures++;
  }
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
await context.addCookies([{ name: "fos_dev_user_id", value: MEERA_USER_ID, domain: "localhost", path: "/" }]);

// --- T2: Cash Today shows Runway 9 days, Operating ₹1,10,000, colour red ---
await page.goto(`${BASE_URL}/cash-today`, { waitUntil: "networkidle" });
const bodyText = await page.textContent("main");
check("T2: shows 9 days runway", bodyText.includes("9 days"));
check("T2: shows Operating ₹1,10,000", bodyText.includes("₹1,10,000"));
const runwayColourClass = await page.locator("text=9 days").first().getAttribute("class");
check("T2: runway is coloured red", (runwayColourClass ?? "").includes("text-red"));
await page.screenshot({ path: path.join(__dirname, "screenshots", "cash-today-390px.png"), fullPage: true });

// --- T1: re-uploading the same statement creates zero new rows ---
await page.goto(`${BASE_URL}/import`, { waitUntil: "networkidle" });
const fixtureCsv = path.join(__dirname, "fixtures", "sample-statement.csv");
await page.setInputFiles("#file", fixtureCsv);
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle" }), page.click('button[type="submit"]')]);
const firstImportUrl = new URL(page.url());
const firstImported = Number(firstImportUrl.searchParams.get("imported"));

await page.goto(`${BASE_URL}/import`, { waitUntil: "networkidle" });
await page.setInputFiles("#file", fixtureCsv);
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle" }), page.click('button[type="submit"]')]);
const secondImportUrl = new URL(page.url());
check("T1: first import inserts new rows", firstImported > 0 || secondImportUrl.searchParams.get("duplicate") === "3");
check(
  "T1: re-uploading the same file creates zero new rows",
  secondImportUrl.searchParams.get("imported") === "0" && secondImportUrl.searchParams.get("duplicate") === "3",
);

// --- T3: daily message sent once, second same-day run sends nothing ---
const firstRun = await (await fetch(`${BASE_URL}/api/cron/daily-cash-message`)).json();
const secondRun = await (await fetch(`${BASE_URL}/api/cron/daily-cash-message`)).json();
check("T3: first run either sends or was already sent earlier today", firstRun.sent.length + firstRun.skipped.length > 0);
check("T3: second run the same day sends nothing", secondRun.sent.length === 0);

await browser.close();

console.log(failures === 0 ? "\nAll acceptance checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
