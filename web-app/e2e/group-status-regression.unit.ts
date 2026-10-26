// Copyright (c) 2026 PGSTY
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  test,
  expect,
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";
import { fileURLToPath } from "node:url";
import { buildHarness } from "./fixtures/buildHarness";
import { browserExecutable } from "./fixtures/browserExecutable";

let browser: Browser, context: BrowserContext, page: Page, bundle: string;
let intercept: (route: Route, name: string) => Promise<boolean>;
let writes: { name: string; body: unknown }[];
const description = (name: string) => ({
  name,
  status: "enabled",
  members: [`${name}-member`],
  policy: "",
});

test.beforeAll(async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const result = await buildHarness({
    root,
    configFile: false,
    logLevel: "error",
    resolve: { tsconfigPaths: true },
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      lib: {
        entry: fileURLToPath(
          new URL("./fixtures/groupStatusHarness.tsx", import.meta.url),
        ),
        name: "GroupStatusHarness",
        formats: ["iife"],
      },
    },
  });
  const output = Array.isArray(result) ? result[0] : result;
  if (!("output" in output)) throw new Error("Expected in-memory bundle");
  bundle = output.output.find((entry) => entry.type === "chunk")!.code;
  browser = await chromium.launch({ executablePath: browserExecutable() });
});
test.afterAll(async () => {
  await browser?.close();
});
test.beforeEach(async () => {
  writes = [];
  intercept = async () => false;
  context = await browser.newContext();
  page = await context.newPage();
  await page.route("**/*", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/"))
      return route.fulfill({
        contentType: "text/html",
        body: '<base href="/"><div id="root"></div>',
      });
    const name = decodeURIComponent(path.split("/").at(-1)!);
    if (route.request().method() === "PUT")
      writes.push({ name, body: route.request().postDataJSON() });
    if (await intercept(route, name)) return;
    await route.fulfill({
      json: path.includes("/group/")
        ? {
            ...description(name),
            ...(route.request().method() === "PUT"
              ? route.request().postDataJSON()
              : {}),
          }
        : {},
    });
  });
});
test.afterEach(async ({}, info) => {
  await info.attach("group-writes", {
    body: JSON.stringify(writes),
    contentType: "application/json",
  });
  await context.close();
});
async function open() {
  await page.goto("http://groups.test/identity/groups/group-a");
  await page.addScriptTag({ content: bundle });
}

test("initial read must succeed before status or membership writes", async () => {
  let held: Route | undefined;
  intercept = async (route) => {
    if (route.request().method() === "GET") {
      held = route;
      return true;
    }
    return false;
  };
  await open();
  await expect.poll(() => Boolean(held)).toBe(true);
  await expect(page.locator("#group-status")).toBeDisabled();
  await expect(page.locator("#add-user-group")).toBeDisabled();
  await expect(page.locator("#group-status-label")).toHaveText("Unknown");
  expect(writes).toEqual([]);
  await held!.fulfill({ json: description("group-a") });
  await expect(page.locator("#group-status")).toBeEnabled();
  await page.locator("#group-status").click();
  await expect(page.locator("#group-status")).not.toBeChecked();
  expect(writes).toEqual([{ name: "group-a", body: { status: "disabled" } }]);
});

test("failed initial read remains unavailable until Retry succeeds", async () => {
  intercept = async (route) => {
    await route.fulfill({ status: 503, json: { message: "read failed" } });
    return true;
  };
  await open();
  await expect(page.locator("#retry-group")).toBeVisible();
  await expect(page.locator("#group-status")).toBeDisabled();
  await expect(page.locator("#add-user-group")).toBeDisabled();
  await expect(page.getByText("No members yet", { exact: true })).toHaveCount(
    0,
  );
  expect(writes).toEqual([]);
  intercept = async () => false;
  await page.locator("#retry-group").click();
  await expect(page.locator("#group-status")).toBeChecked();
  await expect(page.locator("#group-status")).toBeEnabled();
});

test("late A read cannot contaminate B or a new A instance", async () => {
  let held: Route | undefined;
  intercept = async (route, name) => {
    if (name === "group-a" && !held) {
      held = route;
      return true;
    }
    return false;
  };
  await open();
  await expect.poll(() => Boolean(held)).toBe(true);
  await page.getByRole("link", { name: "Group B", exact: true }).click();
  await expect(page.getByText("group-b-member", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Group A", exact: true }).click();
  await expect(page.getByText("group-a-member", { exact: true })).toBeVisible();
  await held!
    .fulfill({
      json: {
        ...description("group-a"),
        members: ["stale-member"],
        status: "disabled",
      },
    })
    .catch(() => {});
  await page.locator("#group-status").click();
  await expect(page.locator("#group-status")).not.toBeChecked();
  await expect(page.getByText("stale-member", { exact: true })).toHaveCount(0);
  expect(writes).toEqual([{ name: "group-a", body: { status: "disabled" } }]);
});

for (const status of [200, 403])
  test(`late A status response (${status}) cannot change B or show stale errors`, async () => {
    let held: Route | undefined;
    intercept = async (route) => {
      if (route.request().method() === "PUT") {
        held = route;
        return true;
      }
      return false;
    };
    await open();
    await expect(page.locator("#group-status")).toBeEnabled();
    await page.locator("#group-status").click();
    await expect.poll(() => Boolean(held)).toBe(true);
    await expect(page.locator("#group-status")).toBeDisabled();
    await expect(page.locator("#add-user-group")).toBeDisabled();
    // Even a rapid second activation cannot enqueue another write.
    await page.locator("#group-status").dispatchEvent("click");
    await page.getByRole("link", { name: "Group B", exact: true }).click();
    await expect(
      page.getByText("group-b-member", { exact: true }),
    ).toBeVisible();
    await held!.fulfill({
      status,
      json:
        status === 200
          ? { ...description("group-a"), status: "disabled" }
          : { message: "stale-A-error" },
    });
    await expect(page.locator("#group-status")).toBeChecked();
    await expect(page.locator("#group-status")).toBeEnabled();
    await expect(page.getByText("stale-A-error", { exact: false })).toHaveCount(
      0,
    );
    expect(writes).toEqual([{ name: "group-a", body: { status: "disabled" } }]);
  });

test("status failure reconciles through a fresh read before allowing retry", async () => {
  await open();
  await expect(page.locator("#group-status")).toBeEnabled();
  intercept = async (route) => {
    await route.fulfill({ status: 503, json: { message: "unavailable" } });
    return true;
  };
  await page.locator("#group-status").click();
  await expect(page.locator("#retry-group")).toBeVisible();
  await expect(page.locator("#group-status")).toBeDisabled();
  intercept = async () => false;
  await page.locator("#retry-group").click();
  await expect(page.locator("#group-status")).toBeEnabled();
  await page.locator("#group-status").click();
  await expect(page.locator("#group-status")).not.toBeChecked();
  expect(writes).toHaveLength(2);
});
