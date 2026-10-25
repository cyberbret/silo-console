// Copyright (c) 2026 MinIO, Inc.
// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "./fixtures/baseFixture";
import { minioadminFile, SERVER_ENDPOINT } from "./consts";

test.use({
  storageState: minioadminFile,
  viewport: { width: 1280, height: 800 },
});

// Use native keyboard input: TestCafe's synthetic Space event does not
// activate a native button. Keep the real page's focus and responsive checks.
test("sidebar controls stay named and keyboard-operable across desktop and mobile", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.removeItem("sidebarOpen"));
  await page.goto(`${SERVER_ENDPOINT}/overview`);
  const menu = page.locator(".menuBox");
  const toggle = page.locator(".menuBox button[aria-expanded]").first();
  const unnamedControls = () =>
    page
      .locator('.menuBox button, .menuBox a, .menuBox [role="button"]')
      .evaluateAll((nodes) =>
        nodes
          .filter(
            (node) =>
              (node as HTMLElement).getClientRects().length &&
              getComputedStyle(node).visibility !== "hidden",
          )
          .filter(
            (node) =>
              !node.getAttribute("aria-label")?.trim() &&
              !node.getAttribute("aria-labelledby")?.trim() &&
              !(node as HTMLElement).innerText.trim(),
          )
          .map((node) => node.id || node.className),
      );

  await expect(toggle).toHaveAccessibleName("Collapse menu");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(await unnamedControls()).toEqual([]);
  await page.keyboard.press("Tab");
  await expect(toggle).toBeFocused();
  await expect(toggle).not.toHaveCSS("outline-style", "none");
  await page.keyboard.press("Tab");
  await expect(page.locator("#overview")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(menu).toHaveClass(/collapsed/);
  await expect(toggle).toHaveAccessibleName("Expand menu");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  expect(await unnamedControls()).toEqual([]);

  await page.keyboard.press("Space");
  await expect(menu).not.toHaveClass(/collapsed/);
  await expect(toggle).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByRole("button", { name: "Open menu", exact: true });
  const drawer = page.getByRole("dialog", { name: "Menu", exact: true });
  await expect(trigger).toBeVisible();
  await expect(toggle).toBeHidden();
  await trigger.click();
  await expect(drawer).toBeVisible();
  expect(await unnamedControls()).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
});
