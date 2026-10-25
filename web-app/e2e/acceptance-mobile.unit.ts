// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import {
  chromium,
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
  type Route,
  type WebSocketRoute,
} from "@playwright/test";
import { buildHarness } from "./fixtures/buildHarness";
import { browserExecutable } from "./fixtures/browserExecutable";
import { emulateCoarsePointer } from "./fixtures/emulateCoarsePointer";

test.describe.configure({ mode: "serial" });
test.setTimeout(60_000);

let browser: Browser;
let page: Page;
let script: string;
let css: string;
let reads: string[] = [];
let writes: string[] = [];
let expectedWrites: string[] = [];
let unexpected: string[] = [];
let errors: string[] = [];
let socketUrls: string[] = [];
let closedSockets: number = 0;
let traceSocket: WebSocketRoute | undefined;
let pendingSiteRead: Route | undefined;
let pendingSiteWrites: Route[] = [];
let siteWritePayloads: unknown[] = [];

type Screen = "trace" | "profile" | "site";
type LayoutCase = {
  width: number;
  language: "en" | "zh";
  theme: "light" | "dark";
};

// The full integration suite owns the exhaustive language/theme matrix.
// These mounted cases pair both languages/themes at each critical width.
const layouts: LayoutCase[] = [
  { width: 390, language: "en", theme: "light" },
  { width: 390, language: "zh", theme: "dark" },
  { width: 768, language: "en", theme: "dark" },
  { width: 768, language: "zh", theme: "light" },
  { width: 1440, language: "en", theme: "light" },
  { width: 1440, language: "zh", theme: "dark" },
];

const firstEvent = {
  api: "s3.GetObject",
  time: "2026-10-24T12:34:56.123Z",
  statusCode: 201,
  statusMsg: "Created",
  host: "object-node-01.storage.example.invalid:9000",
  client: "198.51.100.45:53123",
  path: `/fixture/${"long-object-name-".repeat(12)}.json`,
  query: "versionId=fixture-version&partNumber=7",
  callStats: {
    timeToFirstByte: "2ms",
    duration: "12.34ms",
    rx: 1024,
    tx: 2048,
  },
};
const secondEvent = {
  ...firstEvent,
  time: "2026-10-24T12:34:57.456Z",
  statusCode: 503,
  statusMsg: "Service Unavailable",
  host: "object-node-02.storage.example.invalid:9000",
  client: "198.51.100.46:53124",
  path: "/fixture/second-object.json",
  query: "?versionId=second-version",
  callStats: { timeToFirstByte: "9ms", duration: "31ms", rx: 4096, tx: 8192 },
};

test.beforeAll(async () => {
  const result = await buildHarness({
    configFile: false,
    logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
    resolve: { tsconfigPaths: true },
    // Match vite.config.ts: the real Trace hook uses this CommonJS interop.
    legacy: { inconsistentCjsInterop: true },
    build: {
      write: false,
      lib: {
        entry: fileURLToPath(
          new URL("./fixtures/acceptanceMobileHarness.tsx", import.meta.url),
        ),
        name: "AcceptanceMobileHarness",
        formats: ["iife"],
      },
    },
  });
  const output = Array.isArray(result) ? result[0] : result;
  if (!("output" in output)) throw new Error("Missing mobile harness output");
  script = output.output
    .filter((item) => item.type === "chunk")
    .map((item) => item.code)
    .join("\n");
  css = output.output
    .filter((item) => item.type === "asset" && item.fileName.endsWith(".css"))
    .map((item) =>
      item.type === "asset"
        ? typeof item.source === "string"
          ? item.source
          : new TextDecoder().decode(item.source)
        : "",
    )
    .join("\n");
  expect(script).not.toBe("");
  expect(css).toContain("--page-padding");
  browser = await chromium.launch({ executablePath: browserExecutable() });
});

test.afterEach(async ({}, testInfo) => {
  let failed = testInfo.status !== testInfo.expectedStatus;
  const boundaryPath = testInfo.outputPath("mobile-network-boundary.json");
  await writeFile(
    boundaryPath,
    JSON.stringify({
      reads,
      writes,
      unexpected,
      errors,
      socketUrls,
      closedSockets,
    }),
  );
  await testInfo.attach("mobile-network-boundary", {
    contentType: "application/json",
    path: boundaryPath,
  });
  try {
    expect(
      writes,
      "only the explicitly mocked configuration POSTs are allowed",
    ).toEqual(expectedWrites);
    expect(
      unexpected,
      "all HTTP and WebSocket traffic is locally controlled",
    ).toEqual([]);
    expect(errors).toEqual([]);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    if (page && !page.isClosed()) {
      if (failed) {
        const screenshotPath = testInfo.outputPath("mobile-failure.png");
        await page.screenshot({ path: screenshotPath, fullPage: true });
        await testInfo.attach("mobile-failure", {
          path: screenshotPath,
          contentType: "image/png",
        });
      }
      await page.close();
    }
  }
});
test.afterAll(async () => browser?.close());

const siteResponse = (configured: boolean) =>
  configured
    ? {
        name: "primary",
        sites: [
          { name: "primary", endpoint: "https://primary.example.invalid:9000" },
          {
            name: "saved-peer",
            endpoint: "https://saved.example.invalid:9000",
          },
          {
            name: "second-saved-peer",
            endpoint: "https://second-saved.example.invalid:9000",
          },
        ],
      }
    : { name: "", sites: [] };

async function mount(
  screen: Screen,
  layout: LayoutCase = layouts[0],
  { configured = false, holdSiteRead = false, mockSitePost = false } = {},
) {
  page = await browser.newPage({
    viewport: { width: layout.width, height: 1000 },
    hasTouch: layout.width === 390,
    timezoneId: "UTC",
  });
  if (layout.width === 390) await emulateCoarsePointer(page);
  reads = [];
  writes = [];
  expectedWrites = [];
  unexpected = [];
  errors = [];
  socketUrls = [];
  closedSockets = 0;
  traceSocket = undefined;
  pendingSiteRead = undefined;
  pendingSiteWrites = [];
  siteWritePayloads = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const identity = `${request.method()} ${url.origin}${url.pathname}`;
    if (
      url.origin === "http://mobile.test" &&
      request.isNavigationRequest() &&
      url.pathname === "/"
    )
      return route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"></head><body><div id="root"></div></body></html>',
      });
    if (request.method() !== "GET") writes.push(identity);
    else reads.push(identity);
    if (
      screen === "site" &&
      mockSitePost &&
      url.origin === "http://mobile.test" &&
      url.pathname === "/api/v1/admin/site-replication" &&
      request.method() === "POST"
    ) {
      siteWritePayloads.push(request.postDataJSON());
      pendingSiteWrites.push(route);
      return;
    }
    if (
      screen === "site" &&
      url.origin === "http://mobile.test" &&
      url.pathname === "/api/v1/admin/site-replication" &&
      request.method() === "GET"
    ) {
      if (holdSiteRead) {
        pendingSiteRead = route;
        return;
      }
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(siteResponse(configured)),
      });
    }
    unexpected.push(identity);
    return route.abort();
  });
  // Never call connectToServer: every socket terminates inside Playwright.
  await page.routeWebSocket(/.*/, (socket) => {
    socketUrls.push(socket.url());
    const url = new URL(socket.url());
    if (
      screen !== "trace" ||
      url.hostname !== "mobile.test" ||
      url.pathname !== "/ws/trace"
    ) {
      unexpected.push(`WebSocket ${socket.url()}`);
      void socket.close({ code: 1008, reason: "Unexpected mounted socket" });
      return;
    }
    traceSocket = socket;
    socket.onClose(() => closedSockets++);
  });
  await page.goto(
    `http://mobile.test/?screen=${screen}&lang=${layout.language}&theme=${layout.theme}`,
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: script });
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    layout.theme,
  );
  await expect(page.locator("html")).toHaveAttribute(
    "lang",
    layout.language === "zh" ? "zh-CN" : "en",
  );
  const pageTitles = {
    trace: layout.language === "zh" ? "跟踪" : "Trace",
    profile: layout.language === "zh" ? "性能剖析" : "Profile",
    site: layout.language === "zh" ? "添加复制站点" : "Add Replication Site",
  };
  const pageHeading = page.getByRole("heading", { level: 1 });
  await expect(pageHeading).toHaveCount(1);
  await expect(pageHeading).toHaveText(pageTitles[screen]);
  await expect(pageHeading).toBeVisible();
  if (screen === "site" && !holdSiteRead)
    await expect(page.locator("#add-rep-peer-site-0")).toBeVisible();
}

async function assertContained(locator: Locator, minimumWidth = 1) {
  const main = await page.locator("#mobile-acceptance-main").boundingBox();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(minimumWidth);
  expect(box!.x).toBeGreaterThanOrEqual(main!.x - 1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(main!.x + main!.width + 1);
  return box!;
}

async function assertPageFits(width: number) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const main = document.getElementById("mobile-acceptance-main")!;
        return {
          outer: document.documentElement.scrollWidth,
          content: main.scrollWidth,
          available: main.clientWidth,
          left: main.getBoundingClientRect().left,
        };
      }),
    )
    .toEqual({
      outer: width,
      content: width >= 768 ? width - 240 : width,
      available: width >= 768 ? width - 240 : width,
      left: width >= 768 ? 240 : 0,
    });
}

async function assertCoarseTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(40);
  expect(box!.height).toBeGreaterThanOrEqual(40);
}

const traceRows = () =>
  page.locator("#trace-results [role=row][data-fluid-key]");

async function startTrace(event = firstEvent) {
  await page.locator("#start-trace").click();
  await expect(page.locator("#stop-trace")).toBeVisible();
  expect(traceSocket).toBeDefined();
  traceSocket!.send(JSON.stringify(event));
  await expect(traceRows().first()).toContainText(event.api);
}

async function stopTrace() {
  await page.locator("#stop-trace").click();
  await expect(page.locator("#start-trace")).toBeVisible();
  await expect.poll(() => closedSockets).toBe(1);
  expect(socketUrls).toHaveLength(1);
}

for (const layout of layouts) {
  const name = `${layout.width}px ${layout.language} ${layout.theme}`;
  test(`Trace preserves readable facts, filters and actions at ${name}`, async ({}, testInfo) => {
    await mount("trace", layout);
    const filterToggle = page.locator("#filter-toggle");
    const filterLabel = filterToggle.locator(".button-label");
    await expect(filterLabel).toHaveText(
      layout.language === "zh" ? "过滤条件" : "Filters",
    );
    await expect(filterLabel).toBeVisible();
    expect(
      await filterLabel.evaluate(
        (label) => label.scrollWidth <= label.clientWidth,
      ),
    ).toBe(true);
    const filterColors = await filterToggle.evaluate((button) => ({
      foreground: getComputedStyle(button).color,
      surface: getComputedStyle(
        button.closest(".trace-toolbar")!.parentElement!,
      ).backgroundColor,
      drawing: [
        ...button.querySelectorAll<SVGGraphicsElement>(
          "svg path, svg line, svg circle, svg rect, svg ellipse, svg polyline, svg polygon",
        ),
      ].map((part) => {
        const style = getComputedStyle(part);
        const bounds = part.getBBox();
        return {
          tag: part.tagName,
          stroke: style.stroke,
          fill: style.fill,
          strokeWidth: parseFloat(style.strokeWidth),
          width: bounds.width,
          height: bounds.height,
        };
      }),
    }));
    await testInfo.attach("filter-icon-paint", {
      body: JSON.stringify(filterColors, null, 2),
      contentType: "application/json",
    });
    expect(filterColors.drawing.length).toBeGreaterThan(0);
    for (const part of filterColors.drawing) {
      expect(part.stroke).toBe(filterColors.foreground);
      expect(part.fill).toBe("none");
      expect(part.strokeWidth).toBeGreaterThan(0);
      expect(part.width + part.height).toBeGreaterThan(0);
    }
    expect(filterColors.foreground).not.toBe(filterColors.surface);
    await expect(filterToggle).toHaveAttribute("aria-expanded", "false");
    await filterToggle.click();
    await expect(filterToggle).toHaveAttribute("aria-expanded", "true");
    const filters = page.locator("#trace-filters input");
    await expect(filters).toHaveCount(6);
    for (const input of await filters.all())
      await assertContained(
        input,
        (await input.getAttribute("type")) === "checkbox" ? 16 : 100,
      );
    await assertContained(page.locator("#filter-toggle"));
    await assertContained(page.locator("#start-trace"));
    await startTrace();
    const row = traceRows().first();
    const cells = row.locator(".mds-priority-high");
    await expect(cells).toHaveCount(4);
    await expect(cells.nth(0)).toHaveText(
      layout.width < 768 ? "12:34:56" : "12:34:56:123",
    );
    await expect(cells.nth(1)).toHaveText("s3.GetObject");
    await expect(cells.nth(2)).toHaveText(
      layout.width < 768 ? "201" : "201 Created",
    );
    await assertContained(cells.nth(0), 76);
    await assertContained(cells.nth(1), 100);
    await assertContained(cells.nth(2), 64);
    for (const cell of (await cells.all()).slice(0, 3)) {
      const dimensions = await cell.evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    }
    for (const column of await row.locator(".mds-priority-low").all())
      await expect(column).toBeVisible({ visible: layout.width >= 1200 });
    if (layout.width === 390) {
      await assertCoarseTarget(page.locator("#filter-toggle"));
      await assertCoarseTarget(page.locator("#stop-trace"));
      await assertCoarseTarget(row.getByRole("button"));
    }
    await assertPageFits(layout.width);
    if (layout.width === 768) {
      const action = row.getByRole("button");
      const actionName = `${layout.language === "zh" ? "查看" : "View"} ${firstEvent.api}`;
      const hint = page.getByRole("tooltip", {
        name: actionName,
        exact: true,
      });
      await expect(action).toHaveAccessibleName(actionName);
      await expect(action).toHaveAttribute("aria-haspopup", "dialog");
      await expect(action).toHaveAttribute("aria-expanded", "false");
      await action.hover();
      await expect(hint).toBeVisible();
      await action.click();
      // Keep the pointer at the trigger: its hint must not float above the
      // event dialog, even when the trigger sits outside the dialog panel.
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(hint).toHaveCount(0);
      await expect(action).toHaveAccessibleName(actionName);
      await expect(action).toHaveAttribute("aria-expanded", "true");
      await expect(dialog.locator("dd").first()).toHaveText(firstEvent.api);
      const screenshotPath = testInfo.outputPath("trace-detail-hover.png");
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await testInfo.attach("trace-detail-hover", {
        path: screenshotPath,
        contentType: "image/png",
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(action).toBeFocused();
      await expect(action).toHaveAttribute("aria-expanded", "false");
      // Hints remain available after the dialog closes and the pointer returns.
      await page.locator("#trace-results-title").focus();
      await expect(page.locator("#trace-results-title")).toBeFocused();
      await page.mouse.move(0, 0);
      await expect(hint).toHaveCount(0);
      await action.hover();
      await expect(hint).toBeVisible();
      await page.mouse.move(0, 0);
      await expect(hint).toHaveCount(0);
    }
    await stopTrace();
    if (layout.width === 390) {
      const screenshotPath = testInfo.outputPath("trace-mobile.png");
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await testInfo.attach("trace-mobile", {
        path: screenshotPath,
        contentType: "image/png",
      });
    }
  });

  test(`Profile choices and action alignment fit ${name}`, async () => {
    await mount("profile", layout);
    const group = page.locator('[aria-labelledby="profile-types-label"]');
    await expect(group.getByRole("checkbox")).toHaveCount(5);
    for (const input of await group.getByRole("checkbox").all()) {
      await expect(input).toBeChecked();
      await assertContained(input);
      if (layout.width === 390) await assertCoarseTarget(input);
    }
    const start = await assertContained(page.locator("#start-profiling"));
    const stop = await assertContained(page.locator("#stop-profiling"));
    if (layout.width === 390) {
      expect(start.x).toBe(stop.x);
      expect(start.width).toBe(stop.width);
      expect(start.width).toBeGreaterThanOrEqual(300);
      expect(stop.y).toBeGreaterThanOrEqual(start.y + start.height + 7);
      await assertCoarseTarget(page.locator("#start-profiling"));
      await assertCoarseTarget(page.locator("#stop-profiling"));
    } else {
      expect(start.y).toBe(stop.y);
      expect(stop.x).toBeGreaterThanOrEqual(start.x + start.width + 7);
    }
    await assertPageFits(layout.width);
    expect(socketUrls).toEqual([]);
  });

  test(`Site fields, labels and actions fit ${name}`, async ({}, testInfo) => {
    await mount("site", layout);
    const rows = page.locator(".site-input-row");
    await expect(rows).toHaveCount(2);
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
    const controls = page.locator("form input");
    await expect(controls).toHaveCount(8);
    const associations = await controls.evaluateAll((inputs) =>
      inputs.map((node) => {
        const input = node as HTMLInputElement;
        return {
          id: input.id,
          name: input.name,
          labels: [...(input.labels || [])].map((label) =>
            label.textContent?.trim(),
          ),
        };
      }),
    );
    expect(new Set(associations.map((item) => item.id)).size).toBe(8);
    expect(new Set(associations.map((item) => item.name)).size).toBe(8);
    for (const item of associations) {
      expect(item.id).toBe(item.name);
      expect(item.labels).toHaveLength(1);
      expect(item.labels[0]).toBeTruthy();
    }
    for (const row of await rows.all()) {
      const boxes = [];
      for (const input of await row.locator("input").all())
        boxes.push(
          await assertContained(input, layout.width === 390 ? 260 : 130),
        );
      if (layout.width === 390) {
        for (let index = 1; index < boxes.length; index++) {
          expect(boxes[index].x).toBe(boxes[0].x);
          expect(boxes[index].width).toBe(boxes[0].width);
          expect(boxes[index].y).toBeGreaterThan(
            boxes[index - 1].y + boxes[index - 1].height,
          );
        }
      } else if (layout.width === 1440) {
        for (const box of boxes) expect(box.y).toBe(boxes[0].y);
      }
    }
    await expect(page.locator('form input[type="password"]')).toHaveCount(2);
    const add = await assertContained(page.locator("#add-peer-row-0"));
    await assertContained(page.locator("#remove-peer-row-0"));
    if (layout.width === 1440) {
      const peerField = await page
        .locator("#add-rep-peer-site-0")
        .boundingBox();
      expect(Math.abs(add.y - peerField!.y)).toBeLessThan(1);
      for (const suffix of ["", "-ep", "-ac", "-sk"]) {
        const current = await page
          .locator(`#add-rep-current-site${suffix}-0`)
          .boundingBox();
        const peer = await page
          .locator(`#add-rep-peer-site${suffix}-0`)
          .boundingBox();
        expect(current!.x).toBe(peer!.x);
        expect(current!.width).toBe(peer!.width);
      }
    }
    await page.locator("#save").scrollIntoViewIfNeeded();
    await expect(page.locator("#save")).toBeInViewport();
    await assertContained(page.locator("#save"));
    await assertContained(page.locator("#clear"));
    if (layout.width === 390) {
      for (const id of ["save", "clear", "add-peer-row-0", "remove-peer-row-0"])
        await assertCoarseTarget(page.locator(`#${id}`));
      for (const button of await rows.locator(".overlayAction button").all())
        await assertCoarseTarget(button);
    }
    await assertPageFits(layout.width);
    expect(reads).toEqual([
      "GET http://mobile.test/api/v1/admin/site-replication",
    ]);
    const help = page.locator(".helpbox-container");
    await expect(help.getByRole("listitem")).toHaveCount(12);
    expect(
      await help.locator("ul").evaluateAll((lists) =>
        lists.map((list) => ({
          marker: getComputedStyle(list).listStyleType,
          children: list.children.length,
        })),
      ),
    ).toEqual([
      { marker: "disc", children: 6 },
      { marker: "circle", children: 4 },
      { marker: "circle", children: 2 },
    ]);
    expect(
      await help
        .locator("li")
        .evaluateAll((items) =>
          items.map((item) => getComputedStyle(item, "::before").content),
        ),
    ).toEqual(Array(12).fill("none"));
    if (layout.width === 390) {
      const screenshotPath = testInfo.outputPath("site-mobile.png");
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await testInfo.attach("site-mobile", {
        path: screenshotPath,
        contentType: "image/png",
      });
    }
  });
}

test("Trace details select the exact same-name event and restore row or icon focus", async ({}, testInfo) => {
  await mount("trace");
  await startTrace();
  traceSocket!.send(JSON.stringify(secondEvent));
  await expect(traceRows()).toHaveCount(2);
  const firstRow = traceRows().first();
  const firstAction = firstRow.getByRole("button");
  const originalKey = await firstRow.getAttribute("data-fluid-key");
  const originalAction = await firstAction.elementHandle();
  const grid = page.locator("#trace-results .ReactVirtualized__Grid");
  const expandedHeight = await grid.evaluate((node) => node.clientHeight);
  await firstAction.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("dd")).toHaveText([
    firstEvent.api,
    firstEvent.time,
    "201 Created",
    `${firstEvent.host} · ${firstEvent.client}`,
    `${firstEvent.path}?${firstEvent.query}`,
    "12.34ms",
    "1.0 KiB",
    "2.0 KiB",
  ]);
  const path = dialog.locator("dd").nth(4);
  expect((await path.boundingBox())!.height).toBeGreaterThan(40);
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  // Live records and a viewport change can recycle the row while its detail
  // stays open. Return to the same action even when its DOM node was replaced.
  for (let index = 0; index < 20; index++) {
    const api = `s3.Reflow${String(index).padStart(2, "0")}`;
    traceSocket!.send(JSON.stringify({ ...secondEvent, api }));
    await expect(traceRows().filter({ hasText: api })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 400 });
  // A row can already be outside the virtual range before resizing. Wait for
  // the real short layout so the two viewport changes cannot be coalesced.
  await expect
    .poll(() => grid.evaluate((node) => node.clientHeight))
    .toBeLessThan(expandedHeight);
  const shortLayout = await grid.evaluate((node) => ({
    height: node.clientHeight,
    scrollTop: node.scrollTop,
    scrollHeight: node.scrollHeight,
  }));
  await expect(
    page.locator(`#trace-results [data-fluid-key="${originalKey}"]`),
  ).toHaveCount(0);
  expect(await originalAction!.evaluate((button) => button.isConnected)).toBe(
    false,
  );
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect
    .poll(() => grid.evaluate((node) => node.clientHeight))
    .toBe(expandedHeight);
  await testInfo.attach("trace-resize-layout", {
    contentType: "application/json",
    body: JSON.stringify({
      shortLayout,
      expandedLayout: await grid.evaluate((node) => ({
        height: node.clientHeight,
        scrollTop: node.scrollTop,
        scrollHeight: node.scrollHeight,
      })),
    }),
  });
  await expect(
    page.locator(`#trace-results [data-fluid-key="${originalKey}"]`),
  ).toHaveCount(1);
  const rebuiltAction = await firstAction.elementHandle();
  const identity = {
    originalConnected: await originalAction!.evaluate(
      (button) => button.isConnected,
    ),
    rebuiltConnected: await rebuiltAction!.evaluate(
      (button) => button.isConnected,
    ),
    sameNode: await originalAction!.evaluate(
      (button, rebuilt) => button === rebuilt,
      rebuiltAction,
    ),
  };
  expect(identity).toEqual({
    originalConnected: false,
    rebuiltConnected: true,
    sameNode: false,
  });
  await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  // The focused icon opens the shared tooltip. Escape dismisses the nearest
  // layer first; the second Escape then closes the modal and restores focus.
  await expect(page.getByRole("tooltip", { name: "Close" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await testInfo.attach("trace-rebuilt-action-focus", {
    contentType: "application/json",
    body: JSON.stringify({
      ...identity,
      active: await page.evaluate(() => ({
        tag: document.activeElement?.tagName,
        role: document.activeElement?.getAttribute("role"),
        label: document.activeElement?.getAttribute("aria-label"),
      })),
      buttonFocused: await firstAction.evaluate(
        (button) => button === document.activeElement,
      ),
      rowFocused: await firstRow.evaluate(
        (row) => row === document.activeElement,
      ),
    }),
  });
  await expect(firstAction).toBeFocused();
  const secondRow = traceRows().nth(1);
  await secondRow.focus();
  await page.keyboard.press("Space");
  await expect(dialog.locator("dd")).toHaveText([
    secondEvent.api,
    secondEvent.time,
    "503 Service Unavailable",
    `${secondEvent.host} · ${secondEvent.client}`,
    `${secondEvent.path}?versionId=second-version`,
    "31ms",
    "4.0 KiB",
    "8.0 KiB",
  ]);
  await dialog.locator(".closeModalButton").click();
  await expect(secondRow).toBeFocused();
  await secondRow.click();
  await expect(dialog.locator("dd").nth(1)).toHaveText(secondEvent.time);
  await page.keyboard.press("Escape");
  await expect(secondRow).toBeFocused();
  await stopTrace();
});

test("Trace keeps filter semantics and a stable detail while live rows leave the viewport", async () => {
  await mount("trace", layouts[2]);
  await page.locator("#filter-toggle").click();
  await page.locator("#trace-status-code").fill("503");
  await page.locator("#trace-method").fill("GET");
  await page.locator("#trace-function-name").fill("GetObject");
  await page.locator("#trace-path").fill("/fixture/*");
  await page.locator("#trace-fthreshold").fill("25");
  await page.locator("#only_errors").check();
  await page.locator("#internal_calls").check();
  await startTrace(secondEvent);
  const parameters = new URL(socketUrls[0]).searchParams;
  expect(Object.fromEntries(parameters)).toEqual({
    calls: "s3,internal",
    threshold: "25",
    onlyErrors: "yes",
    statusCode: "503",
    method: "GET",
    funcname: "GetObject",
    path: "/fixture/*",
  });
  for (const input of await page.locator("#trace-filters input").all())
    await expect(input).toBeDisabled();
  const originalKey = await traceRows().first().getAttribute("data-fluid-key");
  await traceRows().first().getByRole("button").click();
  const dialog = page.getByRole("dialog");
  for (let index = 0; index < 36; index++) {
    const api = `s3.Live${String(index).padStart(2, "0")}`;
    traceSocket!.send(JSON.stringify({ ...secondEvent, api }));
    await expect(traceRows().filter({ hasText: api })).toBeVisible();
  }
  await expect(page.locator(`[data-fluid-key="${originalKey}"]`)).toHaveCount(
    0,
  );
  await expect(dialog.locator("dd").nth(0)).toHaveText(secondEvent.api);
  await expect(dialog.locator("dd").nth(1)).toHaveText(secondEvent.time);
  await page.keyboard.press("Escape");
  await expect(page.locator("#trace-results-title")).toBeFocused();
  await stopTrace();
  for (const input of await page.locator("#trace-filters input").all())
    await expect(input).toBeEnabled();
});

test("Profile labels and keyboard selection affect only the intended choice without opening a socket", async () => {
  await mount("profile", layouts[1]);
  for (const type of ["cpu", "mem", "block", "mutex", "goroutines"]) {
    await page.locator(`label[for="checkbox-${type}"]`).click();
    await expect(page.locator(`#checkbox-${type}`)).not.toBeChecked();
  }
  await expect(page.locator("#start-profiling")).toBeDisabled();
  await expect(page.locator("#stop-profiling")).toBeDisabled();
  await page.locator("#checkbox-cpu").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#checkbox-cpu")).toBeChecked();
  for (const type of ["mem", "block", "mutex", "goroutines"])
    await expect(page.locator(`#checkbox-${type}`)).not.toBeChecked();
  await expect(page.locator("#start-profiling")).toBeEnabled();
  expect(socketUrls).toEqual([]);
});

test("Site insertion and removal preserve values, touched state, focus and secret visibility by row identity", async () => {
  await mount("site");
  const peerLabel = page.locator('label[for="add-rep-peer-site-0"]');
  const peerLabelTop = await peerLabel.evaluate(
    (label) => label.getBoundingClientRect().top + window.scrollY,
  );
  await page.locator('label[for="add-rep-current-site-ac-0"]').click();
  await expect(page.locator("#add-rep-current-site-ac-0")).toBeFocused();
  await peerLabel.click();
  await expect(page.locator("#add-rep-peer-site-0")).toBeFocused();
  expect(
    await peerLabel.evaluate(
      (label) => label.getBoundingClientRect().top + window.scrollY,
    ),
  ).toBe(peerLabelTop);
  await expect(page.locator("#add-rep-current-site-ac-0")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#add-rep-peer-site-ac-0")).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.locator("#add-rep-current-site-0").fill("current-draft");
  await page.locator("#add-rep-peer-site-0").fill("original-peer");
  await expect(page.locator("#remove-peer-row-0")).toBeDisabled();
  await page.locator("#add-peer-row-0").click();
  await expect(page.locator("#add-rep-peer-site-1")).toBeFocused();
  await page.locator("#add-rep-peer-site-1").fill("retained-peer");
  await page
    .locator("#add-rep-peer-site-ep-1")
    .fill("invalid-retained-endpoint");
  await page.locator("#add-rep-peer-site-ac-1").fill("retained-access-key");
  await page.locator("#add-rep-peer-site-sk-1").fill("fixture-secret-only");
  await page.locator("#add-peer-row-0").click();
  await expect(page.locator("#add-rep-peer-site-1")).toBeFocused();
  await expect(page.locator("#add-rep-peer-site-1")).toHaveValue("");
  await expect(page.locator("#add-rep-peer-site-ep-1")).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#add-rep-peer-site-2")).toHaveValue(
    "retained-peer",
  );
  await expect(page.locator("#add-rep-peer-site-ep-2")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#add-rep-peer-site-ac-2")).toHaveValue(
    "retained-access-key",
  );
  await expect(page.locator("#add-rep-peer-site-sk-2")).toHaveValue(
    "fixture-secret-only",
  );
  await page.locator("#remove-peer-row-1").click();
  await expect(page.locator("#add-peer-row-0")).toBeFocused();
  await expect(page.locator("#add-rep-peer-site-0")).toHaveValue(
    "original-peer",
  );
  await expect(page.locator("#add-rep-peer-site-1")).toHaveValue(
    "retained-peer",
  );
  await expect(page.locator("#add-rep-peer-site-ep-1")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  const secret = page.locator("#add-rep-peer-site-sk-1");
  await expect(secret).toHaveAttribute("type", "password");
  const reveal = secret
    .locator("..")
    .getByRole("button", { name: "Show password", exact: true });
  await assertCoarseTarget(reveal);
  await reveal.focus();
  await page.keyboard.press("Enter");
  await expect(secret).toHaveAttribute("type", "text");
  await page.locator("#clear").click();
  await expect(page.locator(".site-input-row")).toHaveCount(2);
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
  await expect(page.locator('form input[type="password"]')).toHaveCount(2);
  await expect(page.locator("#add-rep-current-site-0")).toHaveValue("");
  await expect(page.locator("#add-rep-peer-site-0")).toHaveValue("");
  await expect(page.locator("#add-rep-current-site-ep-0")).toHaveValue(
    "https://primary.example.invalid:9000",
  );
  await assertPageFits(390);
});

test("Site invalid submit exposes associated errors in field order and never posts", async () => {
  await mount("site", layouts[3]);
  await page
    .locator("#add-rep-current-site-ep-0")
    .fill("invalid-current-endpoint");
  await page.locator("#save").click();
  await expect(page.locator("#add-rep-current-site-ep-0")).toBeFocused();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(6);
  for (const input of await page.locator('[aria-invalid="true"]').all()) {
    const id = await input.getAttribute("id");
    await expect(input).toHaveAttribute("aria-describedby", `${id}-error`);
    await expect(page.locator(`#${id}-error`)).toBeVisible();
  }
  await page
    .locator("#add-rep-current-site-ep-0")
    .fill("https://primary.example.invalid:9000");
  await page.locator("#add-rep-current-site-ac-0").fill("fixture-current-key");
  await page
    .locator("#add-rep-current-site-sk-0")
    .fill("fixture-current-secret");
  await page.locator("#save").click();
  await expect(page.locator("#add-rep-peer-site-ep-0")).toBeFocused();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(3);
  await page
    .locator("#add-rep-peer-site-ep-0")
    .fill("https://peer.example.invalid:9000");
  await page.locator("#save").click();
  await expect(page.locator("#add-rep-peer-site-ac-0")).toBeFocused();
  await page.locator("#add-rep-peer-site-ac-0").fill("fixture-peer-key");
  await page.locator("#save").click();
  await expect(page.locator("#add-rep-peer-site-sk-0")).toBeFocused();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(1);
  await assertPageFits(768);
});

test("Site loading freezes controls and configured sites require fresh credentials", async () => {
  await mount("site", layouts[4], { configured: true, holdSiteRead: true });
  await expect.poll(() => !!pendingSiteRead).toBe(true);
  await expect(page.locator("#save")).toBeDisabled();
  await expect(page.locator("#clear")).toBeDisabled();
  await expect(page.locator("#add-rep-current-site-0")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(page.locator("#add-rep-current-site-ac-0")).toBeDisabled();
  await pendingSiteRead!.fulfill({
    contentType: "application/json",
    body: JSON.stringify(siteResponse(true)),
  });
  await expect(page.locator("#add-rep-peer-site-0")).toHaveValue("saved-peer");
  await expect(page.locator("#remove-peer-row-0")).toBeDisabled();
  await expect(page.locator("#add-rep-peer-site-1")).toHaveValue(
    "second-saved-peer",
  );
  await expect(page.locator("#remove-peer-row-1")).toBeDisabled();
  await expect(page.locator("#save")).toBeEnabled();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
  await page.locator("#save").click();
  await expect(page.locator("#add-rep-current-site-ac-0")).toBeFocused();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(6);
  await expect(page.locator("#add-rep-current-site-ep-0")).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.locator("#add-peer-row-0").click();
  await expect(page.locator("#add-rep-peer-site-1")).toBeFocused();
  await expect(page.locator("#remove-peer-row-1")).toBeEnabled();
  await expect(page.locator("#remove-peer-row-0")).toBeDisabled();
  await expect(page.locator("#add-rep-peer-site-2")).toHaveValue(
    "second-saved-peer",
  );
  await expect(page.locator("#remove-peer-row-2")).toBeDisabled();
});

test("Site valid payload is exact, pending writes freeze the form, and failure preserves a retryable draft", async () => {
  await mount("site", layouts[0], { mockSitePost: true });
  expectedWrites = Array(2).fill(
    "POST http://mobile.test/api/v1/admin/site-replication",
  );
  const draft = [
    {
      kind: "current",
      index: 0,
      name: "",
      endpoint: "  https://primary.example.invalid:9000  ",
      accessKey: "fixture-current-access",
      secretKey: "fixture-current-secret",
    },
    {
      kind: "peer",
      index: 0,
      name: "",
      endpoint: " https://first.example.invalid:9000 ",
      accessKey: "fixture-first-access",
      secretKey: "fixture-first-secret",
    },
    {
      kind: "peer",
      index: 1,
      name: "named-peer",
      endpoint: " https://second.example.invalid:9000 ",
      accessKey: "fixture-second-access",
      secretKey: "fixture-second-secret",
    },
  ];
  await page.locator("#add-peer-row-0").click();
  for (const site of draft) {
    const prefix = `#add-rep-${site.kind}-site`;
    await page.locator(`${prefix}-${site.index}`).fill(site.name);
    await page.locator(`${prefix}-ep-${site.index}`).fill(site.endpoint);
    await page.locator(`${prefix}-ac-${site.index}`).fill(site.accessKey);
    await page.locator(`${prefix}-sk-${site.index}`).fill(site.secretKey);
  }
  const expectedPayload = [
    {
      name: "",
      endpoint: "https://primary.example.invalid:9000",
      accessKey: "fixture-current-access",
      secretKey: "fixture-current-secret",
    },
    {
      name: "dr-site-0",
      endpoint: "https://first.example.invalid:9000",
      accessKey: "fixture-first-access",
      secretKey: "fixture-first-secret",
    },
    {
      name: "named-peer",
      endpoint: "https://second.example.invalid:9000",
      accessKey: "fixture-second-access",
      secretKey: "fixture-second-secret",
    },
  ];
  await page.locator("#save").click();
  await expect.poll(() => pendingSiteWrites.length).toBe(1);
  expect(siteWritePayloads).toEqual([expectedPayload]);
  for (const input of await page.locator("form input").all())
    await expect(input).not.toBeEditable();
  for (const id of [
    "save",
    "clear",
    "add-peer-row-0",
    "remove-peer-row-0",
    "add-peer-row-1",
    "remove-peer-row-1",
  ])
    await expect(page.locator(`#${id}`)).toBeDisabled();
  await page.locator("form").evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  expect(pendingSiteWrites).toHaveLength(1);
  await pendingSiteWrites[0].fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({
      message: "Fixture replication unavailable",
      detailedMessage: "Controlled failure; no backend was contacted.",
    }),
  });
  await expect(page.locator("#save")).toBeEnabled();
  await expect(page.locator("#clear")).toBeEnabled();
  await expect(page.locator("#remove-peer-row-1")).toBeEnabled();
  for (const site of draft) {
    const prefix = `#add-rep-${site.kind}-site`;
    await expect(page.locator(`${prefix}-${site.index}`)).toHaveValue(
      site.name,
    );
    await expect(page.locator(`${prefix}-ep-${site.index}`)).toHaveValue(
      site.endpoint,
    );
    await expect(page.locator(`${prefix}-ac-${site.index}`)).toHaveValue(
      site.accessKey,
    );
    await expect(page.locator(`${prefix}-sk-${site.index}`)).toHaveValue(
      site.secretKey,
    );
  }
  await expect(page.locator('form input[type="password"]')).toHaveCount(3);
  expect(reads).toEqual([
    "GET http://mobile.test/api/v1/admin/site-replication",
  ]);
  await page.locator("#save").click();
  await expect.poll(() => pendingSiteWrites.length).toBe(2);
  expect(siteWritePayloads).toEqual([expectedPayload, expectedPayload]);
  await pendingSiteWrites[1].fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ message: "Fixture retry unavailable" }),
  });
  await expect(page.locator("#save")).toBeEnabled();
  await expect(page.locator("#add-rep-peer-site-1")).toHaveValue("named-peer");
  expect(writes).toEqual(expectedWrites);
});
