// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { fileURLToPath } from "node:url";
import { Browser, Page, chromium, expect, test } from "@playwright/test";
import { buildHarness as build } from "./fixtures/buildHarness";
import { emulateCoarsePointer } from "./fixtures/emulateCoarsePointer";
import { browserExecutable } from "./fixtures/browserExecutable";

test.describe.configure({ mode: "serial" });
let browser: Browser;
let script: string;
let page: Page;

test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      lib: {
        entry: fileURLToPath(
          new URL("./fixtures/responsiveTablesHarness.tsx", import.meta.url),
        ),
        name: "ResponsiveTablesHarness",
        formats: ["iife"],
      },
    },
  });
  const output = Array.isArray(result) ? result[0] : result;
  if (!("output" in output))
    throw new Error("Table harness build has no output");
  const chunk = output.output.find((item) => item.type === "chunk");
  if (!chunk || chunk.type !== "chunk")
    throw new Error("Table harness has no script");
  script = chunk.code;
  browser = await chromium.launch({ executablePath: browserExecutable() });
});
test.afterEach(async () => {
  await page?.close();
});
test.afterAll(async () => {
  await browser?.close();
});

async function mount(coarse = false) {
  page = await browser.newPage({
    viewport: { width: 390, height: 900 },
    hasTouch: coarse,
  });
  if (coarse) await emulateCoarsePointer(page);
  page.on("pageerror", (error) =>
    console.error("Responsive table harness", error),
  );
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: script });
  await expect(
    page.getByRole("row", { name: "record-000", exact: true }),
  ).toBeVisible();
}

test("visible columns fit phone/tablet/desktop and hidden cells stay mounted", async () => {
  await mount();
  for (const width of [390, 768, 1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("columnheader", { name: "Policies", exact: true }),
    ).toBeVisible({ visible: width >= 768 });
    await expect(
      page.getByRole("columnheader", { name: "Groups", exact: true }),
    ).toBeVisible({ visible: width >= 1200 });
    const row = page.getByRole("row", { name: "record-000", exact: true });
    await expect(row.locator(".mds-priority-low")).toHaveCount(1);
    // Priority rules follow viewport events; the sizer publishes container
    // geometry separately. Require the entire existing layout contract together.
    await expect(async () => {
      const bounds = await row.evaluate((element) => {
        const cells = [
          ...element.querySelectorAll<HTMLElement>(
            ".ReactVirtualized__Table__rowColumn",
          ),
        ].filter((cell) => getComputedStyle(cell).display !== "none");
        return {
          row: element.getBoundingClientRect().toJSON(),
          name: element
            .querySelector('[role="gridcell"][aria-colindex="2"]')!
            .getBoundingClientRect()
            .toJSON(),
          cells: cells.map((cell) => cell.getBoundingClientRect().toJSON()),
        };
      });
      expect(bounds.name.width).toBeGreaterThan(90);
      for (const cell of bounds.cells) {
        expect(cell.x).toBeGreaterThanOrEqual(bounds.row.x - 1);
        expect(cell.right).toBeLessThanOrEqual(bounds.row.right + 1);
      }
      expect(bounds.row.right).toBeLessThanOrEqual(width);
    }).toPass({ timeout: 5000 });
  }
  // The measuring component mounts only with actual records, including after
  // loading or empty states. Its observer must follow each newly mounted node.
  const phase = page.getByRole("combobox", { name: "Table content" });
  for (const state of ["loading", "empty"]) {
    await phase.selectOption(state);
    await expect(page.locator(".fluidTable")).toHaveCount(0);
    await expect(
      page.getByText(state === "loading" ? "Loading records" : "No records"),
    ).toBeVisible();
    await phase.selectOption("rows");
    await expect(
      page.getByRole("row", { name: "record-000", exact: true }),
    ).toBeVisible();
  }

  const dimensions = () =>
    page.locator(".fluidTable").evaluate((element) => {
      const table = element.querySelector<HTMLElement>(
        ".ReactVirtualized__Table",
      )!;
      const grid = element.querySelector<HTMLElement>(
        ".ReactVirtualized__Table__Grid",
      )!;
      return {
        parentWidth: element.clientWidth,
        parentHeight: element.clientHeight,
        tableWidth: Number.parseFloat(table.style.width),
        tableHeight:
          grid.offsetHeight +
          element.querySelector<HTMLElement>(
            ".ReactVirtualized__Table__headerRow",
          )!.offsetHeight,
      };
    });
  const before = await dimensions();
  expect(before.parentWidth).toBeGreaterThan(300);
  expect(before.tableWidth).toBe(before.parentWidth);
  expect(before.tableHeight).toBe(before.parentHeight);

  await page.locator(".fluidTable").evaluate((element: HTMLElement) => {
    element.style.display = "none";
  });
  await expect.poll(dimensions).toEqual({
    parentWidth: 0,
    parentHeight: 0,
    tableWidth: 0,
    tableHeight: 0,
  });
  await page.locator(".fluidTable").evaluate((element: HTMLElement) => {
    element.style.display = "";
  });
  await expect.poll(dimensions).toEqual(before);
  // Coalesced zero/restored layout changes must publish the final geometry,
  // never leave a delayed zero-width grid over a fully sized parent.
  await page.locator(".fluidTable").evaluate((element: HTMLElement) => {
    element.style.width = "0px";
    element.getBoundingClientRect();
    element.style.width = "";
    element.getBoundingClientRect();
  });
  await expect.poll(dimensions).toEqual(before);
  await expect(
    page.getByRole("row", { name: "record-000", exact: true }),
  ).toBeVisible();
});

test("coarse checkbox edge clicks select exactly once without navigation for owned and legacy rows", async () => {
  await mount(true);
  expect(
    await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
  ).toBe(true);
  const row = page.getByRole("row", { name: "record-000", exact: true });
  const checkbox = row.getByRole("checkbox");
  for (const [index, position] of [
    { x: 1, y: 1 },
    { x: 39, y: 39 },
  ].entries()) {
    const box = await checkbox.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(40);
    expect(box!.height).toBeGreaterThanOrEqual(40);
    await checkbox.click({ position });
    await expect(page.locator("#selection-calls")).toHaveText(
      String(index + 1),
    );
    await expect(page.locator("#navigation-calls")).toHaveText("0");
    await expect(checkbox).toBeChecked({ checked: index === 0 });
  }
  // This table control has an aria-label, not a visible text label. Space
  // exercises its native activation without relying on a decorative wrapper.
  await checkbox.press("Space");
  await expect(page.locator("#selection-calls")).toHaveText("3");
  await expect(checkbox).toBeChecked();
  await expect(page.locator("#navigation-calls")).toHaveText("0");
  await page.locator("#ownership").click();
  await checkbox.click({ position: { x: 1, y: 39 } });
  await expect(page.locator("#selection-calls")).toHaveText("4");
  await expect(checkbox).not.toBeChecked();
  await expect(page.locator("#navigation-calls")).toHaveText("0");
  await row.getByRole("button", { name: "Actions for record-000" }).click();
  await expect(page.locator("#action-calls")).toHaveText("1");
  await expect(page.locator("#navigation-calls")).toHaveText("0");
});

test("coarse compact rows keep 40px virtualizer spacing through resize and scrolling", async () => {
  await mount(true);
  await page.locator("#density").click();
  for (const width of [390, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const first = await page
      .getByRole("row", { name: "record-000", exact: true })
      .boundingBox();
    const second = await page
      .getByRole("row", { name: "record-001", exact: true })
      .boundingBox();
    expect(first!.height).toBe(40);
    expect(second!.y - first!.y).toBe(40);
  }
  await page.locator(".ReactVirtualized__Table__Grid").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    page.getByRole("row", { name: "record-199", exact: true }),
  ).toBeVisible();
  const last = await page
    .getByRole("row", { name: "record-199", exact: true })
    .boundingBox();
  const prior = await page
    .getByRole("row", { name: "record-198", exact: true })
    .boundingBox();
  expect(last!.y - prior!.y).toBe(40);
  expect(await page.locator(".rowLine").count()).toBeLessThan(40);
});

test("desktop density stays 36/28 and interaction retains one sequential entry", async () => {
  await mount();
  const row = page.getByRole("row", { name: "record-000", exact: true });
  expect((await row.boundingBox())!.height).toBe(36);
  await page.locator("#density").click();
  expect((await row.boundingBox())!.height).toBe(28);
  await page.locator("#before").focus();
  await page.keyboard.press("Tab");
  await expect(row).toBeFocused();
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(row).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#after")).toBeFocused();
});
