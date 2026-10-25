// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { type Page, type Response } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "./fixtures/guiTest";
import { guiEnvironment } from "./fixtures/guiEnvironment";
import {
  canonicalPolicySnapshot,
  guiDemo,
  policySnapshot,
  readJSON,
  reconcileBuiltin,
  recordFixture,
} from "./fixtures/guiResources";

const detailsPath = "/api/v1/policy/writeonly";
const waitDetail = (page: Page) =>
  page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === detailsPath &&
      response.request().method() === "GET",
  );
const readResponse = async (response: Response) => ({
  status: response.status(),
  body: await response.text(),
});
async function readonlyPolicy(page: Page) {
  await page.getByRole("tab", { name: "Raw Policy", exact: true }).click();
  await expect(page.locator("textarea#code_wrapper")).toHaveJSProperty(
    "readOnly",
    true,
  );
  await expect(page.locator("#save")).toBeDisabled();
  await expect(page.locator("#override-policy")).toBeVisible();
  await expect(page.locator("#delete-policy")).toHaveCount(0);
}
async function failedPolicy(page: Page) {
  await expect(
    page.getByText("Could not load policy. Refresh to try again.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator("#code_wrapper, #save, #override-policy, #delete-policy"),
  ).toHaveCount(0);
  await expect(page.locator("#refresh-policy")).toBeEnabled();
}

test("actual users and policy types agree with live identity records", async ({
  page,
}) => {
  const usersResponse = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/v1/users" &&
      r.request().method() === "GET",
  );
  await page.goto("/identity/users");
  const users = await (await usersResponse).json();
  for (const name of ["alice", "bob"]) {
    const user = users.users.find(
      (item: { accessKey: string }) => item.accessKey === name,
    );
    expect(user.status).toBe("enabled");
    const row = page
      .locator(".ReactVirtualized__Table__row")
      .filter({ has: page.getByText(name, { exact: true }) });
    await expect(row).toContainText("Enabled");
    for (const group of user.memberOf) await expect(row).toContainText(group);
    for (const policy of user.policy) await expect(row).toContainText(policy);
  }
  await page.goto("/policies");
  for (const [name, label] of [
    ["readwrite", "Built-in"],
    ["demo-reader", "Custom"],
  ]) {
    const row = page
      .getByRole("row")
      .filter({ has: page.getByRole("link", { name, exact: true }) });
    await expect(row).toContainText(label);
  }
  await page.goto(`/policies/${guiDemo.builtin}`);
  await readonlyPolicy(page);
});

test("owned custom policy shows exact deletion impact, Cancel focus and a language-stable unsaved draft", async ({
  page,
  owned,
}) => {
  const fixture = await owned.iam(page.request);
  await page.goto("/policies");
  await page
    .getByPlaceholder("Search Policies", { exact: true })
    .fill(fixture.policy);
  const trigger = page.getByRole("button", {
    name: `Actions for ${fixture.policy}`,
    exact: true,
  });
  await trigger.click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Delete Policy",
    exact: true,
  });
  await expect(dialog).toContainText(
    "This policy is attached to 1 users and 1 groups.",
  );
  await expect(dialog.locator("#confirm-ok")).toBeEnabled();
  await dialog.locator("#confirm-cancel").click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.goto(`/policies/${fixture.policy}`);
  await page.getByRole("tab", { name: "Raw Policy", exact: true }).click();
  const editor = page.locator("textarea#code_wrapper");
  await expect(editor).toBeEditable();
  const draft = JSON.parse(await editor.inputValue());
  draft.Statement[0].Sid = "UnsavedLanguageProbe";
  const content = JSON.stringify(draft, null, 2);
  await editor.fill(content);
  let reads = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === `/api/v1/policy/${fixture.policy}`)
      reads++;
  });
  await page.locator("#language-activator").click();
  await expect(editor).toHaveValue(content);
  await expect(page.locator("#language-activator")).toHaveAccessibleName(
    "Switch to English",
  );
  await page.locator("#language-activator").click();
  await expect(editor).toHaveValue(content);
  expect(reads).toBe(0);
});

test("real built-in override and Reset immediately restore exact native policy state", async ({
  page,
}, testInfo) => {
  const env = guiEnvironment(),
    scope = testInfo.testId;
  const outcome: {
    path: string;
    immediate?: { status: number; body: string };
    refreshes: { status: number; body: string }[];
    restored: boolean;
    saveStatus?: number;
    resetStatus?: number;
    error?: string;
  } = { path: "immediate-read", refreshes: [], restored: false };
  const before = await policySnapshot(page.request);
  expect(before.detail.builtin).toBe(true);
  expect(before.detail.modified).toBe(false);
  const target = before.inventory.find(
    (item: { name: string }) => item.name === "writeonly",
  );
  expect(target.userCount).toBe(0);
  expect(target.groupCount).toBe(0);
  expect(before.users).toEqual([]);
  expect(before.groups).toEqual([]);
  const beforePath = join(env.artifacts, "fixtures", "builtin-before.json");
  writeFileSync(beforePath, JSON.stringify(before, null, 2), { mode: 0o600 });
  recordFixture(scope, "builtin-before", { name: "writeonly", beforePath });
  const writes: { method: string; path: string }[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (
      (path === "/api/v1/policies" && request.method() === "POST") ||
      (path === detailsPath && request.method() === "DELETE")
    )
      writes.push({ method: request.method(), path });
  });
  try {
    await page.goto("/policies/writeonly");
    await readonlyPolicy(page);
    const draft = JSON.parse(before.detail.policy);
    expect(draft.Statement[0].Sid).toBeUndefined();
    draft.Statement[0].Sid = `T23-${env.runId}`;
    const grants = structuredClone(draft);
    delete grants.Statement[0].Sid;
    expect(grants).toEqual(JSON.parse(before.detail.policy));
    await page.locator("#override-policy").click();
    await page
      .locator("textarea#code_wrapper")
      .fill(JSON.stringify(draft, null, 2));
    recordFixture(scope, "builtin-save-intent", { name: "writeonly", draft });
    const save = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/v1/policies" &&
        r.request().method() === "POST",
    );
    await page.locator("#save").click();
    outcome.saveStatus = (await save).status();
    expect(outcome.saveStatus).toBe(201);
    recordFixture(scope, "builtin-save-confirmed", {
      status: outcome.saveStatus,
    });
    await expect(
      page.getByText("Built-in · Modified", { exact: true }),
    ).toBeVisible();
    await page.locator("#delete-policy").click();
    const dialog = page.getByRole("dialog", {
      name: "Reset to default",
      exact: true,
    });
    await expect(dialog).toContainText(
      "This policy is attached to 0 users and 0 groups.",
    );
    await expect(dialog.locator("#confirm-ok")).toBeEnabled();
    const reset = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === detailsPath &&
        r.request().method() === "DELETE",
    );
    const immediate = waitDetail(page);
    recordFixture(scope, "builtin-reset-intent", { name: "writeonly" });
    await dialog.locator("#confirm-ok").click();
    outcome.resetStatus = (await reset).status();
    recordFixture(scope, "builtin-reset-result", {
      status: outcome.resetStatus,
    });
    expect(outcome.resetStatus).toBe(204);
    // This first read must stand on its own. An inventory read can repopulate
    // default policies in an older server's cache and conceal a broken Reset.
    outcome.immediate = await readResponse(await immediate);
    expect(outcome.immediate.status, outcome.immediate.body).toBe(200);
    expect(JSON.parse(outcome.immediate.body)).toEqual(before.detail);
    expect(outcome.refreshes).toEqual([]);
    await readonlyPolicy(page);
    // Only now is a complete inventory/attachment snapshot allowed.
    const after = await policySnapshot(page.request);
    expect(canonicalPolicySnapshot(after)).toEqual(
      canonicalPolicySnapshot(before),
    );
    expect(writes).toEqual([
      { method: "POST", path: "/api/v1/policies" },
      { method: "DELETE", path: detailsPath },
    ]);
    outcome.restored = true;
    recordFixture(scope, "builtin-restored", { path: outcome.path });
    writeFileSync(
      join(env.artifacts, "fixtures", "builtin-after.json"),
      JSON.stringify(after, null, 2),
      { mode: 0o600 },
    );
  } catch (error) {
    outcome.error = String(error);
    throw error;
  } finally {
    if (!outcome.restored) {
      // The same read-before-compensation guard owns ordinary failure and
      // interrupted-worker cleanup. It never repeats an attempted reset.
      const cleanup = await reconcileBuiltin();
      if (!cleanup.restored)
        outcome.error = `${outcome.error}; restoration unproven: ${cleanup.error}`;
    }
    writeFileSync(
      join(env.artifacts, "fixtures", "builtin-outcome.json"),
      JSON.stringify({ ...outcome, writes }, null, 2),
      { mode: 0o600 },
    );
    await testInfo.attach("builtin-restoration", {
      body: JSON.stringify(outcome, null, 2),
      contentType: "application/json",
    });
  }
});

for (const failure of ["500", "transport"] as const)
  test(`controlled Reset success followed by ${failure} read failure hides stale writes and needs one explicit Refresh`, async ({
    page,
  }, testInfo) => {
    const original = await readJSON(page.request, "/policy/readwrite");
    const modified = { ...original, name: "writeonly", modified: true };
    const normal = { ...original, name: "writeonly", modified: false };
    let deleted = 0,
      posted = 0,
      failed = true;
    await page.route("**/api/v1/policy/writeonly", async (route) => {
      if (route.request().method() === "DELETE") {
        deleted++;
        await route.fulfill({ status: 204 });
        return;
      }
      if (deleted > 0 && failed && failure === "transport") {
        await route.abort("failed");
        return;
      }
      await route.fulfill(
        deleted === 0
          ? { json: modified }
          : failed
            ? { status: 500, json: { message: "controlled read failure" } }
            : { json: normal },
      );
    });
    await page.route("**/api/v1/policies", async (route) => {
      if (route.request().method() === "POST") {
        posted++;
        await route.abort();
        return;
      }
      const response = await route.fetch(),
        data = await response.json();
      data.policies = data.policies.map((item: { name: string }) =>
        item.name === "writeonly"
          ? { ...modified, userCount: 0, groupCount: 0 }
          : item,
      );
      await route.fulfill({ json: data });
    });
    await page.goto("/policies/writeonly");
    await page.getByRole("tab", { name: "Raw Policy", exact: true }).click();
    await expect(page.locator("textarea#code_wrapper")).toBeEditable();
    await page.locator("#delete-policy").click();
    await page
      .getByRole("dialog", { name: "Reset to default", exact: true })
      .locator("#confirm-ok")
      .click();
    await failedPolicy(page);
    expect(deleted).toBe(1);
    expect(posted).toBe(0);
    failed = false;
    await page.locator("#refresh-policy").click();
    await readonlyPolicy(page);
    expect(deleted).toBe(1);
    expect(posted).toBe(0);
    await testInfo.attach("controlled-recovery", {
      body: JSON.stringify({ intercepted: true, failure, deleted, posted }),
      contentType: "application/json",
    });
  });
