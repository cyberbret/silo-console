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
        tsconfigPaths: true,
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

test("painted press geometry, loading width, keyboard controls and portal lifecycles", async () => {
  const script = await buildHarness("ffControlsHarness");
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1200 },
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: script });
    for (const width of [80, 400]) {
      const button = page.locator(`#press${width}`);
      const surface = button.locator(".button-surface");
      const rect = await surface.boundingBox();
      expect(rect!.width).toBe(width - 2);
      expect(
        await surface.evaluate(
          (element) => getComputedStyle(element).boxShadow,
        ),
      ).toMatch(/1px/);
      await button.hover();
      await page.mouse.down();
      await page.waitForTimeout(100);
      const pressed = await surface.boundingBox();
      expect(pressed).toEqual(rect);
      // The unchanged inset rectangle PLUS its 1px spread is the painted surface.
      const spread = await surface.evaluate((element) =>
        getComputedStyle(element)
          .boxShadow.split(")")
          .at(-1)!
          .trim()
          .split(" ")
          .at(-1),
      );
      expect(spread).toBe("0px");
      expect(
        await button.evaluate((element) => getComputedStyle(element).transform),
      ).toBe("none");
      await page.mouse.up();
    }
    const before = await page.locator("#loading").boundingBox();
    await page.locator("#toggle-loading").click();
    expect((await page.locator("#loading").boundingBox())!.width).toBe(
      before!.width,
    );
    await expect(page.locator("#loading")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#compact")).toHaveCSS("height", "28px");
    await expect(page.locator("#compact-field")).toHaveCSS("height", "28px");
    await page.locator("#check").focus();
    await page.keyboard.press("Space");
    await expect(page.locator("#check")).toBeChecked();
    await page.locator("#check").hover();
    await expect(page.locator("#check + .checkbox")).toHaveCSS(
      "border-top-color",
      "rgba(0, 0, 0, 0)",
    );
    await page.locator("#switch").focus();
    await page.keyboard.press("Space");
    await expect(page.locator("#switch")).not.toBeChecked();
    await page.locator("#option-radios-one").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#option-radios-two")).toBeChecked();
    await page.locator("#open").click();
    const parent = page.getByRole("dialog", {
      name: "Parent dialog",
      exact: true,
    });
    await expect(parent).toBeVisible();
    await expect(parent).toHaveCSS("max-width", "540px");
    await expect(parent.locator(".title")).toHaveCSS("font-size", "16px");
    await expect(parent).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    await page.locator("#modal-input").focus();
    const focusPaint = await page.locator("#modal-input").evaluate((input) => {
      const content = input.closest(".dialogContent")!;
      const clip = content.getBoundingClientRect();
      const field = input.getBoundingClientRect();
      const style = getComputedStyle(input);
      return {
        overflow: getComputedStyle(content).overflow,
        outset:
          parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset),
        topRoom: field.top - clip.top,
        rightRoom: clip.right - field.right,
      };
    });
    expect(focusPaint.overflow).toBe("auto");
    expect(focusPaint.outset).toBe(3);
    expect(focusPaint.topRoom).toBeGreaterThanOrEqual(focusPaint.outset);
    expect(focusPaint.rightRoom).toBeGreaterThanOrEqual(focusPaint.outset);
    await page.locator("#close-parent").focus();
    await page.keyboard.press("Tab");
    await expect(
      parent.getByRole("button", { name: "Close", exact: true }),
    ).toBeFocused();
    await page.locator("#open-child").click();
    const child = page.getByRole("dialog", {
      name: "Child dialog",
      exact: true,
    });
    await expect(child).toBeVisible();
    await expect(child).toHaveAttribute("data-surface-level", "8");
    await page.keyboard.press("Escape");
    await expect(child).toHaveCount(0);
    await expect(parent).toBeVisible();
    await expect(page.locator("#open-child")).toBeFocused();
    await page.keyboard.press("Escape");
    const exiting = page
      .locator('.modalBoxMain[aria-hidden="true"]')
      .filter({ has: page.getByText("Parent dialog", { exact: true }) });
    expect(await exiting.evaluate((element) => element.inert)).toBe(true);
    // The paint is retained during exit, while focus has already returned.
    await expect(exiting.locator('[role="dialog"]')).toHaveCount(1);
    await expect(page.locator("#open")).toBeFocused();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () =>
          !!document.activeElement?.closest(
            '.modalBoxMain[aria-hidden="true"]',
          ),
      ),
    ).toBe(false);
    await expect(exiting).toHaveCount(0);
    await page.locator("#open").click();
    await page.locator("#open-sibling").click();
    await page.locator("#close-underlying").click();
    await expect(parent).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    await page.locator("#open").click();
    await page.locator("#tooltip-parent-close").hover();
    await expect(
      page.getByRole("tooltip", { name: "Close this dialog" }),
    ).toBeVisible();
    const dialogTip = parent.getByRole("tooltip", {
      name: "Close this dialog",
    });
    await expect(dialogTip).toBeVisible();
    await expect
      .poll(async () => {
        const trigger = (await page
          .locator("#tooltip-parent-close")
          .boundingBox())!;
        const tip = (await dialogTip.boundingBox())!;
        return Math.min(
          Math.abs(tip.y - trigger.y - trigger.height),
          Math.abs(trigger.y - tip.y - tip.height),
        );
      })
      .toBeCloseTo(8, 0);
    await test.info().attach("tooltip-semantic-dialog-geometry", {
      body: JSON.stringify({
        trigger: await page.locator("#tooltip-parent-close").boundingBox(),
        tooltip: await dialogTip.boundingBox(),
        host: await dialogTip.evaluate((element) => ({
          role: element.parentElement?.getAttribute("role"),
          transform: getComputedStyle(element.parentElement!).transform,
          offsetParentRole: (element as HTMLElement).offsetParent?.getAttribute(
            "role",
          ),
        })),
      }),
      contentType: "application/json",
    });
    await page.locator("#tooltip-parent-close").click();
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await expect(page.locator('[role="tooltip"]')).toHaveCount(0);
    await expect(page.locator(".modalBoxMain")).toHaveCount(0);
    await page.locator("#open-compact").click();
    await expect(page.locator("#compact-copy")).toHaveCSS("font-size", "12px");
    const compactDialog = page.getByRole("dialog", { name: "Compact dialog" });
    await expect(compactDialog).toHaveCSS("max-width", "360px");
    expect(
      await compactDialog
        .locator(".titleIcon")
        .evaluate((element) => getComputedStyle(element).color),
    ).not.toBe(
      await compactDialog
        .locator(".title")
        .evaluate((element) => getComputedStyle(element).color),
    );
    await page.keyboard.press("Escape");
    await page.locator("#open-compact").click();
    await page.waitForTimeout(200);
    await expect(compactDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".modalBoxMain")).toHaveCount(0);
    for (const [id, size] of [
      ["uncontrolled-switch", 16],
      ["compact-switch", 12],
    ] as const) {
      const input = page.locator(`#${id}`);
      const indicator = page
        .locator(`#${id}-switch`)
        .locator("..")
        .locator(".switch-indicator")
        .last();
      const onColor = await indicator.evaluate(
        (element) => getComputedStyle(element).color,
      );
      await input.focus();
      await page.keyboard.press("Space");
      await expect(input).not.toBeChecked();
      expect(
        await indicator.evaluate((element) => getComputedStyle(element).color),
      ).not.toBe(onColor);
      await input.hover();
      await page.mouse.down();
      await page.waitForTimeout(180);
      const pressed = await page
        .locator(`#${id}-switch .switch-thumb`)
        .boundingBox();
      expect(pressed!.width).toBeCloseTo(size + 4, 3);
      expect(pressed!.height).toBeCloseTo(size - 4, 3);
      await page.mouse.up();
    }
    const inputRect = await page.locator("#password-error").boundingBox();
    const actionRect = await page
      .locator("#password-error")
      .locator("..")
      .locator(".overlayAction")
      .boundingBox();
    expect(actionRect!.y + actionRect!.height / 2).toBe(
      inputRect!.y + inputRect!.height / 2,
    );
    // Clear the focus tooltip and its skip window before measuring a fresh entry.
    await page.locator("#field").focus();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(350);
    await page.locator("#tip1").hover();
    await page.waitForTimeout(100);
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await expect(page.getByRole("tooltip")).toHaveText("First tooltip");
    const tip = page.getByRole("tooltip");
    await expect(page.locator("main [role=tooltip]")).toHaveText(
      "First tooltip",
    );
    const triggerBounds = (await page.locator("#tip1").boundingBox())!;
    const tipBounds = (await tip.boundingBox())!;
    await test.info().attach("tooltip-main-geometry", {
      body: JSON.stringify({
        trigger: triggerBounds,
        tooltip: tipBounds,
        host: await tip.evaluate((element) => element.parentElement?.tagName),
      }),
      contentType: "application/json",
    });
    const bridgeX = tipBounds.x + tipBounds.width / 2;
    await page.mouse.move(bridgeX, triggerBounds.y + triggerBounds.height - 1);
    for (
      let y = triggerBounds.y + triggerBounds.height;
      y <= tipBounds.y + 2;
      y += 1
    ) {
      await page.mouse.move(bridgeX, y);
      await page.waitForTimeout(80);
      await expect(tip).toBeVisible();
    }
    await page.locator("#tip2").hover();
    await page.waitForTimeout(30);
    await expect(page.getByRole("tooltip").last()).toHaveText("Second tooltip");
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await page
      .locator("#native-dialog")
      .evaluate((element) => (element as HTMLDialogElement).showModal());
    await page.locator("#native-tooltip").focus();
    await expect(page.locator("#native-dialog [role=tooltip]")).toHaveText(
      "Native tooltip",
    );
    const nativeTip = page.locator("#native-dialog [role=tooltip]");
    await expect
      .poll(async () => {
        const trigger = (await page.locator("#native-tooltip").boundingBox())!;
        const bubble = (await nativeTip.boundingBox())!;
        return Math.min(
          Math.abs(bubble.y - trigger.y - trigger.height),
          Math.abs(trigger.y - bubble.y - bubble.height),
        );
      })
      .toBeCloseTo(8, 0);
    await test.info().attach("tooltip-native-dialog-geometry", {
      body: JSON.stringify({
        trigger: await page.locator("#native-tooltip").boundingBox(),
        tooltip: await nativeTip.boundingBox(),
        host: await nativeTip.evaluate((element) => ({
          tag: element.parentElement?.tagName,
          modal: element.parentElement?.matches(":modal"),
        })),
      }),
      contentType: "application/json",
    });
    await page
      .locator("#native-dialog")
      .evaluate((element) => (element as HTMLDialogElement).close());
    const audit = async () =>
      JSON.parse((await page.locator("#modal-audit").textContent())!);
    expect(await audit()).toEqual({
      mounts: 0,
      unmounts: 0,
      closes: 0,
      modalActive: false,
    });
    await page.locator("#open-captured").click();
    await expect(page.locator("#captured-name")).toHaveText("Captured 1");
    expect((await audit()).modalActive).toBe(true);
    await page.locator("#captured-draft").fill("Canceled local draft");
    await page.locator("#close-captured").click();
    const retained = page
      .locator('.modalBoxMain[aria-hidden="true"]')
      .filter({ has: page.locator("#captured-name") });
    expect(await retained.evaluate((element) => element.inert)).toBe(true);
    await expect(page.locator("#captured-name")).toHaveText("Captured 1");
    await page.locator("#open-captured").click();
    await expect(page.locator("#captured-name")).toHaveText("Captured 2");
    await expect(page.locator("#captured-draft")).toHaveValue("Captured 2");
    await expect.poll(audit).toEqual({
      mounts: 2,
      unmounts: 1,
      closes: 1,
      modalActive: true,
    });
    await page.keyboard.press("Escape");
    await expect(page.locator("#captured-name")).toHaveCount(0);
    await expect
      .poll(audit)
      .toEqual({ mounts: 2, unmounts: 2, closes: 2, modalActive: false });
    for (const id of ["disabled-placeholder", "disabled-textarea"]) {
      expect(
        await page
          .locator(`#${id}`)
          .evaluate(
            (element) => getComputedStyle(element, "::placeholder").color,
          ),
      ).toBe(
        await page
          .locator(`#${id}`)
          .evaluate((element) => getComputedStyle(element).color),
      );
    }
    const coarse = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await coarse.setContent('<div id="root"></div>');
    await coarse.addScriptTag({ content: script });
    await expect(coarse.locator("#field")).toHaveCSS("font-size", "16px");
    await expect(coarse.locator("#disabled-textarea")).toHaveCSS(
      "font-size",
      "16px",
    );
    await coarse.close();
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});

test("Select and Autocomplete use local keys, stable values and parent portal presence", async () => {
  const script = await buildHarness("ffControlsHarness");
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1200 },
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: script });
    const select = page.locator("#select-select");
    await select.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.locator("#select-options-selector-option-1"),
    ).toBeFocused();
    await expect(page.locator("#select-options-selector")).toHaveAccessibleName(
      "Choice",
    );
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(select).toBeFocused();
    await expect(page.locator("#select")).toHaveValue("beta");
    await page.keyboard.press("ArrowDown");
    await expect(
      page.locator("#select-options-selector-option-1"),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#after-select")).toBeFocused();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    const input = page.locator("#autocomplete");
    await input.fill("Bet");
    await expect(input).toBeFocused();
    await expect(page.getByRole("option")).toHaveCount(1);
    await page.keyboard.press("ArrowDown");
    await expect(input).toHaveAttribute(
      "aria-activedescendant",
      "autocomplete-options-Autocomplete-option-0",
    );
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("Beta");
    await expect(input).toBeFocused();
    await expect(
      page.locator(
        "#autocomplete-Autocomplete .iconOption [data-choice-icon=beta]",
      ),
    ).toHaveCount(1);
    await input.fill("Alpha");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect(input).toHaveValue("Alpha ");
    await page.keyboard.press("Escape");
    await expect(input).toHaveValue("Beta");
    await expect(input).not.toHaveAttribute("aria-activedescendant");
    await page.locator("#reset-choice").click();
    await expect(input).toHaveValue("Alpha");
    await input.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Tab");
    await expect(page.locator("#after-autocomplete")).toBeFocused();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await page.locator("#open").click();
    await page.locator("#modal-select-select").click();
    await expect(
      page.locator("#modal-select-options-selector-option-1"),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(page.locator("#modal-select-select")).toBeFocused();
    await page.locator("#modal-select-select").click();
    await expect(page.getByRole("option").nth(1)).toBeFocused();
    await page.waitForTimeout(100);
    // Programmatic close keeps the popup open until the modal context changes.
    const closing = await page.evaluate(() => {
      (document.getElementById("close-parent") as HTMLButtonElement).click();
      return new Promise((resolve) =>
        requestAnimationFrame(() => {
          const popup = document.getElementById(
            "modal-select-options-selector",
          );
          resolve(
            popup
              ? {
                  inert: popup.inert,
                  pointer: getComputedStyle(popup).pointerEvents,
                }
              : null,
          );
        }),
      );
    });
    if (closing) expect(closing).toEqual({ inert: true, pointer: "none" });
    await expect(page.locator("#open")).toBeFocused();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () =>
          !!document.activeElement?.closest("[data-silo-popup],.modalBoxMain"),
      ),
    ).toBe(false);
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.locator("#open").click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});

test("actual ShareFile guards invalidate at close and CommandBar suspends registered shortcuts", async () => {
  const script = await buildHarness("ffBusinessHarness");
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
  });
  try {
    const page = await browser.newPage();
    await page.route("http://controls.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<div id="root"></div>',
      }),
    );
    await page.goto("http://controls.test/");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addScriptTag({ content: script });
    await page.locator("#site-a").click();
    for (const next of ["b", "b"]) {
      await page
        .locator("#edit-rep-peer-endpoint")
        .fill("https://canceled.example.com");
      await page
        .getByRole("button", { name: "Close", exact: true })
        .last()
        .click();
      await page.evaluate(
        (id) => (document.getElementById(id) as HTMLButtonElement).click(),
        `site-${next}`,
      );
      await expect(page.locator("#edit-rep-peer-endpoint")).toHaveValue("");
      await expect(page.getByRole("dialog")).toContainText(
        "https://b.example.com",
      );
      await page.waitForTimeout(220);
      await expect(page.getByRole("dialog")).toBeVisible();
    }
    await page
      .getByRole("button", { name: "Close", exact: true })
      .last()
      .click();
    await expect(page.locator("#site-callbacks")).toHaveText(
      JSON.stringify({ siteCloses: 3, siteSaves: 0 }),
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    for (const target of ["versions", "share"]) {
      await page.locator(`#open-${target}`).click();
      await page.waitForTimeout(target === "share" ? 400 : 50);
      // Closing the actual ShareFile opens a second dialog in the same update.
      await page
        .getByRole("button", { name: "Close", exact: true })
        .last()
        .click();
      await expect(
        page.getByRole("dialog", { name: "New dialog", exact: true }),
      ).toBeVisible();
      await page.evaluate(() =>
        (
          document.getElementById("reject-request") as HTMLButtonElement
        ).click(),
      );
      await page.waitForTimeout(40);
      await expect(page.locator("#modal-message")).toHaveText("");
      await page.evaluate(() =>
        (document.getElementById("request-audit") as HTMLButtonElement).click(),
      );
      const requests = JSON.parse(
        (await page.locator("#request-audit").getAttribute("data-requests"))!,
      );
      expect(requests.at(-1)).toEqual({ kind: target, aborted: true });
      await page
        .getByRole("button", { name: "Close", exact: true })
        .last()
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    await page.locator("#plain-focus").focus();
    await expect
      .poll(
        async () =>
          JSON.parse((await page.locator("#kbar-state").textContent())!)
            .disabled,
      )
      .toBe(false);
    await page.keyboard.press("g");
    await page.keyboard.press("b");
    await expect(page.locator("#actions")).toHaveText("1");
    await page.locator("#open-business").click();
    await page.locator("#nested-business").click();
    for (const key of ["Meta+k", "Control+k"]) {
      await page.keyboard.press(key);
      await expect(page.getByRole("dialog")).toHaveCount(2);
    }
    await page.keyboard.press("g");
    await page.keyboard.press("b");
    await expect(page.locator("#actions")).toHaveText("1");
    await page
      .getByRole("button", { name: "Close", exact: true })
      .last()
      .click();
    await page.keyboard.press("g");
    await page.keyboard.press("b");
    await expect(page.locator("#actions")).toHaveText("1");
    await page
      .getByRole("button", { name: "Close", exact: true })
      .last()
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.locator("#plain-focus").focus();
    await expect
      .poll(
        async () =>
          JSON.parse((await page.locator("#kbar-state").textContent())!)
            .disabled,
      )
      .toBe(false);
    await page.keyboard.press("g");
    await page.keyboard.press("b");
    await expect(page.locator("#actions")).toHaveText("2");
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
