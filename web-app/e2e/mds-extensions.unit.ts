// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { fileURLToPath } from "node:url";
import { Browser, Page, chromium, expect, test } from "@playwright/test";
import { build } from "vite";
import { browserExecutable } from "./fixtures/browserExecutable";
import { emulateCoarsePointer } from "./fixtures/emulateCoarsePointer";

test.describe.configure({ mode: "serial" });
let browser: Browser;
let page: Page;
let script: string;

test.beforeAll(async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const result = await build({
      configFile: false,
      logLevel: "silent",
      define: { "process.env.NODE_ENV": '"production"' },
      build: {
        write: false,
        lib: {
          entry: fileURLToPath(
            new URL("./fixtures/mdsExtensionsHarness.tsx", import.meta.url),
          ),
          name: "ExtensionsHarness",
          formats: ["iife"],
        },
      },
    });
    const output = Array.isArray(result) ? result[0] : result;
    if (!("output" in output))
      throw new Error("MDS harness build has no output");
    const chunk = output.output.find((item) => item.type === "chunk");
    if (!chunk || chunk.type !== "chunk")
      throw new Error("MDS harness has no script");
    script = chunk.code;
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
  browser = await chromium.launch({ executablePath: browserExecutable() });
});

test.beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: script });
});
test.afterEach(async () => {
  await page.close();
});
test.afterAll(async () => {
  await browser?.close();
});

test("menu toggle is a named native button with keyboard activation and opt-in indicator", async ({}, testInfo) => {
  const toggle = page.getByRole("button", {
    name: "Collapse menu",
    exact: true,
  });
  await page.locator("#drawer-trigger").focus();
  await page.keyboard.press("Tab");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  const expand = page.getByRole("button", { name: "Expand menu", exact: true });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".menuBox")).toHaveCSS("width", "72px");
  await expect(page.locator(".menuLogoContainer")).toBeHidden();
  await expect(page.locator(".collapsedMenuHeader")).toBeVisible();
  const descriptions = page.locator(".menuBox [hidden]");
  expect(await descriptions.count()).toBeGreaterThan(0);
  expect(
    await descriptions.evaluateAll((items) =>
      items.every((item) => getComputedStyle(item).display === "none"),
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Leave console" }),
  ).toBeVisible();
  await expand.press("Space");
  await expect(toggle).toBeVisible();
  const active = page.getByRole("button", { name: "Buckets", exact: true });
  await expect(active).toHaveCSS("box-shadow", "none");
  await page.locator("#indicator").click();
  await expect(active).toHaveCSS(
    "box-shadow",
    "rgb(224, 163, 92) 3px 0px 0px 0px inset",
  );

  await page.locator("#stable-brand").click();
  const brand = page.locator("button.brandHeader");
  const mark = brand.locator(".brandMark");
  const brandNode = await brand.elementHandle();
  const markNode = await mark.elementHandle();
  await expect(brand).toHaveAccessibleName("Collapse menu");
  await expect(page.locator(".brandToggleSlot")).toHaveCount(0);
  const expandedMark = (await mark.boundingBox())!;
  expect(expandedMark.width).toBe(28);
  expect(expandedMark.height).toBe(28);
  expect((await brand.locator(".brandWordmark").boundingBox())!.height).toBe(
    20,
  );
  await mark.click();
  await expect(brand).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".menuBox")).toHaveCSS("width", "72px");
  await expect(brand).toBeFocused();
  const collapsedMark = (await mark.boundingBox())!;
  const rail = (await page.locator(".menuBox").boundingBox())!;
  expect(collapsedMark.width).toBe(28);
  expect(collapsedMark.height).toBe(28);
  expect(
    Math.abs(collapsedMark.x + 14 - (rail.x + rail.width / 2)),
  ).toBeLessThan(1);
  await brand.press("Space");
  await expect(brand).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".menuBox")).toHaveCSS("width", "240px");
  expect(
    await brandNode!.evaluate(
      (node) => node.isConnected && node === document.activeElement,
    ),
  ).toBe(true);
  expect(await markNode!.evaluate((node) => node.isConnected)).toBe(true);
  expect(await mark.boundingBox()).toEqual(expandedMark);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(mark).toHaveCSS("transition-duration", "0s");
  await brand.press("Enter");
  await expect(brand).toHaveAttribute("aria-expanded", "false");
  await expect(brand).toBeFocused();
  expect((await page.locator(".menuBox").boundingBox())!.width).toBe(72);
  const measurements = [];
  for (const width of [72, 64]) {
    await page.locator(".menuBox").evaluate((node, value) => {
      (node as HTMLElement).style.setProperty(
        "--sidebar-rail-width",
        `${value}px`,
      );
    }, width);
    const bounds = (await page.locator(".menuBox").boundingBox())!;
    const logo = (await mark.boundingBox())!;
    const icon = (await active.locator(".iconContainer").boundingBox())!;
    measurements.push({ width, bounds, logo, icon });
    expect
      .soft(Math.abs(logo.x + logo.width / 2 - (bounds.x + bounds.width / 2)))
      .toBeLessThan(1);
    expect
      .soft(Math.abs(icon.x + icon.width / 2 - (bounds.x + bounds.width / 2)))
      .toBeLessThan(1);
    await expect(brand).toBeFocused();
  }
  await testInfo.attach("collapsed-rail-centering", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
});

test("responsive columns hide both cells and headers without unmounting", async () => {
  const table = page.getByTestId("controlled");
  const medium = table.getByRole("columnheader", { name: "Size" });
  const low = table.getByRole("columnheader", { name: "Created" });
  for (const [width, mediumVisible, lowVisible] of [
    [1200, true, true],
    [1199, true, false],
    [768, true, false],
    [767, false, false],
    [390, false, false],
    [1440, true, true],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect(medium).toBeVisible({ visible: mediumVisible });
    await expect(low).toBeVisible({ visible: lowVisible });
    await expect(
      table
        .locator(".ReactVirtualized__Table__rowColumn.mds-priority-medium")
        .first(),
    ).toBeVisible({ visible: mediumVisible });
    await expect(
      table
        .locator(".ReactVirtualized__Table__rowColumn.mds-priority-low")
        .first(),
    ).toBeVisible({ visible: lowVisible });
    await expect(
      table.locator(".ReactVirtualized__Table__rowColumn.mds-priority-low"),
    ).toHaveCount(2);
  }
});

test("controlled sorting waits for the parent and reports one change per keyboard activation", async () => {
  const table = page.getByTestId("controlled");
  const name = table.getByRole("button", { name: "Name", exact: true });
  await name.press("Enter");
  await expect(page.locator("#requested-sort")).toHaveText("name:DESC:1");
  await expect(
    table.getByRole("columnheader", { name: "Name" }),
  ).toHaveAttribute("aria-sort", "ascending");
  await page.locator("#apply-sort").click();
  await expect(
    table.getByRole("columnheader", { name: "Name" }),
  ).toHaveAttribute("aria-sort", "descending");
  await name.press("Space");
  await expect(page.locator("#requested-sort")).toHaveText("name:ASC:2");
  await table.getByRole("button", { name: "Size", exact: true }).click();
  await expect(page.locator("#requested-sort")).toHaveText("size:ASC:3");
  await expect(table.getByRole("button", { name: "Created" })).toHaveCount(0);
  // Manual sorting must not mutate or reorder the caller's records.
  await expect(
    table
      .locator(".ReactVirtualized__Table__rowColumn.mds-priority-high")
      .first(),
  ).toHaveText("bravo");
});

test("legacy local and manual sort APIs keep their ordering and callbacks", async () => {
  const local = page.getByTestId("legacy");
  await local.getByRole("button", { name: "Name", exact: true }).click();
  await expect(page.locator("#legacy-sort")).toHaveText("name:ASC");
  await expect(
    local
      .locator(".ReactVirtualized__Table__rowColumn.mds-priority-high")
      .first(),
  ).toHaveText("alpha");
  await expect(local.getByRole("button", { name: "Size" })).toHaveCount(0);
  await local.getByRole("button", { name: "Name", exact: true }).click();
  await expect(page.locator("#legacy-sort")).toHaveText("name:DESC");
  const manual = page.getByTestId("manual");
  await manual.getByRole("button", { name: "Name", exact: true }).click();
  await expect(page.locator("#manual-sort")).toHaveText("name:DESC");
  await expect(
    manual.getByRole("columnheader", { name: "Name" }),
  ).toHaveAttribute("aria-sort", "descending");
  await expect(manual.getByRole("button", { name: "Created" })).toHaveCount(0);
});

test("empty slot replaces the legacy message and disabled reasons work with focus and hover", async () => {
  await expect(page.locator("#empty-results")).toHaveText(
    "No records. Create a bucket to begin.",
  );
  await expect(page.getByText("Legacy empty message")).toHaveCount(0);
  for (const [name, reason] of [
    ["Delete bucket", "Select a bucket first"],
    ["Refresh", "Refresh is unavailable"],
  ]) {
    const button = page.getByRole("button", { name, exact: true });
    const wrapper = button.locator("..");
    await expect(button).toBeDisabled();
    await expect(wrapper).toHaveAttribute("tabindex", "0");
    await wrapper.focus();
    await expect(wrapper).toHaveAccessibleDescription(reason);
    await expect(page.getByRole("tooltip", { name: reason })).toBeVisible();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    await wrapper.hover();
    await expect(page.getByRole("tooltip", { name: reason })).toBeVisible();
  }
  await expect(page.locator("#disabled-clicks")).toHaveText("0");
  await expect(
    page.locator("#plain-disabled").locator(".."),
  ).not.toHaveAttribute("tabindex");
  await expect(
    page.locator("#enabled-action").locator(".."),
  ).not.toHaveAttribute("tabindex");
});

test("mobile drawer traps focus, closes on all paths, and restores trigger focus", async () => {
  await page.locator("#stable-brand").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await emulateCoarsePointer(page);
  const trigger = page.getByRole("button", { name: "Open menu", exact: true });
  const drawer = page.getByRole("dialog", { name: "Menu", exact: true });
  await expect(drawer).not.toBeVisible();
  await trigger.click();
  await expect(drawer).toBeVisible();
  const close = drawer.getByRole("button", {
    name: "Collapse menu",
    exact: true,
  });
  await expect(close).toBeFocused();
  expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(40);
  await close.locator(".brandMark").click();
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    drawer.getByRole("button", { name: "Leave console" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  const disabledWrapper = drawer.locator("#drawer-disabled").locator("..");
  await disabledWrapper.focus();
  await expect(disabledWrapper).toHaveAccessibleDescription(
    "Select a bucket first",
  );
  // Portaled tooltips must stay inside the native modal's top layer.
  await expect(drawer.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.mouse.click(380, 400);
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
  for (const name of [
    "Buckets",
    "Users",
    "Custom navigation",
    "Leave console",
  ]) {
    await trigger.click();
    await drawer.getByRole("button", { name, exact: true }).click();
    await expect(drawer).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await trigger.click();
  await expect(drawer).toHaveCSS("animation-name", "none");
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(drawer).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("recent buckets keep separate aligned rows and long labels retain their full keyboard tooltip and destination", async () => {
  await page.locator("#long-names").click();
  const rows = page.locator(".subItemsBox button");
  await expect(rows).toHaveCount(5);
  const bounds = await rows.evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().toJSON()),
  );
  for (const [index, box] of bounds.entries()) {
    expect(box.x).toBe(bounds[0].x);
    expect(box.width).toBe(bounds[0].width);
    if (index > 0)
      expect(box.top).toBeGreaterThanOrEqual(bounds[index - 1].bottom);
  }
  const name =
    "very-long-production-archive-bucket-with-63-characters-12345678901";
  const item = page.getByRole("button", { name, exact: true });
  const label = item.locator(".labelContainer > span:not(.labelMeasure)");
  await expect(label).toHaveCSS("text-overflow", "ellipsis");
  expect(
    await label.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  await item.focus();
  await expect(page.getByRole("tooltip", { name, exact: true })).toBeVisible();
  await item.press("Enter");
  await expect(page.locator("#path")).toHaveText("/browser/long-bucket");
});
