// Copyright (c) 2026 PGSTY
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  test as base,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";

type Account = { username: string; password: string };
export function groupStatusEnvironment(): { url: string; root: Account } {
  return JSON.parse(readFileSync(process.env.GROUP_STATUS_CONFIG!, "utf8"));
}
export async function apiLogin(request: APIRequestContext, account: Account) {
  const response = await request.post("/api/v1/login", {
    data: { accessKey: account.username, secretKey: account.password },
  });
  expect(response.status()).toBe(204);
}
export async function groupLogin(page: Page, account: Account) {
  await page.goto("/login");
  await page
    .getByPlaceholder("Username", { exact: true })
    .fill(account.username);
  await page
    .getByPlaceholder("Password", { exact: true })
    .fill(account.password);
  const login = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/login") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Login", exact: true }).click();
  expect((await login).status()).toBe(204);
  await expect(page).not.toHaveURL(/\/login/);
}

type Fixture = {
  root: APIRequestContext;
  manager: Account;
  reader: Account;
  statusEditor: Account;
  members: string[];
  group: string;
  secondGroup: string;
  read: (
    name?: string,
  ) => Promise<{ name: string; members: string[] | null; status: string }>;
};

// The caller supplies an isolated local deployment. All identities are created
// under a fresh prefix and removed through that same deployment after each test.
export const test = base.extend<{ groupFixture: Fixture }>({
  groupFixture: async ({ playwright }, use, info) => {
    const env = groupStatusEnvironment();
    const root = await playwright.request.newContext({ baseURL: env.url });
    await apiLogin(root, env.root);
    const prefix = `gr-${randomUUID().slice(0, 8)}`;
    const members = ["a", "b", "c"].map((name) => `${prefix}-${name}`);
    const manager = {
      username: `${prefix}-admin`,
      password: randomBytes(24).toString("hex"),
    };
    const reader = {
      username: `${prefix}-reader`,
      password: randomBytes(24).toString("hex"),
    };
    const statusEditor = {
      username: `${prefix}-status`,
      password: randomBytes(24).toString("hex"),
    };
    const group = `${prefix}-group`,
      secondGroup = `${prefix}-second`;
    const users: string[] = [],
      policies: string[] = [],
      groups: string[] = [];
    const read = async (name = group) => {
      const response = await root.get(`/api/v1/group/${name}`);
      expect(response.status()).toBe(200);
      return response.json();
    };
    try {
      for (const [name, actions] of [
        [`${prefix}-read-policy`, ["admin:GetGroup", "admin:ListGroups"]],
        [
          `${prefix}-status-policy`,
          [
            "admin:GetGroup",
            "admin:ListGroups",
            "admin:EnableGroup",
            "admin:DisableGroup",
          ],
        ],
      ] as const) {
        const response = await root.post("/api/v1/policies", {
          data: {
            name,
            policy: JSON.stringify({
              Version: "2012-10-17",
              Statement: [
                { Effect: "Allow", Action: actions, Resource: ["*"] },
              ],
            }),
          },
        });
        expect(response.ok()).toBe(true);
        policies.push(name);
      }
      for (const [account, attachedPolicies] of [
        ...members.map(
          (username) =>
            [
              { username, password: randomBytes(24).toString("hex") },
              [],
            ] as const,
        ),
        [manager, ["consoleAdmin"]],
        [reader, [policies[0]]],
        [statusEditor, [policies[1]]],
      ] as readonly (readonly [Account, readonly string[]])[]) {
        const response = await root.post("/api/v1/users", {
          data: {
            accessKey: account.username,
            secretKey: account.password,
            groups: [],
            policies: attachedPolicies,
          },
        });
        expect(response.ok()).toBe(true);
        users.push(account.username);
      }
      for (const [name, initialMembers] of [
        [group, members.slice(0, 2)],
        [secondGroup, [members[2]]],
      ] as const) {
        const response = await root.post("/api/v1/groups", {
          data: { group: name, members: initialMembers },
        });
        expect(response.ok()).toBe(true);
        groups.push(name);
      }
      await use({
        root,
        manager,
        reader,
        statusEditor,
        members,
        group,
        secondGroup,
        read,
      });
    } finally {
      const cleaned: string[] = [];
      for (const name of groups) {
        expect(
          (
            await root.put(`/api/v1/group/${name}`, {
              data: { status: "enabled", members: [] },
            })
          ).ok(),
        ).toBe(true);
        expect((await root.delete(`/api/v1/group/${name}`)).ok()).toBe(true);
        // Missing-group GET currently maps the upstream error to 500. Check
        // authoritative membership of the group list, not that unrelated mapping.
        expect(
          (await (await root.get("/api/v1/groups")).json()).groups,
        ).not.toContain(name);
        cleaned.push(name);
      }
      for (const name of users) {
        expect((await root.delete(`/api/v1/user/${name}`)).ok()).toBe(true);
        cleaned.push(name);
      }
      for (const name of policies) {
        expect((await root.delete(`/api/v1/policy/${name}`)).ok()).toBe(true);
        cleaned.push(name);
      }
      await info.attach("owned-resource-cleanup", {
        body: JSON.stringify({ cleaned }),
        contentType: "application/json",
      });
      await root.dispose();
    }
  },
});
export { expect };
