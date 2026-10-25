// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { test, expect, chromium, Browser, Page } from "@playwright/test";
import { build } from "vite";
import { fileURLToPath } from "node:url";
import { browserExecutable } from "./fixtures/browserExecutable";
import {
  keyAction,
  moveIndex,
  rangeSelection,
  toggleSelection,
  parentPrefix,
  objectPath,
} from "../src/screens/Console/Buckets/ListBuckets/Objects/ListObjects/objectKeyboard";

test("key mapping respects modifiers, composition and prior ownership", () => {
  expect(keyAction({ key: "ArrowDown", shiftKey: true })).toBe("down");
  expect(keyAction({ key: "a", metaKey: true })).toBe("all");
  expect(keyAction({ key: "A", ctrlKey: true })).toBe("all");
  expect(keyAction({ key: "ArrowUp", altKey: true })).toBe("parent");
  expect(keyAction({ key: "F10", shiftKey: true })).toBe("menu");
  expect(keyAction({ key: "ContextMenu" })).toBe("menu");
  for (const extra of [
    { isComposing: true },
    { keyCode: 229 },
    { defaultPrevented: true },
    { ctrlKey: true },
    { altKey: true },
    { shiftKey: true },
  ])
    expect(keyAction({ key: "p", ...extra })).toBeNull();
});
test("movement clamps empty, first, last and partial pages", () => {
  expect(moveIndex(0, 0, "down", 8)).toBe(-1);
  expect(moveIndex(0, 1, "up", 8)).toBe(0);
  expect(moveIndex(90, 100, "pageDown", 25)).toBe(99);
  expect(moveIndex(10, 100, "pageUp", 25)).toBe(0);
  expect(moveIndex(-1, 3, "last", 2)).toBe(2);
});
test("ranges reverse and shrink without retaining old contributions", () => {
  const ids = ["a", "b", "c", "d", "e"];
  expect(rangeSelection(ids, "b", "e", ["a"])).toEqual(ids);
  expect(rangeSelection(ids, "b", "c", ["a"])).toEqual(["a", "b", "c"]);
  expect(rangeSelection(ids, "d", "b")).toEqual(["b", "c", "d"]);
  expect(rangeSelection(ids, "missing", "b", ["gone", "a"])).toEqual(["a"]);
  expect(toggleSelection(["a", "b"], "a")).toEqual(["b"]);
  expect(toggleSelection(["a"], "b")).toEqual(["a", "b"]);
});
for (const [key, parent] of [
  ["", ""],
  ["docs/", ""],
  ["x", ""],
  ["docs/x", "docs/"],
  ["a//b/", "a//"],
  ["percent%2F/child/", "percent%2F/"],
  ["中 文/?#%/", "中 文/"],
  ["a/../b/", "a/../"],
])
  test(`parent preserves literal key ${JSON.stringify(key)}`, () => {
    expect(parentPrefix(key)).toBe(parent);
    expect(decodeURIComponent(objectPath("b", parent).split("/").pop()!)).toBe(
      parent,
    );
  });

test.describe("mounted real object table", () => {
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
              new URL("./fixtures/objectKeyboardHarness.tsx", import.meta.url),
            ),
            formats: ["iife"],
            name: "ObjectKeyboardHarness",
          },
        },
      });
      const output = Array.isArray(result) ? result[0] : result;
      if (!("output" in output)) throw new Error("Missing harness output");
      script = output.output
        .filter((entry) => entry.type === "chunk")
        .map((entry) => entry.code)
        .join("\n");
    } finally {
      if (old === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = old;
    }
    browser = await chromium.launch({ executablePath: browserExecutable() });
  });
  test.beforeEach(async () => {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route("http://keyboard.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<div id="root"></div>',
      }),
    );
    await page.route("**/api/v1/buckets/b/objects**", (route) => {
      const key = new URL(route.request().url()).searchParams.get("prefix")!;
      return route.fulfill({
        json: {
          objects: [{ name: key, size: 1 }],
          objectMetadata: { "Content-Type": "text/plain" },
        },
      });
    });
    page.on("pageerror", (error) => console.error("HARNESS", error.message));
    await page.goto("http://keyboard.test/");
    await page.addScriptTag({ content: script });
    await expect(page.getByRole("row", { name: /^docs\/000/ })).toBeVisible();
  });
  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus)
      await testInfo.attach("dom", {
        body: await page.content(),
        contentType: "text/html",
      });
    await page.close();
  });
  test.afterAll(async () => browser?.close());
  const focused = () => page.locator('[role="row"]:focus');
  const first = () => page.getByRole("row", { name: /^docs\/000/ });
  test("one row stop, virtualized End/Home and pointer scroll recovery", async () => {
    await first().focus();
    await expect(first()).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("End");
    await expect(focused()).toHaveAttribute("data-fluid-key", "docs/099.txt");
    await page.keyboard.press("Home");
    await expect(first()).toBeFocused();
    await page.locator(".ReactVirtualized__Table__Grid").evaluate((element) => {
      element.scrollTop = 240;
    });
    await expect
      .poll(() =>
        page
          .getByRole("group", { name: "Objects", exact: true })
          .evaluate(
            (group) =>
              Number(group.tabIndex === 0) +
              group.querySelectorAll('[tabindex="0"]').length,
          ),
      )
      .toBe(1);
    await page.locator(".ReactVirtualized__Table__Grid").evaluate((element) => {
      element.scrollTop = 3000;
    });
    await expect(
      page.getByRole("group", { name: "Objects", exact: true }),
    ).toHaveAttribute("tabindex", "0");
    await page.getByRole("group", { name: "Objects", exact: true }).focus();
    await page.keyboard.press("Home");
    await expect(first()).toBeFocused();
    await page.keyboard.press("PageDown");
    await expect(focused()).not.toHaveAttribute(
      "data-fluid-key",
      "docs/000.txt",
    );
    await page.keyboard.press("Home");
    await page.keyboard.press("Space");
    await expect(first()).toBeFocused();
    // An externally focused mounted row must become the keyboard target too.
    const other = page.getByRole("row", { name: /^docs\/005/ });
    await other.focus();
    await page.keyboard.press("Space");
    await expect(other).toHaveAttribute("aria-selected", "true");
    await page.locator(".ReactVirtualized__Table__Grid").evaluate((element) => {
      element.scrollTop = 1500;
    });
    // A DOM scroll assignment precedes native scroll delivery. Wait for the
    // virtualized rows to hand keyboard entry back to the offscreen group.
    await expect(
      page.getByRole("group", { name: "Objects", exact: true }),
    ).toHaveAttribute("tabindex", "0");
    const beforeResize = await page
      .locator(".ReactVirtualized__Table__Grid")
      .boundingBox();
    await page.setViewportSize({ width: 1300, height: 800 });
    await expect
      .poll(async () => {
        const afterResize = await page
          .locator(".ReactVirtualized__Table__Grid")
          .boundingBox();
        return Boolean(
          beforeResize &&
          afterResize &&
          afterResize.width < beforeResize.width &&
          afterResize.height < beforeResize.height,
        );
      })
      .toBe(true);
    await expect
      .poll(() =>
        page
          .locator(".ReactVirtualized__Table__Grid")
          .evaluate((element) => element.scrollTop),
      )
      .toBeGreaterThan(1000);
  });
  test("visible action triggers preserve one sequential entry in the real object list", async () => {
    await first().focus();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest('[role="row"][data-fluid-key]'),
      ),
    ).toBe(false);
    await page.keyboard.press("Shift+Tab");
    await expect(first()).toBeFocused();
    await page.keyboard.press("Shift+F10");
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(first()).toBeFocused();
  });
  test("range shrink, checkbox modifiers and page-only select all", async () => {
    await first().focus();
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await expect(page.getByTestId("selection")).toHaveText(
      '["docs/000.txt","docs/001.txt","docs/002.txt"]',
    );
    await page.keyboard.press("Shift+ArrowUp");
    await expect(page.getByTestId("selection")).toHaveText(
      '["docs/000.txt","docs/001.txt"]',
    );
    await page.keyboard.press("Escape");
    await first().focus();
    await page.keyboard.press("Space");
    await page
      .getByRole("row", { name: /^docs\/002/ })
      .click({ modifiers: ["Shift"] });
    await expect(page.getByTestId("selection")).toHaveText(
      '["docs/000.txt","docs/001.txt","docs/002.txt"]',
    );
    await page
      .getByRole("checkbox", { name: "Select: docs/004.txt", exact: true })
      .click({ modifiers: ["Shift"] });
    await expect(page.getByTestId("selection")).toContainText("docs/004.txt");
    // Selection is committed before the virtualized table's animation-frame
    // focus handoff. Send the list shortcut after that handoff, not to the input.
    await expect(page.getByRole("row", { name: /^docs\/004/ })).toBeFocused();
    await page.keyboard.press("Control+a");
    await expect(page.getByTestId("notice")).toHaveText(
      "Selected 100 objects on this page.",
    );
    await page.keyboard.press("Control+a");
    expect(
      JSON.parse(await page.getByTestId("selection").innerText()),
    ).toHaveLength(100);
  });
  test("context reasons, Escape, Tab and real dialog handoff", async () => {
    await first().focus();
    await page.keyboard.press("Shift+F10");
    const menu = page.getByRole("menu", { name: "Object actions" });
    await expect(
      menu.getByRole("menuitem", { name: "Delete", exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole("menuitem", { name: "Download", exact: true }),
    ).toHaveCSS("min-height", "36px");
    await expect(
      menu.getByRole("menuitem", { name: "Download", exact: true }),
    ).toBeFocused();
    const legal = menu.getByRole("menuitem", {
      name: "Legal Hold",
      exact: true,
    });
    await expect(legal).toHaveAttribute("aria-disabled", "true");
    await legal.focus();
    await expect(legal).toHaveAccessibleDescription(
      "Object Lock is not enabled on this bucket.",
    );
    await page.keyboard.press("Escape");
    await expect(first()).toBeFocused();
    await page.keyboard.press("ContextMenu");
    await expect(menu).toBeVisible();
    await menu.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Delete Object" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(first()).toBeFocused();
    await page.keyboard.press("Shift+F10");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(menu).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "After list", exact: true }),
    ).not.toBeFocused();
    await page.getByRole("button", { name: "Toggle compact" }).click();
    await first().focus();
    await page.keyboard.press("ContextMenu");
    await expect(
      menu.getByRole("menuitem", { name: "Download", exact: true }),
    ).toHaveCSS("min-height", "28px");
  });
  test("typing, IME, pending lazy content and modal ownership suppress shortcuts", async () => {
    await page
      .getByRole("textbox", { name: "Typing", exact: true })
      .fill("abc");
    await page.keyboard.press("Control+a");
    await expect(page.getByTestId("selection")).toHaveText("[]");
    await page.getByLabel("Editable", { exact: true }).focus();
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await first().focus();
    await first().dispatchEvent("keydown", { key: " ", isComposing: true });
    await expect(page.getByTestId("selection")).toHaveText("[]");
    await page.getByRole("button", { name: "Toggle pending" }).click();
    await first().focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("?");
    await expect(page.getByTestId("selection")).toHaveText("[]");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Toggle pending" }).click();
    await first().focus();
    await page.keyboard.press("?");
    await expect(
      page.getByRole("dialog", { name: "Keyboard shortcuts" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(first()).toBeFocused();
    await page.keyboard.press("/");
    await expect(
      page.getByPlaceholder("Start typing to filter objects on this page"),
    ).toBeFocused();
  });
  test("context dismissal preserves outside focus and recovers a virtualized anchor", async () => {
    await first().focus();
    await page.keyboard.press("ContextMenu");
    const menu = page.getByRole("menu", { name: "Object actions" });
    await expect(
      menu.getByRole("menuitem", { name: "Download", exact: true }),
    ).toBeFocused();
    const input = page.getByRole("textbox", { name: "Typing", exact: true });
    await input.click();
    await expect(menu).toHaveCount(0);
    await expect(input).toBeFocused();
    await first().focus();
    await page.keyboard.press("ContextMenu");
    await expect(
      menu.getByRole("menuitem", { name: "Download", exact: true }),
    ).toBeFocused();
    await page.locator(".ReactVirtualized__Table__Grid").evaluate((element) => {
      element.scrollTop = 3000;
    });
    await expect(menu).toHaveCount(0);
    await expect(
      page.getByRole("group", { name: "Objects", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Home");
    await expect(first()).toBeFocused();
    await page.keyboard.press("ContextMenu");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Shift+Tab");
    await expect(menu).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
      "BODY",
    );
  });
  test("cold lazy owners disable Kbar independently and Search never disables itself", async () => {
    const disabled = page.getByTestId("command-disabled");
    const search = page.getByRole("dialog", { name: "Search", exact: true });
    const modifier = await page.evaluate(() =>
      /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "Meta" : "Control",
    );
    await expect(disabled).toHaveText("false");
    for (const button of ["Toggle pending", "Toggle second pending"]) {
      await page.getByRole("button", { name: button, exact: true }).click();
      await expect(disabled).toHaveText("true");
      await first().focus();
      await page.keyboard.press(`${modifier}+k`);
      await expect(search).toHaveCount(0);
    }
    await page
      .getByRole("button", { name: "Toggle pending", exact: true })
      .click();
    await expect(disabled).toHaveText("true");
    await first().focus();
    await page.keyboard.press(`${modifier}+k`);
    await expect(search).toHaveCount(0);
    await page
      .getByRole("button", { name: "Toggle second pending", exact: true })
      .click();
    await expect(disabled).toHaveText("false");
    await first().focus();
    await page.keyboard.press(`${modifier}+k`);
    await expect(search).toBeVisible();
    await expect(disabled).toHaveText("false");
    await page.keyboard.press("?");
    await expect(search).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Keyboard shortcuts" }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(search).toHaveCount(0);
    await page
      .getByRole("button", { name: "Open dialog", exact: true })
      .click();
    await expect(disabled).toHaveText("true");
    await page.keyboard.press(`${modifier}+k`);
    await expect(search).toHaveCount(0);
    await page
      .getByRole("dialog", { name: "Test dialog" })
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await expect(disabled).toHaveText("false");
    await first().focus();
    await page.keyboard.press(`${modifier}+k`);
    await expect(search).toBeVisible();
  });
  test("active task blocks navigation without changing selection or root boundary", async () => {
    await page.getByRole("button", { name: "Start task" }).click();
    await first().focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("dialog", { name: "Tasks are still running" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Stay here" }).click();
    await expect(page.getByTestId("selection")).toHaveText('["docs/000.txt"]');
    await expect(first()).toBeFocused();
    await page.keyboard.press("Backspace");
    await page.getByRole("button", { name: "Leave page" }).click();
    await expect(page.getByTestId("location")).toHaveText("/browser/b/");
    await first().focus();
    await page.keyboard.press("Backspace");
    await expect(page.getByTestId("location")).toHaveText("/browser/b/");
  });
  test("p resolves metadata, repeats, and yields to a later dialog", async () => {
    await first().focus();
    await page.keyboard.press("p");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(first()).toBeFocused();
    await page.keyboard.press("p");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(first()).toBeFocused();
    let release: (() => void) | undefined;
    await page.route("**/objects/metadata?**", async (route) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route
        .fulfill({ json: { objectMetadata: { "Content-Type": "text/plain" } } })
        .catch(() => {});
    });
    await page.keyboard.press("p");
    await expect.poll(() => Boolean(release)).toBe(true);
    await page.keyboard.press("?");
    await expect(
      page.getByRole("dialog", { name: "Keyboard shortcuts" }),
    ).toBeVisible();
    release!();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(first()).toBeFocused();
  });
  test("anonymous menu keeps public transport and read ownership", async () => {
    const headers: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/objects/metadata"))
        headers.push(request.headers()["x-anonymous"] || "missing");
    });
    await page.getByRole("button", { name: "Public mode" }).click();
    await first().focus();
    await page.keyboard.press("Shift+F10");
    const menu = page.getByRole("menu", { name: "Object actions" });
    await expect(
      menu.getByRole("menuitem", { name: "Download", exact: true }),
    ).not.toHaveAttribute("aria-disabled", "true");
    await expect(
      menu.getByRole("menuitem", { name: "Preview", exact: true }),
    ).not.toHaveAttribute("aria-disabled", "true");
    expect(headers.length).toBeGreaterThan(0);
    expect(headers.every((value) => value === "1")).toBe(true);
    await expect(
      menu.getByRole("menuitem", { name: "Delete", exact: true }),
    ).toHaveCount(0);
    await menu.getByRole("menuitem", { name: "Preview", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
  for (const change of ["same", "other object", "other version", "session"])
    test(`direct file delete refreshes only its current identity: ${change}`, async () => {
      await page
        .getByRole("button", { name: "Details A", exact: true })
        .click();
      let release: (() => void) | undefined;
      await page.route("**/api/v1/buckets/b/objects?**", async (route) => {
        if (route.request().method() !== "DELETE") return route.fallback();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        await route.fulfill({ status: 204 });
      });
      await first().focus();
      await page.keyboard.press("Shift+F10");
      await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect.poll(() => Boolean(release)).toBe(true);
      if (change !== "same") {
        await page.keyboard.press("Escape");
        await page
          .getByRole("button", {
            name:
              change === "other object"
                ? "Details B"
                : change === "other version"
                  ? "Other version"
                  : "Reset session",
            exact: true,
          })
          .click();
      }
      const response = page.waitForResponse(
        (response) => response.request().method() === "DELETE",
      );
      release!();
      await response;
      await expect(page.getByTestId("revision")).toHaveText(
        change === "same" ? "1" : "0",
      );
      await expect(page.getByTestId("tasks")).toHaveText("[]");
    });

  for (const newSession of [false, true])
    test(`delayed direct-delete failure preserves session notification ownership: newSession=${newSession}`, async () => {
      let release: (() => void) | undefined;
      await page.route("**/api/v1/buckets/b/objects?**", async (route) => {
        if (route.request().method() !== "DELETE") return route.fallback();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        await route.fulfill({
          status: 500,
          json: {
            message: "Delayed delete failure",
            detailedMessage: "T21 controlled failure",
          },
        });
      });
      await first().focus();
      await page.keyboard.press("ContextMenu");
      await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect.poll(() => Boolean(release)).toBe(true);
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", {
          name: newSession ? "Reset session" : "Details B",
          exact: true,
        })
        .click();
      const response = page.waitForResponse(
        (response) => response.request().method() === "DELETE",
      );
      release!();
      await response;
      if (newSession) await expect(page.getByTestId("notice")).toHaveText("");
      else
        await expect(page.getByTestId("notice")).toContainText(
          "Delayed delete failure",
        );
      await expect(page.getByTestId("revision")).toHaveText("0");
    });
  test("folder confirmation captures one recursive T20 target and keeps policy owner", async () => {
    await page.getByRole("button", { name: "Folder row" }).click();
    const row = page.getByRole("row", { name: /^docs\/folder\// });
    await row.focus();
    await page.keyboard.press("ContextMenu");
    await page
      .getByRole("menuitem", { name: "Anonymous Access", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const dialogFocus = () =>
      page.evaluate(() => ({
        active: document.activeElement?.outerHTML,
        label: document.activeElement?.closest("label")?.outerHTML,
        dialogs: document.querySelectorAll('[role="dialog"]').length,
        tooltips: Array.from(document.querySelectorAll('[role="tooltip"]')).map(
          (element) => ({
            text: element.textContent,
            hidden: element.getAttribute("aria-hidden"),
          }),
        ),
      }));
    await test.info().attach("anonymous-before-escape", {
      body: JSON.stringify(await dialogFocus(), null, 2),
      contentType: "application/json",
    });
    await expect(page.locator("#prefix")).toBeFocused();
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await test.info().attach("anonymous-after-escape", {
      body: JSON.stringify(await dialogFocus(), null, 2),
      contentType: "application/json",
    });
    await expect(row).toBeFocused();
    await page.keyboard.press("ContextMenu");
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Delete Objects" }),
    ).toBeVisible();
    await page.getByLabel("Delete All Versions", { exact: true }).check();
    await page.getByLabel("Bypass Governance Mode", { exact: true }).check();
    const deletion = page.waitForRequest(
      (request) => request.method() === "DELETE",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    const request = await deletion;
    const url = new URL(request.url());
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      prefix: "docs/folder/",
      recursive: "true",
      all_versions: "true",
      bypass: "true",
    });
    await expect
      .poll(
        async () =>
          JSON.parse(await page.getByTestId("tasks").innerText()).length,
      )
      .toBe(1);
    const task = JSON.parse(await page.getByTestId("tasks").innerText())[0];
    expect(task.kind).toBe("delete");
    expect(task.targets).toHaveLength(1);
    expect(task.targets[0]).toMatchObject({
      bucket: "b",
      key: "docs/folder/",
      recursive: true,
      allVersions: true,
      bypass: true,
    });
  });
  test("folder policy starts on its field while keyboard help keeps local Escape ownership", async () => {
    await page.getByRole("button", { name: "Folder row" }).click();
    const row = page.getByRole("row", { name: /^docs\/folder\// });
    await row.focus();
    await page.keyboard.press("ContextMenu");
    await page
      .getByRole("menuitem", { name: "Anonymous Access", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    const field = dialog.locator("#prefix");
    const help = dialog.locator('label[for="prefix"] [data-field-help]');
    await expect(field).toBeFocused();
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await page.keyboard.press("Shift+Tab");
    await expect(help).toBeFocused();
    await expect(page.getByRole("tooltip")).toContainText(
      "Enter '/' to apply the rule",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(help).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(field).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(row).toBeFocused();
    await expect(dialog).toHaveCount(0);
  });
  test("p resolves extensionless metadata and explicit version read permissions", async () => {
    await page
      .getByRole("button", { name: "Version-only extensionless" })
      .click();
    await page.route("**/api/v1/buckets/b/objects**", (route) =>
      route.fulfill({
        json: {
          objects: [
            {
              name: "docs/no-extension",
              size: 1,
              version_id: "rewind-v1",
              is_latest: false,
            },
          ],
          objectMetadata: { "Content-Type": "text/plain" },
        },
      }),
    );
    const metadata = page.waitForRequest((request) =>
      request.url().includes("/objects/metadata"),
    );
    await page.getByRole("row", { name: /^docs\/no-extension/ }).focus();
    await page.keyboard.press("p");
    expect(new URL((await metadata).url()).searchParams.get("versionID")).toBe(
      "rewind-v1",
    );
    await expect(page.getByRole("dialog")).toBeVisible();
  });
  test("denied read and delete markers keep focusable reasons without activating", async () => {
    await page.getByRole("button", { name: "Read denied" }).click();
    await first().focus();
    await page.keyboard.press("ContextMenu");
    const download = page.getByRole("menuitem", {
      name: "Download",
      exact: true,
    });
    await expect(download).toHaveAttribute("aria-disabled", "true");
    await download.focus();
    await expect(download).toHaveAccessibleDescription(
      "You need s3:GetObject permission.",
    );
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.route("**/api/v1/buckets/b/objects**", (route) =>
      route.fulfill({
        json: { objects: [{ name: "docs/000.txt", is_delete_marker: true }] },
      }),
    );
    await first().focus();
    await page.keyboard.press("ContextMenu");
    const preview = page.getByRole("menuitem", {
      name: "Preview",
      exact: true,
    });
    await preview.focus();
    await expect(preview).toHaveAccessibleDescription(
      "This version is a delete marker.",
    );
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
