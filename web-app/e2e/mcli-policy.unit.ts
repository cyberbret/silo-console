// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { fileURLToPath } from "node:url";
import { Browser, Page, Route, chromium, expect, test } from "@playwright/test";
import { build } from "vite";
import { browserExecutable } from "./fixtures/browserExecutable";

test.describe.configure({ mode: "serial" });
let browser: Browser;
let page: Page;
let script: string;
let requests: Map<string, Route[]>;

test.beforeAll(async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const result = await build({
      configFile: false,
      logLevel: "silent",
      resolve: { tsconfigPaths: true },
      define: { "process.env.NODE_ENV": '"production"' },
      build: {
        write: false,
        lib: {
          entry: fileURLToPath(
            new URL("./fixtures/mcliPolicyHarness.tsx", import.meta.url),
          ),
          name: "McliPolicyHarness",
          formats: ["iife"],
        },
      },
    });
    const output = Array.isArray(result) ? result[0] : result;
    if (!("output" in output)) throw new Error("Policy harness has no output");
    const chunk = output.output.find((item) => item.type === "chunk");
    if (!chunk || chunk.type !== "chunk")
      throw new Error("Policy harness has no script");
    script = chunk.code;
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
  browser = await chromium.launch({ executablePath: browserExecutable() });
});

test.beforeEach(async () => {
  requests = new Map();
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route("**/*", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("/group/")) {
      const group = decodeURIComponent(path.split("/").at(-1)!);
      requests.set(group, [...(requests.get(group) || []), route]);
    } else if (path.endsWith("/policies")) {
      await route.fulfill({
        json: {
          policies: ["consoleAdmin", "readonly", "writeonly"].map((name) => ({
            name,
          })),
        },
      });
    } else {
      await route.fulfill({
        contentType: "text/html",
        body: '<div id="root"></div>',
      });
    }
  });
  await page.goto("http://t19.test/");
  await page.evaluate(() =>
    localStorage.setItem("silo.cliEquivalent.open", "true"),
  );
  await page.addScriptTag({ content: script });
  await expect.poll(() => requests.get("t19-group-a")?.length).toBe(1);
  await expect(page.locator('input[value="readonly"]')).toBeAttached();
});

test.afterEach(async () => {
  await page.close();
});
test.afterAll(async () => {
  await browser?.close();
});

const preview = () => page.locator("details code");
const select = async (name: string) => {
  await page
    .locator(`input[type="checkbox"][value="${name}"]`)
    .locator("..")
    .click();
};
const respond = async (group: string, policy: string) => {
  const route = requests.get(group)!.shift()!;
  await route.fulfill({ json: { name: group, policy } });
};

test("delayed single-group baseline cannot preview or save an attach-only replacement", async () => {
  await expect(page.locator('input[value="writeonly"]')).not.toBeChecked();
  await select("readonly");
  await expect(preview()).toHaveText("# Loading current group policies…");
  await expect(page.locator("#save")).toBeDisabled();
  await respond("t19-group-a", "consoleAdmin");
  await expect(page.locator('input[value="consoleAdmin"]')).toBeChecked();
  await select("consoleAdmin");
  await select("readonly");
  await expect(preview()).toHaveText(
    "mcli admin policy detach --group 't19-group-a' -- ALIAS 'consoleAdmin'\n" +
      "mcli admin policy attach --group 't19-group-a' -- ALIAS 'readonly'",
  );
  await expect(page.locator("#save")).toBeEnabled();
});

test("rejected baseline exposes retry guidance and cannot generate replacement commands", async () => {
  await requests
    .get("t19-group-a")!
    .shift()!
    .fulfill({
      status: 500,
      json: { message: "test group lookup failed" },
    });
  await select("readonly");
  await expect(preview()).toHaveText(
    "# Could not load current group policies. Reopen the dialog to retry.",
  );
  await expect(page.locator("#save")).toBeDisabled();
  await page.locator("#close").click();
  await page.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect.poll(() => requests.get("t19-group-a")?.length).toBe(1);
  await respond("t19-group-a", "consoleAdmin");
  await expect(preview()).toHaveText("# No policy changes.");
  await expect(page.locator("#save")).toBeEnabled();
});

test("ready baseline is invalidated when the selected group identity changes", async () => {
  await respond("t19-group-a", "consoleAdmin");
  await expect(page.locator('input[value="consoleAdmin"]')).toBeChecked();
  await page.getByRole("button", { name: "Group B", exact: true }).click();
  await expect.poll(() => requests.get("t19-group-b")?.length).toBe(1);
  await select("readonly");
  await expect(preview()).toHaveText("# Loading current group policies…");
  await respond("t19-group-b", "writeonly");
  await expect(page.locator('input[value="writeonly"]')).toBeChecked();
  await select("writeonly");
  await select("readonly");
  await expect(preview()).toContainText(
    "detach --group 't19-group-b' -- ALIAS 'writeonly'",
  );
  await expect(preview()).not.toContainText("consoleAdmin");
});

test("late response for the previous identity cannot replace the current baseline", async () => {
  await page.getByRole("button", { name: "Group B", exact: true }).click();
  await expect.poll(() => requests.get("t19-group-b")?.length).toBe(1);
  await respond("t19-group-b", "writeonly");
  await expect(page.locator('input[value="writeonly"]')).toBeChecked();
  await respond("t19-group-a", "consoleAdmin");
  await select("writeonly");
  await select("readonly");
  await expect(preview()).toContainText(
    "detach --group 't19-group-b' -- ALIAS 'writeonly'",
  );
  await expect(preview()).not.toContainText("consoleAdmin");
});

test("multiple groups retain additive policy semantics without a baseline", async () => {
  await page.getByRole("button", { name: "Both groups", exact: true }).click();
  await select("readonly");
  await expect(preview()).toHaveText(
    "mcli admin policy attach --group 't19-group-a' -- ALIAS 'readonly'\n" +
      "mcli admin policy attach --group 't19-group-b' -- ALIAS 'readonly'",
  );
  await respond("t19-group-a", "consoleAdmin");
  await expect(preview()).not.toContainText("detach");
  await expect(page.locator('input[value="consoleAdmin"]')).not.toBeChecked();
});
