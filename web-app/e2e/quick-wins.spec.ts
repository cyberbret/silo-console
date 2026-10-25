// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import { SERVER_ENDPOINT, adminAccessKey, adminSecretKey } from "./consts";
import { browserExecutable } from "./fixtures/browserExecutable";

test.use({
  viewport: { width: 1440, height: 1000 },
  launchOptions: { executablePath: browserExecutable() },
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("language", "en");
    localStorage.setItem("dark-mode", "off");
  });
  const response = await page.request.post(`${SERVER_ENDPOINT}/api/v1/login`, {
    data: {
      accessKey: process.env.CONSOLE_TEST_ACCESS_KEY || adminAccessKey,
      secretKey: process.env.CONSOLE_TEST_SECRET_KEY || adminSecretKey,
    },
  });
  expect(response.ok()).toBe(true);
});

test("users load through skeleton, empty recovery, populated chips and filtered selection", async ({
  page,
}) => {
  let complete: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    complete = resolve;
  });
  let users: object[] = [];
  await page.route("**/api/v1/users", async (route) => {
    await pending;
    await route.fulfill({ json: { users, total_users: users.length } });
  });
  await page.goto(`${SERVER_ENDPOINT}/identity/users`);
  const skeleton = page.locator('[role="status"][aria-busy="true"]');
  await expect(skeleton).toContainText("Loading…");
  await expect(
    page.getByRole("region", { name: "No users yet", exact: true }),
  ).toHaveCount(0);
  complete!();
  await expect(
    page.getByRole("region", { name: "No users yet", exact: true }),
  ).toBeVisible();
  await expect(skeleton).toHaveCount(0);
  await expect(page.locator("#empty-create-user")).toBeEnabled();
  users = [
    {
      accessKey: "t11-alice",
      status: "enabled",
      policy: [
        " readwrite ",
        "",
        "readonly",
        "diagnostics",
        "consoleAdmin",
        "demo-reader",
      ],
      memberOf: ["analysts"],
    },
    {
      accessKey: "t11-bob",
      status: "disabled",
      policy: ["", " "],
      memberOf: [],
    },
  ];
  await page.reload();
  const alice = page.getByRole("row", { name: "t11-alice", exact: true });
  const bob = page.getByRole("row", { name: "t11-bob", exact: true });
  await expect(alice).toContainText("Enabled");
  await expect(alice).toContainText("analysts");
  await expect(alice).toContainText("+2");
  await alice.locator("span[tabindex]").focus();
  await expect(page.getByRole("tooltip")).toContainText(
    "consoleAdmin, demo-reader",
  );
  await expect(bob).toContainText("Disabled");
  await expect(bob).toContainText("—");
  await alice.getByRole("checkbox").check();
  await page.locator("#user-status-filter-select").click();
  await page.getByRole("option", { name: "Disabled", exact: true }).click();
  await expect(alice).toHaveCount(0);
  await bob.getByRole("checkbox").check();
  await page.locator("#selectAll").uncheck();
  await page.locator("#user-status-filter-select").click();
  await page.getByRole("option", { name: "All", exact: true }).click();
  await expect(alice.getByRole("checkbox")).toBeChecked();
  await expect(bob.getByRole("checkbox")).not.toBeChecked();
  await page.getByPlaceholder("Search Users").fill("no-such-user");
  await expect(
    page.getByRole("region", { name: "No matching results", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#empty-create-user")).toHaveCount(0);
  await page.locator("#clear-list-filters").click();
  await expect(alice.getByRole("checkbox")).toBeChecked();
});

test("an empty users list never advertises creation without all four required grants", async ({
  page,
}) => {
  await page.route("**/api/v1/session", async (route) => {
    const response = await route.fetch();
    const session = await response.json();
    session.permissions = {
      "console-ui": [
        "admin:ListUsers",
        "admin:GetUser",
        "admin:CreateUser",
        "admin:ListUserPolicies",
        "admin:ListGroups",
      ],
    };
    await route.fulfill({ response, json: session });
  });
  await page.route("**/api/v1/users", (route) =>
    route.fulfill({ json: { users: [], total_users: 0 } }),
  );
  await page.goto(`${SERVER_ENDPOINT}/identity/users`);
  await expect(
    page.getByRole("region", { name: "No users yet", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#empty-create-user")).toHaveCount(0);
  await expect(page.locator("#create-user")).toBeDisabled();
});

test("bucket name validation is silent before touch, clears on reset and blocks invalid submit", async ({
  page,
}) => {
  let writes = 0;
  await page.route("**/api/v1/buckets", async (route) => {
    if (route.request().method() === "POST") {
      writes++;
      await route.fulfill({
        status: 500,
        json: { message: "Unexpected test write" },
      });
    } else await route.continue();
  });
  await page.goto(`${SERVER_ENDPOINT}/buckets/add-bucket`);
  const name = page.locator("#bucket-name");
  const create = page.locator("#create-bucket");
  await expect(name).toBeVisible();
  await expect(
    page.getByText("Invalid bucket name", { exact: true }),
  ).toHaveCount(0);
  await expect(create).toBeDisabled();
  await name.focus();
  await expect(
    page.getByText("Invalid bucket name", { exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(
    page.getByText("Invalid bucket name", { exact: true }),
  ).toBeVisible();
  await page.locator("#clear").click();
  await expect(
    page.getByText("Invalid bucket name", { exact: true }),
  ).toHaveCount(0);
  await name.fill("A");
  await expect(
    page.getByText("Invalid bucket name", { exact: true }),
  ).toBeVisible();
  await expect(create).toBeDisabled();
  await name.evaluate((input) => input.closest("form")!.requestSubmit());
  expect(writes).toBe(0);
  await name.fill("t11-valid-name");
  await expect(create).toBeEnabled();
  await expect(
    page.getByText("Invalid bucket name", { exact: true }),
  ).toHaveCount(0);
  await page.locator("#clear").click();
  await expect(create).toBeDisabled();
  await expect(
    page.getByText("Invalid bucket name", { exact: true }),
  ).toHaveCount(0);
});

test("summary preserves omitted zero and unknown usage, binary quota units, and omitted false status", async ({
  page,
}) => {
  const usageUpdatedAt = "2026-10-24T00:00:00Z";
  let buckets: { name: string; size?: number }[] = [{ name: "compliance" }];
  let failed = false;
  await page.route("**/api/v1/buckets", (route) =>
    route.fulfill({
      status: failed ? 500 : 200,
      json: failed
        ? { message: "Usage unavailable" }
        : { buckets, usageUpdatedAt },
    }),
  );
  await page.route("**/api/v1/buckets/compliance/quota", (route) =>
    route.fulfill({ json: { quota: 10 * 1024 ** 3, type: "hard" } }),
  );
  await page.route("**/api/v1/buckets/compliance/object-locking", (route) =>
    route.fulfill({
      status: failed ? 500 : 200,
      json: failed ? { message: "Lock status unavailable" } : {},
    }),
  );
  await page.goto(`${SERVER_ENDPOINT}/buckets/compliance/admin/summary`);
  const usage = page
    .getByText("Reported Usage:", { exact: true })
    .locator("..")
    .locator("..");
  const lock = page.getByText("Object Locking:", { exact: true }).locator("..");
  const progress = page.getByRole("progressbar", {
    name: "Reported Usage:",
    exact: true,
  });
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await expect(usage).toContainText(/0\s*B/);
  await expect(page.getByText("10.0 GiB", { exact: true })).toBeVisible();
  await expect(lock).toContainText("Disabled");

  buckets = [{ name: "compliance", size: 5 * 1024 ** 3 }];
  await page.reload();
  await expect(progress).toHaveAttribute("aria-valuenow", "50");
  await expect(usage).toContainText(/5.0\s*GiB/);

  buckets = [];
  await page.reload();
  await expect(usage).toContainText("Quota: 10.0 GiB");
  await expect(usage).toContainText("—");
  await expect(progress).toHaveCount(0);

  failed = true;
  await page.reload();
  await expect(lock).toContainText("Unknown");
  await expect(usage).toContainText("—");
  await expect(progress).toHaveCount(0);
});

test("unconfigured replication sites show an empty list and failed reads offer recovery", async ({
  page,
}) => {
  let failed = false;
  await page.route("**/api/v1/admin/site-replication", (route) =>
    route.fulfill({
      status: failed ? 500 : 200,
      json: failed ? { message: "Unavailable" } : { sites: null },
    }),
  );
  await page.goto(`${SERVER_ENDPOINT}/settings/site-replication`);
  await expect(
    page.getByRole("region", { name: "No replication sites yet", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#empty-add-sites")).toBeEnabled();
  failed = true;
  await page.reload();
  await expect(
    page.getByRole("region", {
      name: "Unable to load replication sites",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("#empty-add-sites")).toHaveCount(0);
  failed = false;
  await page.locator("#retry-sites").click();
  await expect(
    page.getByRole("region", { name: "No replication sites yet", exact: true }),
  ).toBeVisible();
});

test("a configured read-only KMS handles a null key list without offering creation", async ({
  page,
}) => {
  await page.route("**/api/v1/session", async (route) => {
    const response = await route.fetch();
    const session = await response.json();
    session.features = [...(session.features ?? []), "kms"];
    session.permissions = { "console-ui": ["kms:ListKeys"] };
    await route.fulfill({ response, json: session });
  });
  await page.route("**/api/v1/kms/keys?*", (route) =>
    route.fulfill({ json: { results: null } }),
  );
  await page.goto(`${SERVER_ENDPOINT}/kms/keys`);
  await expect(
    page.getByRole("region", { name: "No encryption keys yet", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#empty-list-action")).toHaveCount(0);
  await expect(page.locator("#create-key")).toHaveCount(0);
});

const searchableLists = [
  {
    name: "access keys",
    path: "/access-keys",
    api: "/service-accounts",
    placeholder: "Search Access Keys",
    row: "t11-access-key",
    data: [
      {
        accessKey: "t11-access-key",
        expiration: "1970-01-01T00:00:00Z",
        accountStatus: "on",
        name: "Test key",
      },
    ],
  },
  {
    name: "groups",
    path: "/identity/groups",
    api: "/groups",
    placeholder: "Search Groups",
    row: "t11-group",
    data: { groups: ["t11-group"] },
  },
  {
    name: "group members",
    path: "/identity/groups/t11-group",
    api: "/group/t11-group",
    placeholder: "Search members",
    row: "t11-member",
    data: { name: "t11-group", members: ["t11-member"], status: "enabled" },
  },
  {
    name: "event destinations",
    path: "/settings/event-destinations",
    api: "/admin/notification_endpoints",
    placeholder: "Search target",
    row: "webhook:t11-target",
    data: {
      notification_endpoints: [
        { service: "webhook", account_id: "t11-target", status: "Online" },
      ],
    },
  },
  {
    name: "tiers",
    path: "/settings/tiers",
    api: "/admin/tiers",
    placeholder: "Filter",
    row: "t11-tier",
    data: {
      items: [
        {
          type: "s3",
          status: true,
          s3: {
            name: "t11-tier",
            endpoint: "https://example.com",
            bucket: "archive",
          },
        },
      ],
    },
  },
];

for (const list of searchableLists) {
  test(`${list.name} distinguishes whitespace searches from a filtered empty list`, async ({
    page,
  }) => {
    await page.route(`**/api/v1${list.api}`, (route) =>
      route.fulfill({ json: list.data }),
    );
    await page.goto(`${SERVER_ENDPOINT}${list.path}`);
    const row = page.getByRole("row").filter({ hasText: list.row });
    await expect(row).toBeVisible();
    const search = page.getByPlaceholder(list.placeholder, { exact: true });
    await search.fill("   ");
    await expect(row).toBeVisible();
    await search.fill("t11-no-such-result");
    await expect(row).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "No matching results", exact: true }),
    ).toBeVisible();
    await page.locator("#clear-list-filters").click();
    await expect(row).toBeVisible();
    await expect(search).toHaveValue("");
  });
}
