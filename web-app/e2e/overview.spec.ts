// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { Page, Response, TestInfo } from "@playwright/test";
import type { AdminInfoResponse } from "../src/api/consoleApi";
import { test, expect } from "./fixtures/guiTest";
import { guiEnvironment } from "./fixtures/guiEnvironment";

const adminInfoURL = (url: URL) =>
  url.pathname === "/api/v1/admin/info" &&
  url.searchParams.get("defaultOnly") === "true";
const adminInfoResponse = (response: Response) =>
  adminInfoURL(new URL(response.url())) &&
  response.request().method() === "GET";
const statistics = (page: Page) =>
  page.getByLabel("Deployment statistics", { exact: true });
const card = (page: Page, label: string) =>
  statistics(page)
    .locator(":scope > div")
    .filter({ has: page.getByText(label, { exact: true }) });
const value = (page: Page, label: string) =>
  card(page, label).locator(":scope > div").nth(1);
const formatted = (count: number) => new Intl.NumberFormat("en").format(count);

async function receiveInfo(
  page: Page,
  action: () => Promise<unknown>,
  testInfo: TestInfo,
  name: string,
) {
  const received = page.waitForResponse(adminInfoResponse);
  await action();
  const response = await received;
  await expect(statistics(page)).toHaveAttribute("aria-busy", "false");
  const body = await response.json();
  await testInfo.attach(name, {
    body: JSON.stringify({
      url: response.url(),
      status: response.status(),
      body,
    }),
    contentType: "application/json",
  });
  return { response, info: body as AdminInfoResponse };
}

async function assertActualCards(page: Page, info: AdminInfoResponse) {
  // Assert measured drives and completed scanner data in the response delivered
  // to this page. A later API snapshot can describe different live values.
  expect(Array.isArray(info.servers)).toBe(true);
  const servers = info.servers!;
  expect(servers.length).toBeGreaterThan(0);
  for (const server of servers) expect(Array.isArray(server.drives)).toBe(true);
  const drives = servers.flatMap((server) => server.drives!);
  expect(drives.length).toBeGreaterThan(0);
  for (const drive of drives) {
    expect(Number.isFinite(drive.totalSpace)).toBe(true);
    expect(drive.totalSpace).toBeGreaterThan(0);
    for (const measurement of [drive.usedSpace, drive.availableSpace]) {
      expect(Number.isFinite(measurement)).toBe(true);
      expect(measurement).toBeGreaterThanOrEqual(0);
    }
  }
  const total = drives.reduce((sum, drive) => sum + drive.totalSpace!, 0);
  const used = drives.reduce((sum, drive) => sum + drive.usedSpace!, 0);
  const available = drives.reduce(
    (sum, drive) => sum + drive.availableSpace!,
    0,
  );
  await expect(page.getByTestId("overview-total")).toHaveAttribute(
    "data-bytes",
    String(total),
  );
  await expect(page.getByTestId("overview-used")).toHaveAttribute(
    "data-bytes",
    String(used),
  );
  await expect(page.getByTestId("overview-available")).toHaveAttribute(
    "data-bytes",
    String(available),
  );
  const capacityBar = card(page, "Capacity").getByRole("progressbar", {
    name: "Capacity",
    exact: true,
  });
  expect(Number(await capacityBar.getAttribute("aria-valuenow"))).toBeCloseTo(
    Math.min(100, (used / total) * 100),
    5,
  );

  const onlineServers = servers.filter(
    (server) => server.state === "online",
  ).length;
  const onlineDrives = drives.filter((drive) => drive.state === "ok").length;
  await expect(value(page, "Cluster health")).toHaveText(
    new RegExp(
      `^${formatted(onlineServers)}/${formatted(servers.length)}\\s*servers online$`,
    ),
  );
  await expect(
    card(page, "Cluster health").getByText(
      `${formatted(onlineDrives)}/${formatted(drives.length)} drives online`,
      { exact: true },
    ),
  ).toBeVisible();

  expect(info.usageUpdatedAt).toBeTruthy();
  expect(Number.isFinite(Date.parse(info.usageUpdatedAt!))).toBe(true);
  await expect(value(page, "Data")).toHaveText(
    new RegExp(`^${formatted(info.objects ?? 0)}\\s*objects$`),
  );
  await expect(value(page, "Buckets")).toHaveText(formatted(info.buckets ?? 0));
  const time = card(page, "Data").locator("time");
  await expect(time).toHaveCount(1);
  expect(Date.parse((await time.getAttribute("datetime"))!)).toBe(
    Date.parse(info.usageUpdatedAt!),
  );

  // Validate the displayed unit and rounding independently of the app model.
  const bytes = info.usage ?? 0;
  const unitIndex = bytes === 0 ? 0 : Math.floor(Math.log2(bytes) / 10);
  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"];
  const expectedBytes =
    bytes === 0
      ? "0 B"
      : `${(bytes / 1024 ** unitIndex).toFixed(1)} ${units[unitIndex]}`;
  await expect(
    card(page, "Data").getByText(expectedBytes, { exact: true }),
  ).toBeVisible();
  await expect(statistics(page).getByText(/EC usable/i)).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("language", "en"));
});

test("real Overview cards and keyboard-expanded drives match the exact admin info responses", async ({
  page,
}, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const { response, info } = await receiveInfo(
    page,
    () => page.goto("/overview"),
    testInfo,
    "real-initial-admin-info",
  );
  expect(response.status()).toBe(200);
  await expect(statistics(page).locator(":scope > div")).toHaveCount(4);
  await assertActualCards(page, info);
  const table = page.getByRole("table", { name: "Servers", exact: true });
  await expect(table.locator("tbody > tr.server-row")).toHaveCount(
    info.servers!.length,
  );
  const server = info.servers!.find((item) => item.drives!.length > 0)!;
  expect(server.endpoint).toBeTruthy();
  const toggle = table.getByRole("button", {
    name: `Show drives for ${server.endpoint}`,
    exact: true,
  });
  await toggle.focus();
  await page.keyboard.press("Enter");
  const expanded = table.getByRole("button", {
    name: `Hide drives for ${server.endpoint}`,
    exact: true,
  });
  await expect(expanded).toHaveAttribute("aria-expanded", "true");
  await expect(expanded).toBeFocused();
  const controls = await expanded.getAttribute("aria-controls");
  expect(controls).toBeTruthy();
  await expect(page.locator(`[id=${JSON.stringify(controls)}]`)).toBeVisible();
  const driveList = table.getByRole("list", {
    name: `Drives on ${server.endpoint}`,
    exact: true,
  });
  await expect(driveList.getByRole("listitem")).toHaveCount(
    server.drives!.length,
  );
  for (const [index, drive] of server.drives!.entries()) {
    const path = drive.drivePath || drive.endpoint;
    expect(path).toBeTruthy();
    const row = driveList.getByRole("listitem").nth(index);
    await expect(row.getByText(path!, { exact: true })).toBeVisible();
    await expect(
      row.getByText(drive.state === "ok" ? "Online" : "Offline", {
        exact: true,
      }),
    ).toBeVisible();
    const progress = row.getByRole("progressbar", {
      name: `Drive usage: ${path}`,
      exact: true,
    });
    expect(Number(await progress.getAttribute("aria-valuenow"))).toBeCloseTo(
      Math.min(100, (drive.usedSpace! / drive.totalSpace!) * 100),
      5,
    );
  }
  await expanded.press("Space");
  await expect(driveList).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  const refreshed = await receiveInfo(
    page,
    () => page.locator("#refresh-overview").click(),
    testInfo,
    "real-refreshed-admin-info",
  );
  expect(refreshed.response.status()).toBe(200);
  await assertActualCards(page, refreshed.info);
  expect(pageErrors).toEqual([]);
});

test("controlled Overview responses distinguish computed zero from unknown and incomplete capacity", async ({
  page,
}, testInfo) => {
  const timestamp = "2026-10-24T00:00:00Z";
  let data: AdminInfoResponse = {
    usageUpdatedAt: timestamp,
    servers: [
      {
        state: "online",
        endpoint: "fixture.example:9000",
        drives: [
          {
            state: "ok",
            drivePath: "/fixture/drive",
            totalSpace: 1024,
            usedSpace: 0,
            availableSpace: 1024,
          },
        ],
      },
    ],
  };
  await page.route(adminInfoURL, (route) =>
    route.fulfill({ status: 200, json: data }),
  );
  await receiveInfo(
    page,
    () => page.goto("/overview"),
    testInfo,
    "intercepted-computed-zero-admin-info",
  );
  await expect(value(page, "Data")).toHaveText(/^0\s*objects$/);
  await expect(value(page, "Buckets")).toHaveText("0");
  await expect(
    card(page, "Data").getByText("0 B", { exact: true }),
  ).toBeVisible();
  expect(
    Date.parse(
      (await card(page, "Data").locator("time").getAttribute("datetime"))!,
    ),
  ).toBe(Date.parse(timestamp));
  await expect(page.getByTestId("overview-used")).toHaveAttribute(
    "data-bytes",
    "0",
  );
  await expect(page.getByTestId("overview-total")).toHaveAttribute(
    "data-bytes",
    "1024",
  );
  await expect(page.getByTestId("overview-available")).toHaveAttribute(
    "data-bytes",
    "1024",
  );

  data = {
    servers: [
      {
        state: "online",
        endpoint: "fixture.example:9000",
        drives: [
          { state: "ok", drivePath: "/fixture/drive", totalSpace: 1024 },
        ],
      },
    ],
  };
  await receiveInfo(
    page,
    () => page.locator("#refresh-overview").click(),
    testInfo,
    "intercepted-unknown-partial-admin-info",
  );
  await expect(value(page, "Data")).toHaveText(/^—\s*objects$/);
  await expect(value(page, "Buckets")).toHaveText("—");
  await expect(
    card(page, "Data").getByText("Calculating…", { exact: true }),
  ).toBeVisible();
  await expect(card(page, "Data").locator("time")).toHaveCount(0);
  await expect(page.getByTestId("overview-used")).toHaveText("—");
  expect(
    await page.getByTestId("overview-used").getAttribute("data-bytes"),
  ).toBeNull();
  expect(
    await page.getByTestId("overview-available").getAttribute("data-bytes"),
  ).toBeNull();
  await expect(page.getByTestId("overview-total")).toHaveAttribute(
    "data-bytes",
    "1024",
  );
  await expect(card(page, "Capacity").getByRole("progressbar")).toHaveCount(0);
  await expect(
    page.getByText(
      "Capacity is incomplete. Only reported drive measurements are shown.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("controlled Overview initial and refresh failures recover while preserving the last received values", async ({
  page,
}, testInfo) => {
  let status = 503;
  let data: AdminInfoResponse = {
    usageUpdatedAt: "2026-10-24T00:00:00Z",
    objects: 7,
    usage: 4096,
    buckets: 2,
    servers: [
      {
        state: "online",
        endpoint: "fixture.example:9000",
        drives: [
          {
            state: "ok",
            drivePath: "/fixture/drive",
            totalSpace: 16384,
            usedSpace: 4096,
            availableSpace: 12288,
          },
        ],
      },
    ],
  };
  await page.route(adminInfoURL, (route) =>
    route.fulfill({
      status,
      json:
        status === 200
          ? data
          : { message: "T23 controlled admin info failure" },
    }),
  );
  const initial = await receiveInfo(
    page,
    () => page.goto("/overview"),
    testInfo,
    "intercepted-initial-503-admin-info",
  );
  expect(initial.response.status()).toBe(503);
  await expect(page.getByRole("alert")).toHaveText(
    "Could not load deployment information. Try refreshing.",
  );
  await expect(value(page, "Buckets")).toHaveText("—");
  await expect(page.locator("#refresh-overview")).toBeEnabled();

  status = 200;
  await receiveInfo(
    page,
    () => page.locator("#refresh-overview").click(),
    testInfo,
    "intercepted-recovered-admin-info",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(value(page, "Data")).toHaveText(/^7\s*objects$/);
  await expect(value(page, "Buckets")).toHaveText("2");
  await expect(page.getByTestId("overview-used")).toHaveAttribute(
    "data-bytes",
    "4096",
  );
  const previousTime = await card(page, "Data")
    .locator("time")
    .getAttribute("datetime");
  status = 503;
  const failed = await receiveInfo(
    page,
    () => page.locator("#refresh-overview").click(),
    testInfo,
    "intercepted-refresh-503-admin-info",
  );
  expect(failed.response.status()).toBe(503);
  await expect(page.getByRole("alert")).toHaveText(
    "Refresh failed. The last received data is still shown.",
  );
  await expect(value(page, "Data")).toHaveText(/^7\s*objects$/);
  await expect(value(page, "Buckets")).toHaveText("2");
  await expect(card(page, "Data").locator("time")).toHaveAttribute(
    "datetime",
    previousTime!,
  );
  await expect(page.getByTestId("overview-used")).toHaveAttribute(
    "data-bytes",
    "4096",
  );

  status = 200;
  data = {
    ...data,
    objects: 9,
    buckets: 3,
    usageUpdatedAt: "2026-10-24T00:01:00Z",
  };
  await receiveInfo(
    page,
    () => page.locator("#refresh-overview").click(),
    testInfo,
    "intercepted-second-recovery-admin-info",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(value(page, "Data")).toHaveText(/^9\s*objects$/);
  await expect(value(page, "Buckets")).toHaveText("3");
  expect(
    Date.parse(
      (await card(page, "Data").locator("time").getAttribute("datetime"))!,
    ),
  ).toBe(Date.parse(data.usageUpdatedAt!));
});

for (const account of ["alice", "bob"] as const) {
  test(`real ${account} is denied Overview before any admin info request`, async ({
    browser,
  }) => {
    const env = guiEnvironment();
    const context = await browser.newContext({
      baseURL: env.url,
      storageState: env.authByAccount[account],
      viewport: { width: 1440, height: 1000 },
    });
    try {
      await context.addInitScript(() => localStorage.setItem("language", "en"));
      const page = await context.newPage();
      const requests: string[] = [];
      page.on("request", (request) => {
        if (new URL(request.url()).pathname === "/api/v1/admin/info")
          requests.push(request.url());
      });
      await page.goto("/overview");
      await expect(
        page.getByRole("heading", {
          name: "You do not have permission to view this page",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("list", { name: "Required IAM actions", exact: true }),
      ).toContainText("admin:ServerInfo");
      await expect(statistics(page)).toHaveCount(0);
      expect(requests).toEqual([]);
      await page.locator("#permission-go-to-buckets").click();
      await expect(page).toHaveURL(`${env.url}/buckets`);
      expect(requests).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
