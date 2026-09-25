#!/usr/bin/env node
/**
 * Responsive smoke test — checks admin dashboard routes at mobile/tablet/desktop
 * widths and reports any horizontal-overflow or clipped controls.
 *
 * Usage:
 *   node scripts/responsive-smoke.mjs
 *
 * Requires: dev server on http://localhost:8080 and a Supabase session already
 * present in browser storage (run after signing in via the preview). For CI, wire
 * in the LOVABLE_BROWSER_SUPABASE_* env vars — see AGENTS.md `browser-use`.
 */
import { chromium } from "playwright";

const ROUTES = [
  "/dashboard/admin",
  "/dashboard/admin/overview",
  "/dashboard/admin/schools",
  "/dashboard/admin/students",
  "/dashboard/admin/instructors",
  "/dashboard/admin/terms",
  "/dashboard/admin/invoices",
  "/dashboard/admin/whitelist",
  "/dashboard/admin/audit-log",
  "/dashboard/admin/promotion",
];

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
];

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:8080";

const problems = [];

const browser = await chromium.launch({ headless: true });
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    for (const route of ROUTES) {
      try {
        await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 15_000 });
        await page.waitForTimeout(400);
        const res = await page.evaluate(() => {
          const de = document.documentElement;
          const overflow = de.scrollWidth - de.clientWidth;
          const wide = [];
          for (const el of document.querySelectorAll("main *")) {
            const r = el.getBoundingClientRect();
            if (r.width > window.innerWidth + 1 && !el.closest("[class*='overflow-x-auto']")) {
              wide.push({
                tag: el.tagName,
                cls: el.className?.toString?.().slice(0, 60),
                w: Math.round(r.width),
              });
              if (wide.length >= 3) break;
            }
          }
          return { overflow, wide };
        });
        if (res.overflow > 0 || res.wide.length) {
          problems.push({ route, viewport: vp.name, ...res });
        }
      } catch (e) {
        problems.push({ route, viewport: vp.name, error: String(e.message || e) });
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

if (!problems.length) {
  console.log(
    "✓ No responsive regressions across",
    ROUTES.length,
    "routes ×",
    VIEWPORTS.length,
    "viewports.",
  );
  process.exit(0);
}
console.error("✗ Responsive issues detected:");
for (const p of problems) console.error("  ·", p.viewport, p.route, "→", JSON.stringify(p));
process.exit(1);
