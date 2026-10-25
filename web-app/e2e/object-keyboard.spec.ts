// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { join } from "node:path";
import { stat } from "node:fs/promises";
import { guiEnvironment } from "./fixtures/guiEnvironment";
const docs = "/browser/demo-data/docs%2F";
// Match captured row identity without depending on translated visible cells.
const keyRow = (page: Page, key: string) =>
  page
    .locator('[role="row"]')
    .and(page.locator(`[data-fluid-key=${JSON.stringify(key)}]`));
const displayedKeys = (page: Page, selected = false) =>
  page
    .locator(
      `[role="row"][data-fluid-key]${selected ? '[aria-selected="true"]' : ""}`,
    )
    .evaluateAll((rows) =>
      rows.map((row) => row.getAttribute("data-fluid-key")!),
    );
async function openDocs(page: Page) {
  await page.goto(docs);
  await expect(keyRow(page, "docs/CHANGELOG.md")).toBeVisible();
  await expect(page.locator('[role="row"][data-fluid-key]')).toHaveCount(9);
}
async function menuFor(page: Page, key: string) {
  await keyRow(page, key).focus();
  await page.keyboard.press("Shift+F10");
  const menu = page.getByRole("menu", { name: "Object actions", exact: true });
  await expect(
    menu.getByRole("menuitem", { name: "Delete", exact: true }),
  ).toBeVisible();
  return menu;
}

test("real docs keyboard navigation, three-file range, accessible menu and parent", async ({
  page,
}) => {
  await page.goto("/browser/demo-data");
  await keyRow(page, "docs/").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/browser\/demo-data\/docs%2F$/);
  await expect(page.locator('[role="row"][data-fluid-key]')).toHaveCount(9);
  const order = await displayedKeys(page);
  const first = keyRow(page, order[0]);
  await expect(first).toBeVisible();
  await first.focus();
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(page.locator('[role="row"][aria-selected="true"]')).toHaveCount(
    3,
  );
  expect(await displayedKeys(page, true)).toEqual(order.slice(0, 3));
  expect(await first.getAttribute("aria-label")).toContain(
    `${order[0]}, File,`,
  );
  await expect(first).toHaveAccessibleName(/, File, .*KiB/);
  await page.keyboard.press("Shift+F10");
  await expect(
    page.getByRole("menu", { name: "Object actions" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(keyRow(page, order[2])).toBeFocused();
  await page.keyboard.press("Backspace");
  await expect(page).toHaveURL(/\/browser\/demo-data\/$/);
  await expect(keyRow(page, "docs/")).toBeVisible();
  await keyRow(page, "docs/").focus();
  await page.keyboard.press("Alt+ArrowUp");
  await expect(page).toHaveURL(/\/browser\/demo-data\/$/);
});

test("Space, modifiers, filter and accepted Enter selection ownership", async ({
  page,
}) => {
  await openDocs(page);
  const order = await displayedKeys(page);
  const first = keyRow(page, order[0]);
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/docs%2F$/);
  await keyRow(page, order[2]).click({ modifiers: ["Shift"] });
  await expect(page.locator('[role="row"][aria-selected="true"]')).toHaveCount(
    3,
  );
  expect(await displayedKeys(page, true)).toEqual(order.slice(0, 3));
  await keyRow(page, order[1]).click({ modifiers: ["ControlOrMeta"] });
  await expect(page.locator('[role="row"][aria-selected="true"]')).toHaveCount(
    2,
  );
  expect(await displayedKeys(page, true)).toEqual([order[0], order[2]]);
  await page.keyboard.press("ControlOrMeta+a");
  await expect(page.locator('[role="row"][aria-selected="true"]')).toHaveCount(
    9,
  );
  await expect(
    page.getByText("Selected 9 objects on this page.", { exact: true }),
  ).toBeVisible();
  await keyRow(page, "docs/README.md").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/docs%2FREADME.md$/);
  await expect(page.locator('[role="row"][aria-selected="true"]')).toHaveCount(
    0,
  );
  await keyRow(page, "docs/README.md").focus();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/docs%2F$/);
  await page.keyboard.press("/");
  const filter = page.getByPlaceholder(
    "Start typing to filter objects in the bucket",
  );
  await expect(filter).toBeFocused();
  await filter.fill("README");
  await expect(page.locator('[role="row"][data-fluid-key]')).toHaveCount(2);
  await filter.press("Control+a");
  await expect(page.locator('[role="row"][aria-selected="true"]')).toHaveCount(
    0,
  );
});

test("file action parity, disabled reasons and original delete confirmation without mutation", async ({
  page,
}) => {
  await openDocs(page);
  let deletes = 0;
  page.on("request", (request) => {
    if (request.method() === "DELETE") deletes++;
  });
  const menu = await menuFor(page, "docs/README.md");
  for (const label of [
    "Download",
    "Share",
    "Preview",
    "Legal Hold",
    "Retention",
    "Tags",
    "Inspect",
    "Display Object Versions",
    "Delete",
  ])
    await expect(
      menu.getByRole("menuitem", { name: label, exact: true }),
    ).toBeVisible();
  const hold = menu.getByRole("menuitem", { name: "Legal Hold", exact: true });
  await hold.focus();
  await expect(hold).toHaveAttribute("aria-disabled", "true");
  await expect(hold).toHaveAccessibleDescription(
    "Object Lock is not enabled on this bucket.",
  );
  await menu.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Delete Object" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(keyRow(page, "docs/README.md")).toBeFocused();
  expect(deletes).toBe(0);
  const reopened = await menuFor(page, "docs/README.md");
  await reopened.getByRole("menuitem", { name: "Share", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(keyRow(page, "docs/README.md")).toBeFocused();
});

test("preview shortcut can be repeated and shares the existing Preview owner", async ({
  page,
}) => {
  await openDocs(page);
  const file = keyRow(page, "docs/README.md");
  for (let i = 0; i < 2; i++) {
    await file.focus();
    await page.keyboard.press("p");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("README.md");
    await page.keyboard.press("Escape");
    await expect(file).toBeFocused();
  }
});

test("folder actions and empty-area owners remain reachable without writes", async ({
  page,
}) => {
  await page.goto("/browser/demo-data");
  const menu = await menuFor(page, "docs/");
  await expect(
    menu.getByRole("menuitem", { name: "Anonymous Access", exact: true }),
  ).toBeVisible();
  await menu.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await openDocs(page);
  const group = page.getByRole("group", { name: "Objects", exact: true });
  await group.click({ button: "right", position: { x: 2, y: 100 } });
  const empty = page.getByRole("menu", { name: "Folder actions" });
  await expect(
    empty.getByRole("menuitem", { name: "Upload", exact: true }),
  ).toBeVisible();
  await empty
    .getByRole("menuitem", { name: "Create new path", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await group.click({ button: "right", position: { x: 2, y: 100 } });
  await empty.getByRole("menuitem", { name: "Refresh", exact: true }).click();
  await expect(keyRow(page, "docs/README.md")).toBeVisible();
  await group.click({ button: "right", position: { x: 2, y: 100 } });
  const chooser = page.waitForEvent("filechooser");
  await empty.getByRole("menuitem", { name: "Upload", exact: true }).click();
  expect(await (await chooser).element().getAttribute("type")).toBe("file");
});

test("original download, Tasks and command search retain overlay ownership", async ({
  page,
}) => {
  await openDocs(page);
  const menu = await menuFor(page, "docs/README.md");
  const incoming = page.waitForEvent("download");
  await menu.getByRole("menuitem", { name: "Download", exact: true }).click();
  const file = await incoming;
  const saved = join(guiEnvironment().artifacts, "README-download.md");
  await file.saveAs(saved);
  expect((await stat(saved)).size).toBe(17792);
  const tasks = page.getByRole("dialog", { name: "Tasks", exact: true });
  if (!(await tasks.isVisible()))
    await page.getByRole("button", { name: /^Tasks(?::|$)/ }).click();
  await expect(tasks).toBeVisible();
  await page.keyboard.press("?");
  await expect(
    page.getByRole("dialog", { name: "Keyboard shortcuts" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(tasks).not.toBeVisible();
  await expect(page.getByRole("dialog", { includeHidden: true })).toHaveCount(
    0,
  );
  await keyRow(page, "docs/README.md").focus();
  // The emulated browser platform can differ from the host running Playwright.
  const commandModifier = await page.evaluate(() =>
    /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "Meta" : "Control",
  );
  await page.keyboard.press(`${commandModifier}+k`);
  const search = page.getByRole("dialog", { name: "Search", exact: true });
  await expect(search).toBeVisible();
  await page.keyboard.press("?");
  await expect(
    page.getByRole("dialog", { name: "Keyboard shortcuts" }),
  ).toHaveCount(0);
  await expect(page.locator('[role="row"][aria-selected="true"]')).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  await expect(search).not.toBeVisible();
});

test("Chinese context menu clamps to viewport and reduced-motion help is readable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("language", "zh");
    localStorage.setItem("dark-mode", "on");
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDocs(page);
  const row = keyRow(page, "docs/README.md");
  const bounds = await row.boundingBox();
  expect(bounds).not.toBeNull();
  await row.click({
    button: "right",
    position: { x: bounds!.width - 2, y: bounds!.height - 2 },
  });
  const menu = page.getByRole("menu", { name: "对象操作", exact: true });
  await expect(
    menu.getByRole("menuitem", { name: "删除", exact: true }),
  ).toBeVisible();
  const box = await menu.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(8);
  expect(box!.x + box!.width).toBeLessThanOrEqual(1016);
  expect(box!.y).toBeGreaterThanOrEqual(8);
  expect(box!.y + box!.height).toBeLessThanOrEqual(760);
  await expect(menu).toHaveCSS("animation-name", "none");
  await page.screenshot({
    path: join(guiEnvironment().screenshots, "context-menu-zh-edge.png"),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(row).toBeFocused();
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "键盘快捷键" })).toBeVisible();
  await page.screenshot({
    path: join(guiEnvironment().screenshots, "shortcuts-zh-dark.png"),
    animations: "disabled",
  });
});

for (const theme of ["light", "dark"])
  test(`menu and shortcut dialog ${theme} screenshots and accessibility`, async ({
    page,
  }) => {
    await page.addInitScript(
      (theme) =>
        localStorage.setItem("dark-mode", theme === "dark" ? "on" : "off"),
      theme,
    );
    await openDocs(page);
    const env = guiEnvironment();
    const menu = await menuFor(page, "docs/README.md");
    await page.screenshot({
      path: join(env.screenshots, `context-menu-${theme}.png`),
      animations: "disabled",
    });
    const menuAudit = await new AxeBuilder({ page })
      .include('[role="menu"]')
      .analyze();
    expect(
      menuAudit.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
    ).toEqual([]);
    await page.keyboard.press("Escape");
    await page.keyboard.press("?");
    const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(dialog).toBeVisible();
    await page.screenshot({
      path: join(env.screenshots, `shortcuts-${theme}.png`),
      animations: "disabled",
    });
    const audit = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();
    expect(
      audit.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
    ).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(keyRow(page, "docs/README.md")).toBeFocused();
    await page.getByRole("button", { name: "Open help", exact: true }).click();
    await page
      .getByRole("button", { name: "Keyboard shortcuts", exact: true })
      .click();
    await expect(dialog).toBeVisible();
  });
