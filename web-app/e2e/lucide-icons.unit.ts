// Copyright (c) 2026 PGSTY
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { fileURLToPath } from "node:url";
import { Browser, Page, chromium, expect, test } from "@playwright/test";
import { buildHarness } from "./fixtures/buildHarness";
import { browserExecutable } from "./fixtures/browserExecutable";

test.describe.configure({ mode: "serial" });
let browser: Browser;
let page: Page;
let script: string;
let errors: string[];

test.beforeAll(async () => {
  const result = await buildHarness({
    configFile: false,
    logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      lib: {
        entry: fileURLToPath(
          new URL("./fixtures/lucideIconsHarness.tsx", import.meta.url),
        ),
        name: "LucideIconsHarness",
        formats: ["iife"],
      },
    },
  });
  const output = Array.isArray(result) ? result[0] : result;
  if (!("output" in output)) throw new Error("Missing icon harness output");
  script = output.output
    .filter((item) => item.type === "chunk")
    .map((item) => item.code)
    .join("\n");
  browser = await chromium.launch({ executablePath: browserExecutable() });
});
test.beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: script });
  await expect(page.locator("#same-export")).toHaveText("true");
});
test.afterEach(async () => {
  expect(errors).toEqual([]);
  await page.close();
});
test.afterAll(async () => browser?.close());

test("Lucide outlines survive host fill rules and follow theme or explicit stroke overrides", async () => {
  const paths = page.locator("#themed svg g > *");
  const count = await paths.count();
  expect(count).toBeGreaterThan(4);
  for (const color of ["rgb(36, 36, 36)", "rgb(232, 232, 232)"]) {
    for (const path of await paths.all()) {
      await expect(path).toHaveCSS("fill", "none");
      await expect(path).toHaveCSS("stroke", color);
      await expect(path).toHaveCSS("stroke-width", "2px");
    }
    await page.locator("#theme").click();
  }
  for (const [id, stroke, width] of [
    ["attribute-stroke", "rgb(26, 140, 72)", "3px"],
    ["style-stroke", "rgb(123, 44, 164)", "4px"],
    ["css-stroke", "rgb(10, 90, 180)", "3px"],
    ["success", "rgb(22, 128, 60)", "2px"],
  ]) {
    const child = page.getByTestId(id).locator("g > *").first();
    await expect(child).toHaveCSS("stroke", stroke);
    await expect(child).toHaveCSS("stroke-width", width);
    await expect(child).toHaveCSS("fill", "none");
  }
});

test("icons retain square width-only geometry and caller class, style and explicit height", async () => {
  for (const size of [12, 40, 45]) {
    const bounds = (await page.getByTestId(`width-${size}`).boundingBox())!;
    expect(bounds.width).toBe(size);
    expect(bounds.height).toBe(size);
  }
  const explicit = (await page.getByTestId("explicit-size").boundingBox())!;
  expect([explicit.width, explicit.height]).toEqual([20, 28]);
  // Presentation attributes remain subject to the existing .min-icon CSS.
  const attribute = page.getByTestId("attribute-size");
  await expect(attribute).toHaveAttribute("width", "40");
  await expect(attribute).toHaveAttribute("height", "30");
  await expect(attribute).toHaveClass("min-icon lucide-icon caller-class");
  const bounds = (await attribute.boundingBox())!;
  expect([bounds.width, bounds.height]).toEqual([26, 30]);
});

test("decorative icons leave native control names and keyboard focus intact while named icons expose their labels", async () => {
  const action = page.getByRole("button", { name: "Add item", exact: true });
  const refresh = page.getByRole("button", {
    name: "Refresh list",
    exact: true,
  });
  await expect(action.locator("svg")).toHaveAttribute("aria-hidden", "true");
  await action.focus();
  await page.keyboard.press("Tab");
  await expect(refresh).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#clicks")).toHaveText("1");
  for (const name of [
    "Help image",
    "External image name",
    "Title image",
    "Child title image",
  ]) {
    await expect(page.getByRole("img", { name, exact: true })).toBeVisible();
  }
  await expect(
    page.getByRole("img", { name: "Explicitly hidden" }),
  ).toHaveCount(0);
  await expect(page.getByTestId("presentational")).toHaveAttribute(
    "role",
    "presentation",
  );
  await expect(page.getByTestId("ref")).toHaveClass(
    "min-icon lucide-icon caller-hook",
  );
  await expect(page.getByTestId("ref")).toHaveCSS("opacity", "0.8");
  await page.getByTestId("ref").click();
  await expect(page.locator("#clicks")).toHaveText("2");
  await page.locator("#inspect-ref").click();
  await expect(page.locator("#clicks")).toHaveText("100");
});

test("real Select state keeps caret direction and converted menu and success icons retain their meaning", async () => {
  const select = page.getByRole("button", { name: "Region East", exact: true });
  const direction = () =>
    select.locator("svg path").evaluate((path) => {
      const bounds = (path as SVGGraphicsElement).getBBox();
      const middle = (path as SVGPathElement).getPointAtLength(
        (path as SVGPathElement).getTotalLength() / 2,
      );
      return middle.y > bounds.y + bounds.height / 2 ? "down" : "up";
    });
  expect(await direction()).toBe("down");
  await select.click();
  await expect(select).toHaveAttribute("aria-expanded", "true");
  expect(await direction()).toBe("up");
  await page.keyboard.press("Escape");
  await expect(select).toBeFocused();
  expect(await direction()).toBe("down");
  for (const id of ["mobile-menu", "legacy-mobile-menu"]) {
    const bounds = await page
      .getByTestId(id)
      .locator("g > *")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const box = (node as SVGGraphicsElement).getBBox();
          return { width: box.width, height: box.height };
        }),
      );
    expect(bounds).toHaveLength(3);
    expect(bounds.every((box) => box.width > 0 && box.height === 0)).toBe(true);
  }
  const success = page.getByTestId("valid-rule");
  await expect(success.locator("circle")).toHaveCount(1);
  const check = await success
    .locator("path")
    .evaluate((node) => (node as SVGPathElement).getTotalLength());
  expect(check).toBeGreaterThan(9);
  expect(check).toBeLessThan(15);
});
