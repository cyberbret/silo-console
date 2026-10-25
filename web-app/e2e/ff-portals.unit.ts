// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { fileURLToPath } from "node:url";
import { chromium, expect, test } from "@playwright/test";
import { build } from "vite";
import { browserExecutable } from "./fixtures/browserExecutable";

const buildHarness = async (fixture: string) => {
  const previousNodeEnv = process.env.NODE_ENV;
  let result: Awaited<ReturnType<typeof build>>;
  try {
    process.env.NODE_ENV = "production";
    result = await build({
      configFile: false,
      logLevel: "silent",
      define: { "process.env.NODE_ENV": '"production"' },
      resolve: {
        alias: { i18n: fileURLToPath(new URL("../src/i18n", import.meta.url)) },
      },
      build: {
        write: false,
        lib: {
          entry: fileURLToPath(
            new URL(`./fixtures/${fixture}.tsx`, import.meta.url),
          ),
          name: "FoundationHarness",
          formats: ["iife"],
        },
      },
    });
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
  const output = Array.isArray(result) ? result[0] : result;
  if (!("output" in output))
    throw new Error("Foundation harness build has no output");
  const script = output.output.find((item) => item.type === "chunk");
  if (!script || script.type !== "chunk")
    throw new Error("Foundation harness has no script");
  return script.code;
};

test("compact density and elevation survive modal and nested dropdown portals", async () => {
  const script = await buildHarness("ffFoundationHarness");
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: script });
    const dialog = page.locator(".modalContainer");
    await expect(page.locator("#root .modalContainer")).toHaveCount(0);
    await expect(dialog).toHaveAttribute("data-surface-level", "5");
    await expect(dialog).toHaveCSS("background-color", "rgb(51, 51, 51)");
    await expect(page.locator("#dialog-density")).toHaveText("compact:28");
    await expect(dialog).toHaveCSS("--control-height", "28px");
    await expect(dialog).toHaveCSS("--fs-body", "12px");
    await expect(page.locator("#nested-surface")).toHaveAttribute(
      "data-surface-level",
      "8",
    );
    await expect(page.locator("#default-density")).toHaveText("default:36");
    await expect(page.locator("#default-reset")).toHaveCSS(
      "--control-height",
      "36px",
    );
    await page.locator("#compact-select-select").click();
    const menu = page.locator("#compact-select-options-selector");
    await expect(
      dialog.locator("#compact-select-options-selector"),
    ).toHaveCount(0);
    await expect(menu).toHaveAttribute("data-surface-level", "7");
    await expect(menu).toHaveCSS("background-color", "rgb(65, 65, 65)");
    await expect(menu).toHaveCSS("--control-height", "28px");
    await expect(menu).toHaveCSS("--fs-body", "12px");
    await expect(page.locator("#menu-muted")).toHaveCSS(
      "color",
      "rgb(184, 184, 184)",
    );
    await expect(page.locator("#nested-muted")).toHaveCSS(
      "color",
      "rgb(184, 184, 184)",
    );
    await expect(page.locator("#lower-muted")).toHaveCSS(
      "color",
      "rgb(163, 163, 163)",
    );
    for (const [textSelector, surfaceSelector] of [
      ["#menu-muted", "#compact-select-options-selector"],
      ["#nested-muted", "#nested-surface"],
      ["#lower-muted", "#lower-surface-reset"],
    ]) {
      const ratio = await page.evaluate(
        ([textSelector, surfaceSelector]) => {
          const luminance = (css: string) => {
            const channels = css
              .match(/\d+/g)!
              .slice(0, 3)
              .map(Number)
              .map((channel) => {
                const value = channel / 255;
                return value <= 0.04045
                  ? value / 12.92
                  : ((value + 0.055) / 1.055) ** 2.4;
              });
            return (
              channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
            );
          };
          const text = luminance(
            getComputedStyle(document.querySelector(textSelector)!).color,
          );
          const background = luminance(
            getComputedStyle(document.querySelector(surfaceSelector)!)
              .backgroundColor,
          );
          return (
            (Math.max(text, background) + 0.05) /
            (Math.min(text, background) + 0.05)
          );
        },
        [textSelector, surfaceSelector],
      );
      expect(ratio, textSelector).toBeGreaterThanOrEqual(4.5);
    }
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  } finally {
    await browser.close();
  }
});

test("painted cards reset their substrate while transparent cards preserve it through real menu portals", async () => {
  const script = await buildHarness("ffCardSurfacesHarness");
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: script });
    for (const prefix of ["floor", "high"]) {
      for (const kind of [
        "table-opaque",
        "table-clear",
        "empty-opaque",
        "empty-clear",
        "stat",
      ]) {
        const id = `${prefix}-${kind}`;
        const transparent = kind.endsWith("clear");
        const substrate = transparent ? (prefix === "high" ? 7 : 1) : 3;
        const popup = Math.min(substrate + 2, 8);
        const section = page.locator(`#${id}`);
        const card = kind.startsWith("table")
          ? section.locator(".fixture-table > div").first()
          : section.locator(":scope > div").first();
        await expect(page.locator(`#${id}-context`)).toHaveText(
          String(substrate),
        );
        await expect(page.locator(`#${id}-density`)).toHaveText("compact:28");
        await expect(card).toHaveCSS(
          "background-color",
          transparent ? "rgba(0, 0, 0, 0)" : "rgb(37, 37, 37)",
        );
        await expect(page.locator(`#${id}-muted`)).toHaveCSS(
          "color",
          substrate === 7 ? "rgb(184, 184, 184)" : "rgb(163, 163, 163)",
        );
        await page.locator(`#${id}-select-select`).click();
        const menu = page.locator(`#${id}-select-options-selector`);
        await expect(
          section.locator(`#${id}-select-options-selector`),
        ).toHaveCount(0);
        await expect(menu).toHaveAttribute("data-surface-level", String(popup));
        const channel = popup === 3 ? 37 : popup === 5 ? 51 : 72;
        await expect(menu).toHaveCSS(
          "background-color",
          `rgb(${channel}, ${channel}, ${channel})`,
        );
        await expect(menu).toHaveCSS("--control-height", "28px");
        await expect(menu).toHaveCSS("--fs-body", "12px");
        await expect(menu).toHaveCSS(
          "--muted-foreground",
          popup === 8 ? "#B8B8B8" : "#A3A3A3",
        );
        await page.keyboard.press("Escape");
        await expect(menu).toHaveCount(0);
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
