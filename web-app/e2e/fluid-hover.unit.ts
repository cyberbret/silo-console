// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
import { fileURLToPath } from "node:url";
import { Browser, chromium, expect, test } from "@playwright/test";
import { build } from "vite";
import { browserExecutable } from "./fixtures/browserExecutable";
import {
  emptyHighlight,
  highlightReducer,
  pickIndex,
} from "../packages/mds/src/global/fluidHover.logic";

const rect = (left: number, top: number, width = 80, height = 36) => ({
  left,
  top,
  width,
  height,
});
test("picker contains before distance; padding, gaps and past last choose nearest center", () => {
  const rows = [rect(4, 4), rect(4, 44), rect(4, 84)];
  expect(pickIndex({ x: 200, y: 10 }, rows, "y")).toBe(0);
  expect(pickIndex({ x: 10, y: 42 }, rows)).toBe(0);
  expect(pickIndex({ x: 10, y: -50 }, rows)).toBe(0);
  expect(pickIndex({ x: 10, y: 500 }, rows)).toBe(2);
  expect(
    pickIndex(
      { x: 20, y: 20 },
      [rect(0, 0, 100, 100), rect(19, 19, 2, 2)],
      "xy",
    ),
  ).toBe(0);
});
test("picker x, xy grid, deterministic ties, absent/zero rects", () => {
  const cells = [rect(0, 0), rect(92, 0), rect(0, 48), rect(92, 48)];
  expect(pickIndex({ x: 86, y: 18 }, cells, "xy")).toBe(0);
  expect(pickIndex({ x: 140, y: 70 }, cells, "xy")).toBe(3);
  expect(pickIndex({ x: 100, y: 500 }, cells, "x")).toBe(1);
  expect(
    pickIndex({ x: 0, y: 0 }, [undefined, rect(0, 0, 0), rect(0, 0, 1, 0)]),
  ).toBeNull();
  expect(pickIndex({ x: 0, y: 0 }, [])).toBeNull();
});
test("highlight reducer preserves identity on no-op, snaps reflow, glides new target and fades fresh entry", () => {
  const first = highlightReducer(emptyHighlight, {
    type: "target",
    key: "a",
    rect: rect(4, 4),
    fresh: true,
  });
  expect(first).toMatchObject({ visible: true, travel: false, session: 1 });
  expect(
    highlightReducer(first, { type: "target", key: "a", rect: rect(4, 4) }),
  ).toBe(first);
  const reflow = highlightReducer(first, {
    type: "target",
    key: "a",
    rect: rect(4, 8),
  });
  expect(reflow.travel).toBe(false);
  const second = highlightReducer(reflow, {
    type: "target",
    key: "b",
    rect: rect(4, 44),
  });
  expect(second.travel).toBe(true);
  const hidden = highlightReducer(second, { type: "hide" });
  expect(hidden.rect).toBe(second.rect);
  expect(highlightReducer(hidden, { type: "hide" })).toBe(hidden);
  const fresh = highlightReducer(hidden, {
    type: "target",
    key: "a",
    rect: rect(4, 4),
    fresh: true,
    from: rect(4, 44),
  });
  expect(fresh).toMatchObject({
    visible: true,
    travel: false,
    session: 2,
    from: rect(4, 44),
  });
  expect(
    highlightReducer(fresh, { type: "target", key: "z", rect: rect(0, 0, 0) }),
  ).toBe(fresh);
});

test.describe("mounted fluid controls", () => {
  test.describe.configure({ mode: "default" });
  let browser: Browser;
  let script: string;
  test.beforeAll(async () => {
    const previous = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      const result = await build({
        configFile: false,
        logLevel: "silent",
        resolve: { tsconfigPaths: true },
        define: { "process.env.NODE_ENV": '"production"' },
        build: {
          write: false,
          lib: {
            entry: fileURLToPath(
              new URL("./fixtures/fluidHoverHarness.tsx", import.meta.url),
            ),
            name: "FluidHarness",
            formats: ["iife"],
          },
        },
      });
      const output = Array.isArray(result) ? result[0] : result;
      if (!("output" in output)) throw new Error("No harness output");
      const chunk = output.output.find((part) => part.type === "chunk");
      if (!chunk || chunk.type !== "chunk")
        throw new Error("No harness script");
      script = chunk.code;
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
    browser = await chromium.launch({ executablePath: browserExecutable() });
  });
  test.afterAll(async () => browser?.close());
  const pageFor = async (height = 900) => {
    const page = await browser.newPage({ viewport: { width: 1440, height } });
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: script });
    return page;
  };
  test("pointer to keyboard handoff stays on End after scroll/resize, skips disabled and closes one Escape", async () => {
    const page = await pageFor(450);
    try {
      await page.locator("#trigger").click();
      await expect(
        page.getByRole("option", { name: "Option 1", exact: true }),
      ).toBeFocused();
      await page.getByRole("option", { name: "Option 2", exact: true }).hover();
      await page.keyboard.press("End");
      const last = page.getByRole("option", { name: "Option 31" });
      await expect(last).toBeFocused();
      await page.evaluate(() => window.dispatchEvent(new Event("resize")));
      await expect(last).toHaveAttribute("data-fluid-hover", "true");
      const visible = await last.evaluate((item) => {
        const r = item.getBoundingClientRect();
        const p = item.parentElement!.getBoundingClientRect();
        return r.top >= p.top && r.bottom <= p.bottom;
      });
      expect(visible).toBe(true);
      await page.keyboard.press("Home");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await expect(
        page.getByRole("option", { name: "Option 6", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.locator("#choices")).toHaveCount(0);
      await expect(page.locator("#trigger")).toBeFocused();
    } finally {
      await page.close();
    }
  });
  test("equivalent option arrays and shifted indices preserve the active value and immediate Enter", async () => {
    for (const update of ["remove", "remove-first-option"]) {
      const page = await pageFor();
      try {
        await page.locator("#trigger").click();
        await expect(
          page.getByRole("option", { name: "Option 1", exact: true }),
        ).toBeFocused();
        await page.keyboard.press("End");
        const last = page.getByRole("option", {
          name: "Option 31",
          exact: true,
        });
        await expect(last).toBeFocused();
        // Native click updates the parent without moving pointer or DOM focus.
        await page
          .locator(`#${update}`)
          .evaluate((button: HTMLButtonElement) => button.click());
        await expect(last).toBeFocused();
        await expect(last).toHaveAttribute(
          "data-fluid-index",
          update === "remove" ? "31" : "30",
        );
        const state = await last.evaluate((row) => {
          const state = {
            focused: document.activeElement === row,
            active: row.hasAttribute("data-fluid-hover"),
          };
          row.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
          );
          return state;
        });
        expect(state.focused).toBe(true);
        expect(state.active).toBe(true);
        expect(
          await page.evaluate(() => (window as any).fluidCounts.clicked),
        ).toBe("31");
        await expect(page.locator("#choices")).toHaveCount(0);
        await page.locator("#trigger").click();
        await expect(
          page.getByRole("option", { name: "Option 1", exact: true }),
        ).toBeFocused();
      } finally {
        await page.close();
      }
    }
  });
  test("removed or disabled active options deliberately focus the first enabled fallback", async () => {
    for (const update of ["remove-option", "disable-option"]) {
      const page = await pageFor();
      try {
        await page.locator("#trigger").click();
        await expect(
          page.getByRole("option", { name: "Option 1", exact: true }),
        ).toBeFocused();
        await page.keyboard.press("End");
        await expect(
          page.getByRole("option", { name: "Option 31", exact: true }),
        ).toBeFocused();
        await page
          .locator(`#${update}`)
          .evaluate((button: HTMLButtonElement) => button.click());
        const first = page.getByRole("option", {
          name: "Option 1",
          exact: true,
        });
        await expect(first).toBeFocused();
        await expect(first).toHaveAttribute("data-fluid-hover", "true");
        await page.keyboard.press("Enter");
        expect(
          await page.evaluate(() => (window as any).fluidCounts.clicked),
        ).toBe("1");
      } finally {
        await page.close();
      }
    }
  });
  test("input-focused dropdown retains valid active descendant and clears invalid values", async () => {
    for (const update of [
      "remove",
      "remove-first-option",
      "remove-option",
      "disable-option",
    ]) {
      const page = await pageFor();
      try {
        await page.locator("#input-mode").click();
        const input = page.locator("#combo-trigger");
        await input.focus();
        await page.keyboard.press("ArrowDown");
        await expect(page.locator("#choices")).toHaveCSS("opacity", "1");
        await page.keyboard.press("End");
        await expect(input).toHaveAttribute(
          "aria-activedescendant",
          "choices-option-31",
        );
        await page
          .locator(`#${update}`)
          .evaluate((button: HTMLButtonElement) => button.click());
        await expect(input).toBeFocused();
        if (update === "remove" || update === "remove-first-option") {
          await expect(input).toHaveAttribute(
            "aria-activedescendant",
            `choices-option-${update === "remove" ? 31 : 30}`,
          );
          await expect(
            page.getByRole("option", { name: "Option 31", exact: true }),
          ).toHaveAttribute("data-fluid-hover", "true");
          await page.keyboard.press("Enter");
          expect(
            await page.evaluate(() => (window as any).fluidCounts.clicked),
          ).toBe("31");
        } else {
          await expect(input).not.toHaveAttribute("aria-activedescendant");
          await page.keyboard.press("Enter");
          expect(
            await page.evaluate(() => (window as any).fluidCounts.clicked),
          ).toBe("");
          await expect(page.locator("#choices")).toBeVisible();
          await page.keyboard.press("Home");
          await expect(input).toHaveAttribute(
            "aria-activedescendant",
            "choices-option-1",
          );
        }
      } finally {
        await page.close();
      }
    }
  });
  for (const backwards of [false, true])
    test(`popup ${backwards ? "Shift+Tab" : "Tab"} exits relative to trigger`, async () => {
      const page = await pageFor();
      try {
        await page.locator("#trigger").click();
        await expect(
          page.getByRole("option", { name: "Option 1", exact: true }),
        ).toBeFocused();
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press(backwards ? "Shift+Tab" : "Tab");
        await expect(
          page.locator(backwards ? "#before" : "#after"),
        ).toBeFocused();
        await expect(page.locator("#choices")).toHaveCount(0);
        await page.locator("#trigger").click();
        await expect(
          page.getByRole("option", { name: "Option 1", exact: true }),
        ).toBeFocused();
      } finally {
        await page.close();
      }
    });
  test("empty/disabled popup and repeated open leave no keyboard listener behind", async () => {
    const page = await pageFor();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      for (let index = 0; index < 5; index++) {
        await page.locator("#trigger").click();
        await page.keyboard.press("Escape");
        await expect(page.locator("#choices")).toHaveCount(0);
      }
      for (const mode of ["empty", "disabled"]) {
        await page.locator(`#${mode}`).click();
        await page.locator("#trigger").click();
        await expect(page.locator("#choices")).toBeVisible();
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        await page.locator("#after").click();
        await expect(page.locator("#choices")).toHaveCount(0);
      }
      expect(errors).toEqual([]);
    } finally {
      await page.close();
    }
  });
  test("tabs keep manual selection, roving focus, panel targets, and reveal vertical End", async () => {
    const page = await pageFor();
    try {
      const first = page
        .locator("#tabs")
        .getByRole("tab", { name: "Tab 0", exact: true });
      await first.focus();
      await page.keyboard.press("ArrowRight");
      const next = page
        .locator("#tabs")
        .getByRole("tab", { name: "Tab 1", exact: true });
      await expect(first).toHaveAttribute("aria-selected", "true");
      await expect(next).toBeFocused();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await expect(next).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await expect(
        page.getByRole("tab", { name: "Tab 3", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("tabpanel", { name: "Tab 3" })).toBeVisible();
      const routes = page.locator("#vertical").getByRole("tab");
      expect(
        await routes.evaluateAll((tabs) =>
          tabs.every(
            (tab) =>
              !!document.getElementById(tab.getAttribute("aria-controls")!),
          ),
        ),
      ).toBe(true);
      await routes.first().focus();
      await page.keyboard.press("End");
      await expect(routes.last()).toBeFocused();
      expect(
        await routes.last().evaluate((item) => {
          const r = item.getBoundingClientRect();
          const p = item.parentElement!.getBoundingClientRect();
          return r.top >= p.top && r.bottom <= p.bottom;
        }),
      ).toBe(true);
      // Deliver a real resize after End, while Route 3 remains selected.
      await routes.last().evaluate(
        (item) =>
          new Promise<void>((resolve) => {
            const list = item.parentElement!;
            const observer = new ResizeObserver((entries) => {
              if (entries[0].contentRect.height !== 140) return;
              observer.disconnect();
              // Let every resize callback finish before checking visibility.
              requestAnimationFrame(() => resolve());
            });
            observer.observe(list);
            list.style.maxHeight = "140px";
          }),
      );
      await expect(routes.last()).toBeFocused();
      await expect(routes.last()).toHaveAttribute("tabindex", "0");
      await expect(routes.nth(3)).toHaveAttribute("aria-selected", "true");
      await expect(routes.last()).toHaveAttribute("aria-selected", "false");
      expect(
        await routes.last().evaluate((item) => {
          const r = item.getBoundingClientRect();
          const p = item.parentElement!.getBoundingClientRect();
          return r.top >= p.top && r.bottom <= p.bottom;
        }),
      ).toBe(true);
    } finally {
      await page.close();
    }
  });
  test("empty and disabled OverflowMenu keep local Escape and Tab exits", async () => {
    const page = await pageFor();
    try {
      for (const kind of ["Disabled", "Empty"]) {
        const trigger = page.getByRole("button", {
          name: `${kind} actions`,
          exact: true,
        });
        await trigger.focus();
        await page.keyboard.press("ArrowDown");
        const menu = page.getByRole("menu", {
          name: `${kind} actions`,
          exact: true,
        });
        await expect(menu).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(menu).toHaveCount(0);
        await expect(trigger).toBeFocused();
        for (const backwards of [false, true]) {
          await page.keyboard.press("ArrowDown");
          await expect(menu).toBeFocused();
          await page.keyboard.press(backwards ? "Shift+Tab" : "Tab");
          await expect(
            page.locator(`#${kind}-${backwards ? "before" : "after"}`),
          ).toBeFocused();
          await expect(menu).toHaveCount(0);
          await trigger.focus();
        }
      }
    } finally {
      await page.close();
    }
  });
  test("disabled selected tab keeps an enabled keyboard entry", async () => {
    const page = await pageFor();
    try {
      await page.getByRole("tab", { name: "Tab 0", exact: true }).focus();
      await page.locator("#disable-tab").click();
      await expect(
        page.getByRole("tab", { name: "Tab 0", exact: true }),
      ).toBeDisabled();
      await page.keyboard.press("Tab");
      const enabled = page.getByRole("tab", { name: "Tab 1", exact: true });
      await expect(enabled).toBeFocused();
      await expect(enabled).toHaveAttribute("tabindex", "0");
      await page.keyboard.press("Enter");
      await expect(enabled).toHaveAttribute("aria-selected", "true");
    } finally {
      await page.close();
    }
  });
  test("gap click uses native activation, cap, controls guard, and removed item hides", async () => {
    const page = await pageFor();
    try {
      const a = page.locator("#grid button").first();
      await a.hover();
      const r = await a.boundingBox();
      await page.mouse.click(r!.x + r!.width + 4, r!.y + 18);
      expect(await page.evaluate(() => (window as any).fluidCounts.gap)).toBe(
        1,
      );
      await page.locator("#embedded").click();
      expect(
        await page.evaluate(() => (window as any).fluidCounts.control),
      ).toBe(1);
      expect(await page.evaluate(() => (window as any).fluidCounts.gap)).toBe(
        1,
      );
      const grid = await page.locator("#grid").boundingBox();
      await page.mouse.click(grid!.x + grid!.width - 2, grid!.y + 18);
      expect(await page.evaluate(() => (window as any).fluidCounts.gap)).toBe(
        1,
      );
      await a.hover();
      await page
        .locator("#remove")
        .evaluate((button: HTMLButtonElement) => button.click());
      await expect(
        page.locator('#grid [data-fluid-highlight="hover"]'),
      ).toHaveAttribute("data-visible", "false");
    } finally {
      await page.close();
    }
  });
  test("a surviving focused row reconciles its preceding border after insert/remove", async () => {
    const page = await pageFor();
    try {
      const b = page.locator('#grid [data-fluid-key="b"]');
      await b.focus();
      await expect(page.locator('#grid [data-fluid-key="a"]')).toHaveAttribute(
        "data-fluid-before",
        "true",
      );
      await page
        .locator("#remove")
        .evaluate((button: HTMLButtonElement) => button.click());
      await expect(b).toBeFocused();
      await expect(page.locator("#grid")).toHaveAttribute(
        "data-fluid-first",
        "",
      );
      await page
        .locator("#remove")
        .evaluate((button: HTMLButtonElement) => button.click());
      await expect(page.locator('#grid [data-fluid-key="a"]')).toHaveAttribute(
        "data-fluid-before",
        "true",
      );
      await expect(b).toBeFocused();
    } finally {
      await page.close();
    }
  });

  test("ColumnsSelector reveals its parent scroller, preserves selection focus and exits relative to trigger", async () => {
    const page = await pageFor(500);
    try {
      const trigger = page
        .locator("#long-columns")
        .getByRole("button", { name: "Columns" });
      for (const key of ["Tab", "Shift+Tab"]) {
        await trigger.focus();
        await page.keyboard.press(key);
        const expected = await page.evaluate(() => {
          const element = document.activeElement!;
          if (element === document.body)
            throw new Error("No meaningful next control");
          element.setAttribute("data-expected-exit", "true");
          return element.tagName;
        });
        expect(expected).not.toBe("BODY");
        await trigger.click();
        await expect(page.getByRole("menuitemcheckbox").first()).toBeFocused();
        await page.keyboard.press("End");
        const last = page.getByRole("menuitemcheckbox", { name: "Column 31" });
        await expect(last).toBeFocused();
        expect(
          await last.evaluate((item) => {
            const r = item.getBoundingClientRect();
            const p = item
              .closest("[data-silo-popup]")!
              .getBoundingClientRect();
            return r.top >= p.top - 1 && r.bottom <= p.bottom + 1;
          }),
        ).toBe(true);
        await page.keyboard.press(key);
        await expect(page.locator("[data-expected-exit]")).toBeFocused();
        await expect(page.getByRole("menuitemcheckbox")).toHaveCount(0);
        await page
          .locator("[data-expected-exit]")
          .evaluate((item) => item.removeAttribute("data-expected-exit"));
      }
      await trigger.click();
      const first = page.getByRole("menuitemcheckbox").first();
      await expect(first).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(first).toHaveAttribute("aria-checked", "false");
      await expect(first).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    } finally {
      await page.close();
    }
  });

  test("fresh entry fades at target; reduced motion snaps travel and keeps 80/60ms opacity", async () => {
    const page = await pageFor();
    try {
      const a = page.locator('#grid [data-fluid-key="a"]');
      const b = page.locator('#grid [data-fluid-key="b"]');
      const highlight = page.locator('#grid [data-fluid-highlight="hover"]');
      await a.hover();
      await expect(highlight).toHaveAttribute("data-visible", "true");
      await page.mouse.move(1000, 20);
      await expect(highlight).toHaveAttribute("data-visible", "false");
      await b.hover();
      await expect(highlight).toHaveCSS("transition-property", "opacity");
      const target = await b.evaluate((item) => item.offsetLeft);
      expect(
        await highlight.evaluate(
          (item) => new DOMMatrix(getComputedStyle(item).transform).m41,
        ),
      ).toBe(target);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await a.hover();
      await expect(highlight).toHaveCSS("transition-property", "opacity");
      await expect(highlight).toHaveCSS("transition-duration", "0.08s");
      await page.mouse.move(1000, 20);
      await expect(highlight).toHaveCSS("transition-duration", "0.06s");
    } finally {
      await page.close();
    }
  });

  test("virtualized table hides a removed target and repicks only on new pointer input", async () => {
    const page = await pageFor();
    try {
      await page.locator("#virtualize").click();
      const first = page.locator('#table [data-fluid-key="Row 0"]');
      await first.hover();
      const highlight = page.locator('#table [data-fluid-highlight="hover"]');
      await expect(highlight).toHaveAttribute("data-visible", "true");
      await page.locator("#table .ReactVirtualized__Grid").evaluate((grid) => {
        grid.scrollTop = grid.scrollHeight;
      });
      await expect(first).toHaveCount(0);
      await expect(highlight).toHaveAttribute("data-visible", "false");
      await page.locator('#table [data-fluid-key="Row 99"]').hover();
      await expect(highlight).toHaveAttribute("data-visible", "true");
    } finally {
      await page.close();
    }
  });

  test("one hundred real table rows do not rerender on pointer movement; density and header boundary stay correct", async () => {
    const page = await pageFor(5000);
    try {
      await expect(page.locator("#table .rowLine[aria-rowindex]")).toHaveCount(
        100,
      );
      const before = await page.evaluate(
        () => (window as any).fluidCounts.rows,
      );
      await page.evaluate(async () => {
        const root = document.querySelector("#table .fluidTable")!;
        const rows = Array.from(
          root.querySelectorAll(".rowLine[aria-rowindex]"),
        );
        for (let pass = 0; pass < 2; pass++)
          for (const row of rows) {
            const r = row.getBoundingClientRect();
            root.dispatchEvent(
              new MouseEvent("mousemove", {
                bubbles: true,
                clientX: r.left + 24,
                clientY: r.top + 18,
              }),
            );
            await new Promise(requestAnimationFrame);
          }
      });
      expect(await page.evaluate(() => (window as any).fluidCounts.rows)).toBe(
        before,
      );
      console.log(
        "FLUID_PERFORMANCE",
        JSON.stringify({
          rows: 100,
          pointerEvents: 200,
          rendersBefore: before,
          rendersAfter: await page.evaluate(
            () => (window as any).fluidCounts.rows,
          ),
        }),
      );
      await expect(
        page.locator('#table [data-fluid-highlight="hover"]'),
      ).toHaveAttribute("data-visible", "true");
      await page.locator("#table [role=columnheader]").first().hover();
      await expect(
        page.locator('#table [data-fluid-highlight="hover"]'),
      ).toHaveAttribute("data-visible", "false");
      await expect(
        page.locator("#compact-table .rowLine[aria-rowindex]").first(),
      ).toHaveCSS("height", "28px");
      await expect(
        page.locator("#table .rowLine[aria-rowindex]").first(),
      ).toHaveCSS("height", "36px");
      await page.locator("#table .rowLine[aria-rowindex]").first().focus();
      await page.keyboard.press("Enter");
      expect(
        await page.evaluate(() => (window as any).fluidCounts.clicked),
      ).toEqual({ name: "Row 0" });
    } finally {
      await page.close();
    }
  });
});
