// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { fileURLToPath } from "node:url";
import { chromium, expect, test } from "@playwright/test";
import { buildHarness as build } from "./fixtures/buildHarness";
import { emulateCoarsePointer } from "./fixtures/emulateCoarsePointer";
import { browserExecutable } from "./fixtures/browserExecutable";
import {
  getStoredSidebarPreference,
  resolveSidebarOpen,
} from "../src/utils/sidebarState";

test("sidebar defaults never become explicit preferences", () => {
  for (const value of [null, "{}", "invalid", '{"open":1}'])
    expect(getStoredSidebarPreference(() => value)).toBeUndefined();
  expect(
    getStoredSidebarPreference(() => {
      throw new Error("blocked");
    }),
  ).toBeUndefined();
  for (const preference of [undefined, false, true])
    for (const width of [390, 768, 1199, 1200, 1440])
      expect(resolveSidebarOpen(preference, width)).toBe(
        preference ?? width >= 1200,
      );
});

test("responsive panel preserves exact owner, focused descendant and nested paint order", async () => {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      lib: {
        entry: fileURLToPath(
          new URL("./fixtures/responsivePanelHarness.tsx", import.meta.url),
        ),
        name: "ResponsivePanelHarness",
        formats: ["iife"],
      },
    },
  });
  const output = Array.isArray(result) ? result[0] : result;
  if (!("output" in output)) throw new Error("Missing harness output");
  const chunk = output.output.find((item) => item.type === "chunk");
  if (!chunk || chunk.type !== "chunk")
    throw new Error("Missing harness script");
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
  });
  try {
    for (const start of [1440, 390]) {
      const page = await browser.newPage({
        viewport: { width: start, height: 900 },
      });
      await page.setContent('<div id="root"></div>');
      page.on("pageerror", (error) =>
        console.error("Responsive harness", error),
      );
      page.on("console", (message) => {
        if (message.type() === "error") console.error(message.text());
      });
      await page.addScriptTag({ content: chunk.code });
      await page.locator("#open-panel").click();
      const detail = page.getByRole("textbox", {
        name: "Detail draft",
        exact: true,
      });
      await detail.fill("captured value");
      await expect(detail).toBeFocused();
      for (const width of [start === 390 ? 1440 : 390, start]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            ),
        );
        await expect(detail).toBeFocused();
        await expect(detail).toHaveValue("captured value");
      }
      await page.locator("#specific-detail").click();
      const nested = page.locator("#nested-draft");
      await nested.fill("same nested draft");
      for (const width of [start === 390 ? 1440 : 390, start]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            ),
        );
        await expect(nested).toBeFocused();
        await expect(nested).toHaveValue("same nested draft");
        expect(
          await nested.evaluate((node) => {
            const r = node.getBoundingClientRect();
            return (
              document.elementFromPoint(
                r.x + r.width / 2,
                r.y + r.height / 2,
              ) === node
            );
          }),
        ).toBe(true);
      }
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("dialog", { name: "Nested edit" }),
      ).toHaveCount(0);
      await expect(detail).toHaveValue("same nested draft");
      await expect(page.locator("#specific-detail")).toBeFocused();
      expect(await page.locator("#owner-mounts").textContent()).toBe("1");
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("native drawer hands focus and scroll lock to the real task departure guard", async () => {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
    resolve: { tsconfigPaths: true },
    build: {
      write: false,
      lib: {
        entry: fileURLToPath(
          new URL("./fixtures/responsiveDepartureHarness.tsx", import.meta.url),
        ),
        name: "ResponsiveDepartureHarness",
        formats: ["iife"],
      },
    },
  });
  const output = Array.isArray(result) ? result[0] : result;
  if (!("output" in output)) throw new Error("Missing harness output");
  const chunk = output.output.find((item) => item.type === "chunk");
  if (!chunk || chunk.type !== "chunk")
    throw new Error("Missing harness script");
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 900 },
    });
    await page.route("http://responsive.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<div id="root"></div>',
      }),
    );
    await page.goto("http://responsive.test/");
    page.on("pageerror", (error) => console.error("Responsive harness", error));
    page.on("console", (message) => {
      if (message.type() === "error") console.error(message.text());
    });
    await page.addScriptTag({ content: chunk.code });
    await page.locator("#start-task").click();
    const trigger = page.locator("#open-menu");
    const drawer = page.getByRole("dialog", { name: "Menu", exact: true });
    const confirmation = page.getByRole("dialog", {
      name: "Tasks are still running",
      exact: true,
    });
    const checkConfirmation = async () => {
      await expect(drawer).not.toBeVisible();
      await expect(confirmation).toBeVisible();
      await expect(page.locator("#owners")).toHaveText("true / true");
      expect(await page.evaluate(() => document.body.style.overflow)).toBe(
        "hidden",
      );
      const stay = confirmation.getByRole("button", {
        name: "Stay here",
        exact: true,
      });
      await expect(stay).toBeFocused();
      await expect
        .poll(() =>
          stay.evaluate((node) => {
            const r = node.getBoundingClientRect();
            return node.contains(
              document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
            );
          }),
        )
        .toBe(true);
    };
    await trigger.click();
    await expect(drawer).toBeVisible();
    await expect(page.locator("#owners")).toHaveText("true / true");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(page.locator("#owners")).toHaveText("false / false");
    await trigger.click();
    await drawer.getByRole("button", { name: "Users", exact: true }).click();
    await checkConfirmation();
    await confirmation
      .getByRole("button", { name: "Stay here", exact: true })
      .click();
    await expect(confirmation).toHaveCount(0);
    await expect(page.locator("#route")).toHaveText("/buckets");
    await expect(trigger).toBeFocused();
    await expect(page.locator("#owners")).toHaveText("false / false");
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    await trigger.click();
    await drawer.getByRole("button", { name: "Users", exact: true }).click();
    await checkConfirmation();
    await confirmation
      .getByRole("button", { name: "Leave page", exact: true })
      .click();
    await expect(page.locator("#route")).toHaveText("/identity/users");
    await expect(page.locator("#tasks")).toHaveText("1");
    await expect(confirmation).toHaveCount(0);
    await trigger.click();
    await drawer.getByRole("button", { name: "Sign Out", exact: true }).click();
    await checkConfirmation();
    await confirmation
      .getByRole("button", { name: "Stay here", exact: true })
      .click();
    await expect(confirmation).toHaveCount(0);
    await expect(page.locator("#tasks")).toHaveText("1");
    await trigger.click();
    await drawer.getByRole("button", { name: "Sign Out", exact: true }).click();
    await checkConfirmation();
    await confirmation
      .getByRole("button", { name: "Cancel tasks and leave", exact: true })
      .click();
    await expect(page.locator("#route")).toHaveText("/logout");
    await expect(page.locator("#tasks")).toHaveText("0");
    await expect(page.locator("#owners")).toHaveText("false / false");
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  } finally {
    await browser.close();
  }
});

test("long mobile breadcrumbs retain both visible segments and copy the exact literal key", async () => {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
    resolve: { tsconfigPaths: true },
    build: {
      write: false,
      lib: {
        entry: fileURLToPath(
          new URL("./fixtures/responsiveDepartureHarness.tsx", import.meta.url),
        ),
        name: "ResponsiveDepartureHarness",
        formats: ["iife"],
      },
    },
  });
  const output = Array.isArray(result) ? result[0] : result;
  if (!("output" in output)) throw new Error("Missing harness output");
  const chunk = output.output.find((item) => item.type === "chunk");
  if (!chunk || chunk.type !== "chunk")
    throw new Error("Missing harness script");
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 900 },
      permissions: ["clipboard-read", "clipboard-write"],
    });
    await page.route("http://localhost:19280/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<div id="root"></div>',
      }),
    );
    await page.goto("http://localhost:19280/__responsive_harness");
    page.on("pageerror", (error) => console.error("Responsive harness", error));
    page.on("console", (message) => {
      if (message.type() === "error") console.error(message.text());
    });
    await page.addScriptTag({ content: chunk.code });
    const segments = page.locator(".breadcrumb-segment");
    await expect(segments).toHaveCount(2);
    await expect(segments.nth(0)).toHaveText("directory-".repeat(12));
    await expect(segments.nth(1)).toHaveText("README.md");
    const copy = page.getByRole("button", { name: "Copy path", exact: true });
    const copyBox = await copy.boundingBox();
    for (const segment of await segments.all()) {
      const bounds = await segment.boundingBox();
      expect(bounds!.width).toBeGreaterThan(40);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(copyBox!.x);
      expect(
        await segment.evaluate((node) => {
          const r = node.getBoundingClientRect();
          return (
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) ===
            node
          );
        }),
      ).toBe(true);
    }
    await copy.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `b/docs//percent%2F/中 文?#/${"directory-".repeat(12)}/README.md`,
    );
    await page
      .getByRole("button", { name: "Parent paths", exact: true })
      .click();
    await expect(
      page.getByRole("menuitem", { name: "/", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("menuitem", { name: "percent%2F", exact: true })
      .click();
    await expect(page.locator("#route")).toHaveText(
      `/browser/b/${encodeURIComponent("docs//percent%2F/")}`,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
  } finally {
    await browser.close();
  }
});

test("mobile header keeps its primary action and truthful Tasks count outside overflow", async () => {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
    resolve: { tsconfigPaths: true },
    build: {
      write: false,
      lib: {
        entry: fileURLToPath(
          new URL("./fixtures/responsiveDepartureHarness.tsx", import.meta.url),
        ),
        name: "ResponsiveDepartureHarness",
        formats: ["iife"],
      },
    },
  });
  const output = Array.isArray(result) ? result[0] : result;
  if (!("output" in output)) throw new Error("Missing harness output");
  const chunk = output.output.find((item) => item.type === "chunk");
  if (!chunk || chunk.type !== "chunk")
    throw new Error("Missing harness script");
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 900 },
      hasTouch: true,
    });
    await page.route("http://responsive.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<div id="root"></div>',
      }),
    );
    await page.goto("http://responsive.test/");
    await emulateCoarsePointer(page);
    await page.addScriptTag({ content: chunk.code });
    await expect(page.locator("#create-primary")).toBeVisible();
    await page.locator("#start-task").click();
    const tasks = page.getByRole("button", {
      name: "Tasks: 1 running",
      exact: true,
    });
    await expect(tasks).toBeVisible();
    await expect(tasks).toContainText("1");
    for (const control of [
      tasks,
      page.locator("#create-primary"),
      page.getByRole("button", { name: "Page actions", exact: true }),
    ]) {
      const observed = await control.evaluate((node) => ({
        name: node.getAttribute("aria-label"),
        coarse: matchMedia("(pointer: coarse)").matches,
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
        cssWidth: getComputedStyle(node).width,
        minWidth: getComputedStyle(node).minWidth,
        transform: getComputedStyle(node).transform,
      }));
      console.info("Header target geometry", JSON.stringify(observed));
      expect(observed.coarse).toBe(true);
      const box = await control.boundingBox();
      expect(
        box!.width,
        observed.name || "header target",
      ).toBeGreaterThanOrEqual(40);
      expect(box!.height).toBeGreaterThanOrEqual(40);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    await tasks.click();
    await expect(
      page.getByRole("dialog", { name: "Tasks", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tasks).toBeFocused();
    await page.locator("#complete-task").click();
    await expect(
      page.getByRole("button", { name: "Tasks", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator("#object-manager-toggle [aria-hidden=true]")
        .filter({ hasText: "1" }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Page actions", exact: true })
      .click();
    const denied = page.getByRole("menuitem", { name: "Delete", exact: true });
    await expect(denied).toHaveAttribute("aria-disabled", "true");
    await denied.focus();
    await expect(denied).toHaveAccessibleDescription("Permission required");
  } finally {
    await browser.close();
  }
});
