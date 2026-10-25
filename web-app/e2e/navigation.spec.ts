// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { Browser, Page, Response } from "@playwright/test";
import type {
  ListBucketsResponse,
  SessionResponse,
} from "../src/api/consoleApi";
import { test, expect } from "./fixtures/guiTest";
import { guiEnvironment, type GuiAccount } from "./fixtures/guiEnvironment";
import { loginViaUI } from "./fixtures/guiAuthenticate";
import { guiDemo } from "./fixtures/guiResources";

const topIds = [
  "overview",
  "buckets",
  "nav-accesskeys",
  "identity",
  "monitoring",
  "settings",
  "tools",
];
const menu = (page: Page) =>
  page.getByRole("navigation", { name: "Menu", exact: true });
const bucketList = (url: URL) => url.pathname === "/api/v1/buckets";
const isBucketListResponse = (response: Response) =>
  bucketList(new URL(response.url())) && response.request().method() === "GET";
const recentButtons = (page: Page) =>
  menu(page).locator('button[id^="sidebarManageBucket-"]');
const recentNames = (page: Page) =>
  recentButtons(page).evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute("aria-label")),
  );

async function preparePage(page: Page) {
  await page.addInitScript(() => localStorage.setItem("language", "en"));
}

async function accountContext(browser: Browser, account?: GuiAccount) {
  const env = guiEnvironment();
  const context = await browser.newContext({
    baseURL: env.url,
    viewport: { width: 1440, height: 1000 },
    storageState: account
      ? env.authByAccount[account]
      : { cookies: [], origins: [] },
  });
  await context.addInitScript(() => localStorage.setItem("language", "en"));
  return context;
}

async function expandedMenu(page: Page) {
  await expect(menu(page)).toBeVisible();
  const expand = menu(page).getByRole("button", {
    name: "Expand menu",
    exact: true,
  });
  if (await expand.count()) await expand.click();
  await expect(
    menu(page).getByRole("button", { name: "Collapse menu", exact: true }),
  ).toBeVisible();
  return menu(page);
}

test.beforeEach(async ({ page }) => preparePage(page));

test("real bucket table values and filtering match the response delivered to the page", async ({
  page,
}, info) => {
  const received = page.waitForResponse(isBucketListResponse);
  await page.goto("/buckets?sort=name&dir=asc&keep=t23");
  const response = await received;
  expect(response.status()).toBe(200);
  const data: ListBucketsResponse = await response.json();
  await info.attach("real-bucket-list", {
    body: JSON.stringify(data),
    contentType: "application/json",
  });
  expect(data.buckets?.some((bucket) => bucket.name === guiDemo.bucket)).toBe(
    true,
  );
  await expect(
    page.getByRole("table", { name: "Buckets", exact: true }),
  ).toBeVisible();
  const displayed = [...data.buckets!].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  await expect(page.locator(".bucketRow").first()).toHaveAttribute(
    "aria-label",
    displayed[0].name,
  );
  for (const bucket of displayed.slice(0, 3)) {
    await page.locator("#bucket-search").fill(bucket.name);
    const row = page.getByRole("row", { name: bucket.name, exact: true });
    await expect(row).toBeVisible();
    const cells = row.locator(".bucketCell");
    const known =
      !!data.usageUpdatedAt && Number.isFinite(Date.parse(data.usageUpdatedAt));
    await expect(cells.nth(1)).toHaveText(
      known ? new Intl.NumberFormat("en").format(bucket.objects ?? 0) : "—",
    );
    const bytes = bucket.size ?? 0;
    const unit = bytes === 0 ? 0 : Math.floor(Math.log2(bytes) / 10);
    const size =
      bytes === 0
        ? "0 B"
        : `${(bytes / 1024 ** unit).toFixed(1)} ${["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"][unit]}`;
    await expect(cells.nth(2)).toHaveText(known ? size : "—");
    await expect(cells.nth(3)).toHaveText(
      bucket.details?.versioningSuspended
        ? "Suspended"
        : bucket.details
          ? bucket.details.versioning
            ? "Enabled"
            : "Disabled"
          : "Unknown",
    );
    await expect(cells.nth(7)).toHaveText(
      bucket.rw_access?.read
        ? bucket.rw_access.write
          ? "Read & write"
          : "Read only"
        : bucket.rw_access?.write
          ? "Write only"
          : "Unknown",
    );
    if (bucket.creation_date)
      await expect(cells.nth(8).locator("time")).toHaveAttribute(
        "datetime",
        bucket.creation_date,
      );
    expect(new URL(page.url()).searchParams.get("keep")).toBe("t23");
  }
});

test("real admin sidebar has the ordered sections and their original destinations", async ({
  page,
}) => {
  const sessionResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/v1/session" &&
      response.status() === 200,
  );
  await page.goto("/overview");
  const session: SessionResponse = await (await sessionResponse).json();
  expect(session.features ?? []).not.toContain("kms");
  const sidebar = await expandedMenu(page);
  await expect(
    sidebar.locator(topIds.map((id) => `#${id}`).join(",")),
  ).toHaveCount(7);
  expect(
    await sidebar
      .locator(topIds.map((id) => `#${id}`).join(","))
      .evaluateAll((items) => items.map((item) => item.id)),
  ).toEqual(topIds);
  for (const [section, labels] of [
    ["identity", ["Users", "Groups", "Policies", "OpenID", "LDAP"]],
    ["monitoring", ["Metrics", "Logs", "Audit", "Trace", "Watch"]],
    ["settings", ["Configuration", "Events", "Tiering", "Site Replication"]],
    ["tools", ["Health", "Performance", "Profile", "Inspect"]],
  ] as const) {
    await sidebar.locator(`#${section}`).click();
    await expect(sidebar.locator(`#${section}`)).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    const children = sidebar
      .locator(`#${section}-children`)
      .getByRole("button");
    await expect(children).toHaveCount(labels.length);
    for (const [index, label] of labels.entries())
      await expect(children.nth(index)).toHaveAccessibleName(label);
  }
  for (const label of ["Object Browser", "Create bucket", "Encryption"])
    await expect(
      sidebar.getByRole("button", { name: label, exact: true }),
    ).toHaveCount(0);
});

test("real Alice sidebar exposes Buckets, Access Keys and permitted Watch without admin pages", async ({
  browser,
}) => {
  const context = await accountContext(browser, "alice");
  try {
    const page = await context.newPage();
    await page.goto("/buckets");
    const sidebar = await expandedMenu(page);
    await expect(
      sidebar.locator(topIds.map((id) => `#${id}`).join(",")),
    ).toHaveCount(3);
    expect(
      await sidebar
        .locator(topIds.map((id) => `#${id}`).join(","))
        .evaluateAll((items) => items.map((item) => item.id)),
    ).toEqual(["buckets", "nav-accesskeys", "monitoring"]);
    // readwrite includes S3 notification permissions, so Watch is valid while
    // the administrative monitoring pages remain absent for this real account.
    await sidebar.locator("#monitoring").click();
    const monitoring = sidebar
      .locator("#monitoring-children")
      .getByRole("button");
    await expect(monitoring).toHaveCount(1);
    await expect(monitoring).toHaveAccessibleName("Watch");
    await expect(sidebar.locator("#buckets")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await sidebar.locator("#nav-accesskeys").click();
    await expect(page).toHaveURL(`${guiEnvironment().url}/access-keys`);
    await expect(sidebar.locator("#nav-accesskeys")).toHaveAttribute(
      "aria-current",
      "page",
    );
  } finally {
    await context.close();
  }
});

for (const account of ["admin", "alice", "bob"] as const) {
  const landing = account === "admin" ? "/overview" : "/buckets";
  test(`real ${account} login and root navigation use the permitted landing page`, async ({
    browser,
  }) => {
    const context = await accountContext(browser);
    try {
      const page = await context.newPage();
      await page.goto("/");
      await expect(
        page.getByRole("button", { name: "Login", exact: true }),
      ).toBeVisible();
      await loginViaUI(page, account);
      await expect(page).toHaveURL(`${guiEnvironment().url}${landing}`);
      await expect(menu(page)).toBeVisible();
      await page.goto("/");
      await expect(page).toHaveURL(`${guiEnvironment().url}${landing}`);
      expect(
        await page.evaluate(() => localStorage.getItem("redirect-path")),
      ).toBeNull();
    } finally {
      await context.close();
    }
  });

  test(`real ${account} login restores an object deep link once, including query and hash`, async ({
    browser,
  }) => {
    const context = await accountContext(browser);
    try {
      const page = await context.newPage();
      const destination = `${guiDemo.readme.detailPath}?from=t23&literal=%252F#preview`;
      await page.goto(destination);
      await expect(page).toHaveURL(/\/login$/);
      expect(
        await page.evaluate(() => localStorage.getItem("redirect-path")),
      ).toBe(destination);
      await loginViaUI(page, account);
      await expect(page).toHaveURL(`${guiEnvironment().url}${destination}`);
      const checkDestination = async () => {
        if (account === "bob") {
          // Bob's unchanged identity has GetObject but no ListBucket grant.
          // Remembering a URL must not manufacture access to its object UI.
          await expect(
            page.getByText(
              /^You require additional permissions in order to view Objects in this bucket\./,
            ),
          ).toBeVisible();
          await expect(
            page.getByRole("button", { name: "Preview", exact: true }),
          ).toHaveCount(0);
        } else {
          await expect(
            page.getByRole("button", { name: "Preview", exact: true }),
          ).toBeEnabled();
        }
      };
      await checkDestination();
      expect(
        await page.evaluate(() => localStorage.getItem("redirect-path")),
      ).toBeNull();
      await page.reload();
      await expect(page).toHaveURL(`${guiEnvironment().url}${destination}`);
      await checkDestination();
      await page.goto("/");
      await expect(page).toHaveURL(`${guiEnvironment().url}${landing}`);
    } finally {
      await context.close();
    }
  });
}

test("legacy browser and bucket administration URLs reach the current real pages", async ({
  page,
}) => {
  await page.goto("/browser");
  await expect(page).toHaveURL(`${guiEnvironment().url}/buckets`);
  await expect(menu(page).locator("#buckets")).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.goto(`/buckets/${guiDemo.bucket}`);
  await expect(page).toHaveURL(
    `${guiEnvironment().url}/buckets/${guiDemo.bucket}/admin/summary`,
  );
  await expect(
    page.getByRole("tab", { name: "Summary", exact: true }),
  ).toBeVisible();
  await page.goto(guiDemo.readme.detailPath);
  await expect(
    page.getByRole("button", { name: "Preview", exact: true }),
  ).toBeEnabled();
  await expect(page).toHaveURL(
    `${guiEnvironment().url}${guiDemo.readme.detailPath}`,
  );
});

test("real unknown and unavailable encryption routes provide working recovery actions", async ({
  page,
}) => {
  await page.goto("/buckets");
  await expect(menu(page)).toBeVisible();
  await page.goto("/t23-page-does-not-exist");
  await expect(
    page.getByRole("heading", {
      name: "Page not found",
      level: 1,
      exact: true,
    }),
  ).toBeVisible();
  await page.locator("#not-found-go-back").click();
  await expect(page).toHaveURL(`${guiEnvironment().url}/buckets`);
  await page.goto("/t23-page-does-not-exist");
  await page.locator("#not-found-go-to-buckets").click();
  await expect(page).toHaveURL(`${guiEnvironment().url}/buckets`);
  const sessionResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/v1/session" &&
      response.status() === 200,
  );
  await page.goto("/kms/status");
  const session: SessionResponse = await (await sessionResponse).json();
  expect(session.features ?? []).not.toContain("kms");
  await expect(
    page.getByRole("heading", {
      name: "Encryption is not configured",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Read the documentation", exact: true }),
  ).toHaveAttribute("href", /^https:\/\/silo\.pgsty\.com\//);
  await page.locator("#feature-go-to-buckets").click();
  await expect(page).toHaveURL(`${guiEnvironment().url}/buckets`);
});

test("real Bob cannot mount the users page and can return to buckets", async ({
  browser,
}) => {
  const context = await accountContext(browser, "bob");
  try {
    const page = await context.newPage();
    const userRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/v1/users")
        userRequests.push(request.url());
    });
    await page.goto("/identity/users");
    await expect(
      page.getByRole("heading", {
        name: "You do not have permission to view this page",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Required IAM actions", exact: true }),
    ).toContainText("admin:ListUsers");
    expect(userRequests).toEqual([]);
    await page.locator("#permission-go-to-buckets").click();
    await expect(page).toHaveURL(`${guiEnvironment().url}/buckets`);
  } finally {
    await context.close();
  }
});

test("real bucket visits persist five recents, isolate accounts, and prune only on an authoritative list", async ({
  page,
  owned,
}, testInfo) => {
  const buckets = await owned.buckets(6);
  // AccountInfo uses a short-lived server-side bucket cache. Establish the
  // fixture through the same real list API before testing visit ordering.
  const readiness: { status: number; missing: string[] }[] = [];
  await expect
    .poll(
      async () => {
        const response = await page.request.get("/api/v1/buckets");
        expect(response.status()).toBe(200);
        const data: ListBucketsResponse = await response.json();
        expect(Array.isArray(data.buckets)).toBe(true);
        const names = new Set(data.buckets!.map((bucket) => bucket.name));
        const missing = buckets.filter((bucket) => !names.has(bucket));
        readiness.push({ status: response.status(), missing });
        return missing;
      },
      { timeout: 5000, intervals: [100, 250, 500] },
    )
    .toEqual([]);
  await testInfo.attach("real-created-bucket-list-readiness", {
    body: JSON.stringify({ buckets, readiness }),
    contentType: "application/json",
  });
  let listing: ListBucketsResponse | undefined;
  for (const bucket of buckets) {
    const listed = page.waitForResponse(
      (response) => isBucketListResponse(response) && response.status() === 200,
    );
    const objects = page
      .waitForEvent("websocket", {
        predicate: (socket) =>
          new URL(socket.url()).pathname === "/ws/objectManager",
      })
      .then((socket) =>
        socket.waitForEvent("framereceived", {
          predicate: ({ payload }) => {
            const frame = JSON.parse(payload.toString());
            return frame.request_end === true && !frame.error;
          },
        }),
      );
    await page.goto(`/browser/${encodeURIComponent(bucket)}`);
    listing = await (await listed).json();
    await objects;
    await expect(
      page.getByText(
        "This location is empty, please try uploading a new file",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    await expandedMenu(page);
    await expect(recentButtons(page).first()).toHaveAccessibleName(bucket);
  }
  let expected = buckets.slice(1).reverse();
  await expect.poll(() => recentNames(page)).toEqual(expected);
  const revisit = buckets[2];
  const relisted = page.waitForResponse(
    (response) => isBucketListResponse(response) && response.status() === 200,
  );
  await menu(page).getByRole("button", { name: revisit, exact: true }).click();
  await relisted;
  expected = [revisit, ...expected.filter((name) => name !== revisit)];
  await expect.poll(() => recentNames(page)).toEqual(expected);
  const reloaded = page.waitForResponse(
    (response) => isBucketListResponse(response) && response.status() === 200,
  );
  await page.reload();
  await reloaded;
  await expect.poll(() => recentNames(page)).toEqual(expected);

  await test.step("intercepted list 503 retains recents; filtered authoritative 200 prunes one", async () => {
    expect(Array.isArray(listing?.buckets)).toBe(true);
    let unavailable = true;
    const removed = expected[expected.length - 1];
    const pruned: ListBucketsResponse = {
      ...listing,
      buckets: listing!.buckets!.filter((bucket) => bucket.name !== removed),
    };
    await page.route(bucketList, (route) =>
      unavailable
        ? route.fulfill({
            status: 503,
            json: { message: "T23 controlled bucket listing failure" },
          })
        : route.fulfill({ status: 200, json: pruned }),
    );
    const failed = page.waitForResponse(
      (response) => isBucketListResponse(response) && response.status() === 503,
    );
    await page.goto("/buckets");
    await failed;
    await expect(
      page.getByRole("heading", {
        name: "The bucket list could not be loaded.",
        exact: true,
      }),
    ).toBeVisible();
    await expect.poll(() => recentNames(page)).toEqual(expected);
    unavailable = false;
    const succeeded = page.waitForResponse(
      (response) => isBucketListResponse(response) && response.status() === 200,
    );
    await page.reload();
    await succeeded;
    expected = expected.filter((name) => name !== removed);
    await expect.poll(() => recentNames(page)).toEqual(expected);
    await testInfo.attach("controlled-recent-bucket-list", {
      body: JSON.stringify({
        failedStatus: 503,
        successfulStatus: 200,
        removed,
        remaining: expected,
      }),
      contentType: "application/json",
    });
    await page.unroute(bucketList);
  });

  const session = await page.request.get(
    `${guiEnvironment().url}/api/v1/session`,
  );
  expect(session.status()).toBe(200);
  const { accountAccessKey } = (await session.json()) as SessionResponse;
  expect(accountAccessKey).toBeTruthy();
  const adminKey = `silo.recentBuckets.${accountAccessKey}`;
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || "[]"),
      adminKey,
    ),
  ).toEqual(expected);
  await menu(page).locator("#sign-out").click();
  await expect(
    page.getByRole("button", { name: "Login", exact: true }),
  ).toBeVisible();
  await loginViaUI(page, "alice");
  await expect(page).toHaveURL(`${guiEnvironment().url}/buckets`);
  await expect(recentButtons(page)).toHaveCount(0);
  await page.goto(`/browser/${guiDemo.bucket}`);
  await expect(
    page.getByRole("grid", { name: "Objects", exact: true }),
  ).toBeVisible();
  await expect.poll(() => recentNames(page)).toEqual([guiDemo.bucket]);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || "[]"),
      adminKey,
    ),
  ).toEqual(expected);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("silo.recentBuckets.alice") || "[]"),
    ),
  ).toEqual([guiDemo.bucket]);
});
