// Copyright (c) 2026 PGSTY
// SPDX-License-Identifier: AGPL-3.0-or-later

import { type Route } from "@playwright/test";
import {
  test,
  expect,
  groupLogin,
  apiLogin,
  groupStatusEnvironment,
} from "./fixtures/groupStatusFixture";

test.skip(
  !process.env.GROUP_STATUS_CONFIG,
  "Requires an isolated SILO/Console group regression deployment",
);

test("delayed real initial GET preserves both members and then permits a status-only write", async ({
  page,
  groupFixture: f,
}, info) => {
  await groupLogin(page, f.manager);
  const path = `/api/v1/group/${f.group}`;
  let held: Route | undefined, realBody: unknown;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writes: unknown[] = [];
  page.on("request", (r) => {
    if (r.method() === "PUT" && new URL(r.url()).pathname === path)
      writes.push(r.postDataJSON());
  });
  await page.route(`**${path}`, async (route) => {
    if (route.request().method() !== "GET" || held) return route.continue();
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    realBody = await response.json();
    held = route;
    await gate;
    await route.fulfill({ response });
  });
  try {
    await page.goto(`/identity/groups/${f.group}`);
    await expect.poll(() => Boolean(held)).toBe(true);
    await expect(page.locator("#group-status")).toBeDisabled();
    await expect(page.locator("#add-user-group")).toBeDisabled();
    expect(writes).toEqual([]);
    expect((await f.read()).members?.sort()).toEqual(
      f.members.slice(0, 2).sort(),
    );
    release();
    await expect(page.locator("#group-status")).toBeEnabled();
    await page.locator("#group-status").click();
    await expect(page.locator("#group-status")).not.toBeChecked();
    const after = await f.read();
    expect(after.status).toBe("disabled");
    expect(after.members?.sort()).toEqual(f.members.slice(0, 2).sort());
    expect(writes).toEqual([{ status: "disabled" }]);
    await info.attach("real-before-after", {
      body: JSON.stringify({ before: realBody, after, writes }),
      contentType: "application/json",
    });
  } finally {
    release();
  }
});

test("external membership replacement survives a status toggle from the stale page", async ({
  page,
  groupFixture: f,
}, info) => {
  await groupLogin(page, f.manager);
  await page.goto(`/identity/groups/${f.group}`);
  await expect(page.getByText(f.members[0], { exact: true })).toBeVisible();
  const before = await f.read();
  expect(
    (
      await f.root.put(`/api/v1/group/${f.group}`, {
        data: { members: [f.members[2]], status: "enabled" },
      })
    ).ok(),
  ).toBe(true);
  const external = await f.read();
  const update = page.waitForResponse(
    (r) =>
      r.request().method() === "PUT" && r.url().endsWith(`/group/${f.group}`),
  );
  await page.locator("#group-status").click();
  const response = await update;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toEqual({ status: "disabled" });
  await expect(page.getByText(f.members[2], { exact: true })).toBeVisible();
  const after = await f.read();
  expect(after.members).toEqual([f.members[2]]);
  expect(after.status).toBe("disabled");
  await info.attach("real-stale-membership", {
    body: JSON.stringify({ before, external, after }),
    contentType: "application/json",
  });
});

test("failed initial read cannot edit members or status and Retry restores real data", async ({
  page,
  groupFixture: f,
}) => {
  await groupLogin(page, f.manager);
  let failed = false;
  const writes: unknown[] = [];
  await page.route(`**/api/v1/group/${f.group}`, async (route) => {
    if (route.request().method() !== "GET") {
      writes.push(route.request().postDataJSON());
      return route.continue();
    }
    if (failed) return route.continue();
    failed = true;
    await route.fulfill({
      status: 503,
      json: { message: "controlled group read failure" },
    });
  });
  await page.goto(`/identity/groups/${f.group}`);
  await expect(page.locator("#retry-group")).toBeVisible();
  await expect(page.locator("#group-status")).toBeDisabled();
  await expect(page.locator("#add-user-group")).toBeDisabled();
  expect(writes).toEqual([]);
  await page.locator("#retry-group").click();
  await expect(page.locator("#group-status")).toBeEnabled();
  expect((await f.read()).members?.sort()).toEqual(
    f.members.slice(0, 2).sort(),
  );
});

test("late real group response cannot overwrite another group's displayed or stored members", async ({
  page,
  groupFixture: f,
}) => {
  await groupLogin(page, f.manager);
  let held = false;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/v1/group/${f.group}`, async (route) => {
    const response = await route.fetch();
    held = true;
    await gate;
    await route.fulfill({ response }).catch(() => {});
  });
  try {
    await page.goto(`/identity/groups/${f.group}`);
    await expect.poll(() => held).toBe(true);
    await page
      .getByRole("button", { name: "Groups", exact: true })
      .last()
      .click();
    await page
      .getByRole("button", {
        name: `Actions for ${f.secondGroup}`,
        exact: true,
      })
      .click();
    await page.getByRole("menuitem", { name: "View", exact: true }).click();
    await expect(page.getByText(f.members[2], { exact: true })).toBeVisible();
    release();
    await page.locator("#group-status").click();
    await expect(page.locator("#group-status")).not.toBeChecked();
    expect((await f.read(f.secondGroup)).members).toEqual([f.members[2]]);
    expect((await f.read()).members?.sort()).toEqual(
      f.members.slice(0, 2).sort(),
    );
    await expect(page.getByText(f.members[0], { exact: true })).toHaveCount(0);
  } finally {
    release();
  }
});

test("ordinary admin can edit and explicitly clear members through the existing dialog", async ({
  page,
  groupFixture: f,
}) => {
  await groupLogin(page, f.manager);
  await page.goto(`/identity/groups/${f.group}`);
  await expect(page.locator("#add-user-group")).toBeEnabled();
  await page.locator("#add-user-group").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Filter Users").fill(f.members[0].slice(0, -1));
  await dialog
    .getByRole("checkbox", { name: f.members[0], exact: true })
    .uncheck();
  await dialog
    .getByRole("checkbox", { name: f.members[2], exact: true })
    .check();
  await dialog.locator("#save-add-group-member").click();
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(async () => (await f.read()).members?.sort())
    .toEqual([f.members[1], f.members[2]].sort());
  await page.locator("#add-user-group").click();
  await dialog.getByPlaceholder("Filter Users").fill(f.members[0].slice(0, -1));
  for (const name of [f.members[1], f.members[2]])
    await dialog.getByRole("checkbox", { name, exact: true }).uncheck();
  await dialog.locator("#save-add-group-member").click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("No members yet", { exact: true })).toBeVisible();
  expect((await f.read()).members ?? []).toEqual([]);
  await page.locator("#group-status").click();
  await expect(page.locator("#group-status")).not.toBeChecked();
  expect((await f.read()).members ?? []).toEqual([]);
});

test("a pending real status write cannot be repeated or repaint the next group", async ({
  page,
  groupFixture: f,
}, info) => {
  await groupLogin(page, f.manager);
  await page.goto(`/identity/groups/${f.group}`);
  await expect(page.locator("#group-status")).toBeEnabled();
  let held = false,
    writes = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/v1/group/${f.group}`, async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    writes++;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    held = true;
    await gate;
    await route.fulfill({ response }).catch(() => {});
  });
  try {
    await page.locator("#group-status").click();
    await expect.poll(() => held).toBe(true);
    await expect(page.locator("#group-status")).toBeDisabled();
    await expect(page.locator("#add-user-group")).toBeDisabled();
    await page
      .getByRole("button", { name: "Groups", exact: true })
      .last()
      .click();
    await page
      .getByRole("button", {
        name: `Actions for ${f.secondGroup}`,
        exact: true,
      })
      .click();
    await page.getByRole("menuitem", { name: "View", exact: true }).click();
    await expect(page.getByText(f.members[2], { exact: true })).toBeVisible();
    release();
    await expect(page.locator("#group-status")).toBeChecked();
    await expect(page.locator("#group-status")).toBeEnabled();
    const first = await f.read(),
      second = await f.read(f.secondGroup);
    expect(first.status).toBe("disabled");
    expect(first.members?.sort()).toEqual(f.members.slice(0, 2).sort());
    expect(second.status).toBe("enabled");
    expect(second.members).toEqual([f.members[2]]);
    expect(writes).toBe(1);
    await info.attach("pending-status-navigation", {
      body: JSON.stringify({ first, second, writes }),
      contentType: "application/json",
    });
  } finally {
    release();
  }
});

test("HTTP contract retains legacy edits and rejects invalid requests before writes", async ({
  playwright,
  groupFixture: f,
}, info) => {
  const admin = await playwright.request.newContext({
    baseURL: groupStatusEnvironment().url,
  });
  await apiLogin(admin, f.manager);
  const path = `/api/v1/group/${f.group}`;
  const receipts: unknown[] = [];
  try {
    for (const data of [
      { status: "disabled" },
      { status: "enabled", members: null },
      { status: "disabled", members: [] },
      { status: "enabled", members: [f.members[2]] },
    ]) {
      const response = await admin.put(path, { data });
      expect(response.status()).toBe(200);
      const current = await f.read();
      expect(current.status).toBe(data.status);
      expect(current.members ?? []).toEqual(
        Array.isArray(data.members) ? data.members : f.members.slice(0, 2),
      );
      receipts.push({ data, result: current });
    }
    const before = await f.read();
    for (const data of [
      {},
      { members: [] },
      { members: [], status: "invalid" },
      { status: null },
      { status: "enabled", members: "bad" },
    ]) {
      const response = await admin.put(path, { data });
      expect([400, 422]).toContain(response.status());
      expect(await f.read()).toEqual(before);
      receipts.push({ data, rejected: response.status() });
    }
    await info.attach("HTTP-contract", {
      body: JSON.stringify(receipts),
      contentType: "application/json",
    });
  } finally {
    await admin.dispose();
  }
});

test("status permission needs no membership-write grant and read-only users remain denied", async ({
  page,
  playwright,
  groupFixture: f,
}) => {
  await groupLogin(page, f.statusEditor);
  await page.goto(`/identity/groups/${f.group}`);
  await expect(page.locator("#group-status")).toBeEnabled();
  await expect(page.locator("#add-user-group")).toBeDisabled();
  await page.locator("#group-status").click();
  await expect(page.locator("#group-status")).not.toBeChecked();
  expect((await f.read()).members?.sort()).toEqual(
    f.members.slice(0, 2).sort(),
  );
  const reader = await playwright.request.newContext({
    baseURL: groupStatusEnvironment().url,
  });
  await apiLogin(reader, f.reader);
  try {
    const before = await f.read();
    for (const data of [
      { status: "enabled" },
      { status: "enabled", members: [] },
    ]) {
      const response = await reader.put(`/api/v1/group/${f.group}`, { data });
      expect(response.status()).toBe(403);
      expect(await f.read()).toEqual(before);
    }
    await page.context().clearCookies();
    await groupLogin(page, f.reader);
    await page.goto(`/identity/groups/${f.group}`);
    await expect(page.locator("#group-status")).toBeDisabled();
  } finally {
    await reader.dispose();
  }
});
