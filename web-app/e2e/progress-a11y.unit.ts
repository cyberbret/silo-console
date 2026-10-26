// Copyright (c) 2026 Pigsty
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test, expect, chromium, Browser, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { build } from "vite";
import { fileURLToPath } from "node:url";
import { browserExecutable } from "./fixtures/browserExecutable";

let script: string, browser: Browser, page: Page;
test.beforeAll(async () => {
  const old = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const result = await build({
      configFile: false,
      logLevel: "silent",
      define: { "process.env.NODE_ENV": '"production"' },
      resolve: { tsconfigPaths: true },
      build: {
        write: false,
        lib: {
          entry: fileURLToPath(
            new URL("./fixtures/progressHarness.tsx", import.meta.url),
          ),
          formats: ["iife"],
          name: "ProgressHarness",
        },
      },
    });
    const output = Array.isArray(result) ? result[0] : result;
    if (!("output" in output)) throw new Error("Missing harness output");
    script = output.output
      .filter((item) => item.type === "chunk")
      .map((item) => item.code)
      .join("\n");
  } finally {
    if (old === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = old;
  }
  browser = await chromium.launch({ executablePath: browserExecutable() });
});
test.beforeEach(async () => {
  page = await (await browser.newContext()).newPage();
  await page.route("http://progress.test/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<html lang="en"><head><title>Progress</title></head><body><div id="root"></div></body></html>',
    }),
  );
});
test.afterEach(async () => page.context().close());
test.afterAll(async () => browser?.close());
async function mount(query: string) {
  await page.goto(`http://progress.test/?${query}`);
  await page.addScriptTag({ content: script });
}

for (const [value, max, expected] of [
  [0, 0, 0],
  [NaN, 100, 0],
  [Infinity, 100, 0],
  [-Infinity, 100, 0],
  [50, NaN, 0],
  [50, Infinity, 0],
  [50, -1, 0],
  [50, 0, 0],
  [-25, 100, 0],
  [25, 100, 25],
  [100, 100, 100],
  [125, 100, 100],
  [Number.MAX_VALUE, Number.MAX_VALUE, 100],
])
  test(`determinate progress remains finite: ${value}/${max}`, async () => {
    await mount(
      new URLSearchParams({
        value: String(value),
        max: String(max),
      }).toString(),
    );
    const progress = page.getByRole("progressbar", {
      name: "Transfer",
      exact: true,
    });
    await expect(progress).toHaveAttribute("aria-valuenow", String(expected));
    await expect(progress).toHaveAttribute("aria-valuemin", "0");
    await expect(progress).toHaveAttribute("aria-valuemax", "100");
    await expect(page.locator(".progressPercentage")).toHaveText(
      `${expected}%`,
    );
    await expect(progress.locator(".percentageBar")).toHaveAttribute(
      "style",
      `transform: scaleX(${expected / 100});`,
    );
  });

test("indeterminate omits current value and cancellation retains measured progress", async () => {
  await mount("value=NaN&max=0&indeterminate");
  await expect(
    page.getByRole("progressbar", { name: "Transfer", exact: true }),
  ).not.toHaveAttribute("aria-valuenow");
  await expect(page.locator(".progressPercentage")).toHaveCount(0);
  await expect(
    page.getByRole("progressbar", { name: "Cancelled transfer" }),
  ).toHaveAttribute("aria-valuenow", "25");
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
});

for (const complete of [false, true])
  test(`Speedtest initial, zero duration, running and close: results=${complete}`, async () => {
    let socket: import("@playwright/test").WebSocketRoute | undefined;
    await page.routeWebSocket("**/ws/speedtest?*", (ws) => {
      socket = ws;
    });
    await mount("screen=speedtest");
    const progress = page.getByRole("progressbar");
    await expect(progress).toHaveAttribute("aria-valuenow", "0");
    const audit = await new AxeBuilder({ page }).analyze();
    expect(
      audit.violations.filter((v) =>
        ["moderate", "serious", "critical"].includes(v.impact || ""),
      ),
    ).toEqual([]);
    await page.getByLabel("Duration", { exact: true }).fill("0");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(progress).not.toHaveAttribute("aria-valuenow");
    await expect.poll(() => socket?.url()).toContain("duration=0s");
    if (complete)
      socket!.send(
        JSON.stringify({
          version: "test",
          servers: 1,
          disks: 4,
          size: 64,
          concurrent: 1,
        }),
      );
    await socket!.close();
    await expect(
      page.getByRole("button", {
        name: complete ? "Retest" : "Start",
        exact: true,
      }),
    ).toBeEnabled();
    const value = Number(await progress.getAttribute("aria-valuenow"));
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
    if (complete)
      await expect(progress).toHaveAttribute("aria-valuenow", "100");
  });

test("empty-state heading levels preserve page and nested section context", async () => {
  await mount("screen=headings");
  await expect(
    page.getByRole("heading", { name: "Page empty", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Section empty", level: 3 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Subsection empty", level: 4 }),
  ).toBeVisible();
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
});
