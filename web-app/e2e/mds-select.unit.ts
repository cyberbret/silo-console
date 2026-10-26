// Copyright (c) 2026 PGSTY
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fileURLToPath } from "node:url";
import { Browser, chromium, expect, test } from "@playwright/test";
import { build } from "vite";
import { browserExecutable } from "./fixtures/browserExecutable";
import AxeBuilder from "@axe-core/playwright";
import type { NamingMode } from "./fixtures/mdsSelectHarness";

test.describe.configure({ mode: "serial" });

let browser: Browser;
let script: string;

test.beforeAll(async () => {
  // Other fixture servers leave NODE_ENV=development in this worker. JSX
  // transformation and React's runtime must both use production for this bundle.
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  // Bundle the MDS workspace source, as Console does. The regression is
  // an event-ordering bug; checking source text would miss actual selection.
  const result = await build({
    configFile: false,
    logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      lib: {
        entry: fileURLToPath(
          new URL("./fixtures/mdsSelectHarness.tsx", import.meta.url),
        ),
        name: "SelectHarness",
        formats: ["iife"],
      },
    },
  });
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  const output = Array.isArray(result) ? result[0] : result;
  if (!("output" in output)) throw new Error("MDS harness build has no output");
  const chunk = output.output.find((item) => item.type === "chunk");
  if (!chunk || chunk.type !== "chunk")
    throw new Error("MDS harness has no script");
  script = chunk.code;
  browser = await chromium.launch({ executablePath: browserExecutable() });
});

test.afterAll(async () => {
  await browser?.close();
});

for (const action of ["click", "tap", "keyboard", "disabled"] as const) {
  test(`MDS Select respects the ${action} target`, async () => {
    const context = await browser.newContext({ hasTouch: action === "tap" });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setContent('<div id="root"></div>');
      await page.addScriptTag({ content: script });
      await page.getByText("Choose target", { exact: true }).click();
      if (action === "keyboard") {
        await expect(
          page.getByRole("option", { name: "First", exact: true }),
        ).toBeFocused();
        await page.keyboard.press("ArrowDown");
        await expect(page.locator('div[label="Second"]')).toHaveAttribute(
          "data-fluid-hover",
          "true",
        );
        await page.keyboard.press("Enter");
      } else {
        const target = page.locator(
          `div[label="${action === "disabled" ? "Disabled" : "Second"}"]`,
        );
        // Deliberately do not hover/wait first: touch has no hover, and a
        // quick mouse click can precede React's hover-state render.
        if (action === "tap") await target.tap();
        else if (action === "disabled") {
          await expect(target).toHaveAttribute("aria-disabled", "true");
          const bounds = await target.boundingBox();
          await page.mouse.click(
            bounds!.x + bounds!.width / 2,
            bounds!.y + bounds!.height / 2,
          );
        } else await target.click();
      }
      await expect(page.locator('div[label="Second"]')).toHaveCount(0);
      await expect(page.locator("#chosen")).toHaveText(
        action === "disabled" ? "" : "second",
      );
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

for (const language of ["en", "zh"] as const) {
  for (const mode of [
    "label",
    "explicit",
    "explicit-only",
    "fixed",
    "placeholder",
    "unlabelled",
    "empty",
    "disabled",
    "rich",
  ] satisfies NamingMode[]) {
    test(`Select accessible name follows visible content: ${mode} ${language}`, async ({}, info) => {
      const context = await browser.newContext({
        viewport: { width: language === "zh" ? 390 : 1440, height: 900 },
        reducedMotion: "reduce",
      });
      try {
        const page = await context.newPage();
        await page.setContent('<div id="root"></div>');
        await page.evaluate(
          (fixture) => {
            window.selectNamingFixture = fixture;
          },
          { mode, language },
        );
        await page.addScriptTag({ content: script });
        const zh = language === "zh";
        const field = mode.startsWith("explicit")
          ? zh
            ? "账号状态"
            : "Account status"
          : ["placeholder", "unlabelled"].includes(mode)
            ? ""
            : zh
              ? "状态"
              : "Status";
        const placeholder = zh ? "选择状态" : "Choose status";
        const fixed = zh ? "筛选" : "Filter";
        const all = zh ? "全部" : "All";
        const enabled = zh ? "已启用" : "Enabled";
        const visible =
          mode === "empty"
            ? ""
            : mode === "placeholder"
              ? placeholder
              : mode === "fixed"
                ? fixed
                : all;
        const name = (value: string) =>
          [field, value].filter(Boolean).join(" ");
        const trigger = page.locator("#status-select");
        await expect(trigger).toHaveAccessibleName(name(visible));
        if (mode === "disabled") {
          await expect(trigger).toBeDisabled();
          await page.keyboard.press("Tab");
          await expect(page.locator("#after-status")).toBeFocused();
          await expect(page.getByRole("listbox")).toHaveCount(0);
          return;
        }
        await trigger.focus();
        await trigger.press("ArrowDown");
        const listbox = page.getByRole("listbox");
        await expect(listbox).toHaveAccessibleName(
          field || (mode === "placeholder" ? placeholder : all),
        );
        await expect(
          page.getByRole("option", { name: all, exact: true }),
        ).toBeFocused();
        await page.keyboard.press("End");
        // End skips the disabled final option; Enter commits and restores focus.
        await expect(
          page.getByRole("option", { name: enabled, exact: true }),
        ).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.locator("input#status")).toHaveValue("enabled");
        await expect(trigger).toHaveAccessibleName(
          name(mode === "fixed" ? fixed : enabled),
        );
        await expect(trigger).toBeFocused();
        await trigger.press("Space");
        await expect(listbox).toHaveAccessibleName(
          field || (mode === "placeholder" ? placeholder : enabled),
        );
        await page.keyboard.press("Escape");
        await expect(trigger).toBeFocused();
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await trigger.press("ArrowUp");
        await expect(listbox).toBeVisible();
        await page.keyboard.press("Tab");
        await expect(page.locator("#after-status")).toBeFocused();
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        const axe = await new AxeBuilder({ page })
          .withRules([
            "label-content-name-mismatch",
            "button-name",
            "aria-input-field-name",
          ])
          .analyze();
        await info.attach("select-name-axe", {
          body: JSON.stringify(axe),
          contentType: "application/json",
        });
        expect(axe.violations).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }
}
