// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { test, expect, chromium } from "@playwright/test";
import { build } from "vite";
import { fileURLToPath } from "node:url";
import { browserExecutable } from "./fixtures/browserExecutable";

let script: string;
test.beforeAll(async () => {
  const previous = process.env.NODE_ENV;
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
            new URL("./fixtures/taskGuardHarness.tsx", import.meta.url),
          ),
          formats: ["iife"],
          name: "TaskGuardHarness",
        },
      },
    });
    const output = Array.isArray(result) ? result[0] : result;
    if (!("output" in output)) throw new Error("No harness output");
    script = output.output
      .filter((entry) => entry.type === "chunk")
      .map((entry) => entry.code)
      .join("\n");
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
for (const base of ["/", "/console"]) {
  test(`public router push, replace, POP, cancellation and logout before effects at ${base}`, async () => {
    const browser = await chromium.launch({
      executablePath: browserExecutable(),
    });
    try {
      const page = await browser.newPage();
      let logoutPosts = 0;
      await page.route("http://task.test/**", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: '<div id="root"></div>',
        }),
      );
      await page.route("**/api/v1/logout", (route) => {
        logoutPosts++;
        return route.fulfill({ status: 204 });
      });
      await page.goto(`http://task.test/?base=${encodeURIComponent(base)}`);
      await page.addScriptTag({ content: script });
      const location = page.getByTestId("location");
      await page.getByRole("button", { name: "Push B", exact: true }).click();
      await expect(location).toHaveText("/b?sort=name#anchor");
      await page
        .getByRole("button", { name: "Start delete", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Replace C", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(location).toHaveText("/b?sort=name#anchor");
      await page
        .getByRole("button", { name: "Stay here", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Replace C", exact: true }),
      ).toBeFocused();
      await page
        .getByRole("button", { name: "Replace C", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Leave page", exact: true })
        .click();
      await expect(location).toHaveText("/c");
      await page.evaluate(() => history.back());
      await page
        .getByRole("button", { name: "Stay here", exact: true })
        .click();
      await expect(location).toHaveText("/c");
      await page.evaluate(() => history.back());
      await page
        .getByRole("button", { name: "Leave page", exact: true })
        .click();
      await expect(location).toHaveText("/a");
      await page.evaluate(() => history.forward());
      await page
        .getByRole("button", { name: "Leave page", exact: true })
        .click();
      await expect(location).toHaveText("/c");
      await page.getByRole("button", { name: "Encoded", exact: true }).click();
      await page
        .getByRole("button", { name: "Leave page", exact: true })
        .click();
      await expect(location).toHaveText("/browser/b/dir%252Fname%2F");
      await expect(page.getByTestId("state")).toContainText("encoded");
      expect(new URL(page.url()).pathname).toBe(
        `${base === "/" ? "" : base}/browser/b/dir%252Fname%2F`,
      );
      await page.getByRole("button", { name: "Logout", exact: true }).click();
      const evidence = () =>
        page.evaluate(() => (window as any).taskGuardEvidence());
      expect((await evidence()).effects).not.toContain("/logout");
      await page
        .getByRole("button", { name: "Stay here", exact: true })
        .click();
      expect((await evidence()).cancelled).toBe(0);
      expect(logoutPosts).toBe(0);
      await page.getByRole("button", { name: "Logout", exact: true }).click();
      await page
        .getByRole("button", { name: "Cancel tasks and leave", exact: true })
        .click();
      await expect(location).toHaveText("/logout");
      expect((await evidence()).cancelled).toBe(1);
      await expect.poll(() => logoutPosts).toBe(1);
      const events = (await evidence()).effects;
      expect(events.indexOf("cancel")).toBeLessThan(events.indexOf("/logout"));
      await page
        .getByRole("button", { name: "Start upload", exact: true })
        .click();
      const unload = () =>
        page.evaluate(() => {
          const event = new Event("beforeunload", { cancelable: true });
          window.dispatchEvent(event);
          return event.defaultPrevented;
        });
      await expect.poll(unload).toBe(true);
      await page.getByRole("button", { name: "Complete", exact: true }).click();
      await expect.poll(unload).toBe(false);
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      await page
        .getByRole("button", { name: "Start delete", exact: true })
        .click();
      expect(await unload()).toBe(false);
      await page
        .getByRole("button", { name: "Logout variant", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Stay here", exact: true })
        .click();
      expect(logoutPosts).toBe(1);
      await page
        .getByRole("button", { name: "Logout variant", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Cancel tasks and leave", exact: true })
        .click();
      await expect(location).toHaveText("/LOGOUT/");
      await expect.poll(() => logoutPosts).toBe(2);
      await page
        .getByRole("button", { name: "Anonymous", exact: true })
        .click();
      await page
        .getByTestId("drop-source")
        .locator("input")
        .setInputFiles({
          name: "owned.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("old"),
        });
      await page
        .getByRole("button", { name: "Anonymous Login", exact: true })
        .click();
      await expect(location).toHaveText("/LOGIN/");
      await expect.poll(async () => (await evidence()).anonymous).toBe(false);
      await page.evaluate(() => (window as any).releaseExtraction());
      await expect
        .poll(async () => (await evidence()).extractionFinished)
        .toBe(true);
      expect((await evidence()).queuedUploads).toBe(0);
    } finally {
      await browser.close();
    }
  });
}

test("queued version deletion releases only submitted checkboxes and the next selection targets its own ID", async () => {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
  });
  try {
    const page = await browser.newPage();
    await page.route("http://task.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<base href="/"><div id="root"></div>',
      }),
    );
    let ids = ["v3", "v2", "v1"];
    const writes: string[] = [];
    await page.route("**/api/v1/buckets/b/objects?**", async (route) => {
      const u = new URL(route.request().url());
      expect(u.searchParams.get("prefix")).toBe("owned");
      if (route.request().method() === "DELETE") {
        const id = u.searchParams.get("version_id")!;
        writes.push(id);
        ids = ids.filter((item) => item !== id);
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({
        json: {
          objects: ids.map((id, index) => ({
            name: "owned",
            version_id: id,
            is_latest: index === 0,
            size: 10,
            last_modified: "2026-10-24T00:00:00Z",
          })),
        },
      });
    });
    await page.goto("http://task.test/?versions=1");
    await page.addScriptTag({ content: script });
    await page
      .getByRole("button", { name: "Select multiple versions", exact: true })
      .click();
    const pick = async (id: string) => {
      const checkbox = page.locator(`input[type="checkbox"][value="${id}"]`);
      await checkbox.click();
      await expect(checkbox).toBeChecked();
    };
    const remove = page.getByRole("button", {
      name: "Delete selected versions",
      exact: true,
    });
    await pick("v1");
    await remove.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page.locator('input[value="v1"]')).toHaveCount(0);
    await expect(remove).toBeDisabled();
    await expect(page.locator('input[type="checkbox"]:checked')).toHaveCount(0);
    await pick("v2");
    await remove.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect.poll(() => writes).toEqual(["v1", "v2"]);
    await expect(remove).toBeDisabled();
  } finally {
    await browser.close();
  }
});
