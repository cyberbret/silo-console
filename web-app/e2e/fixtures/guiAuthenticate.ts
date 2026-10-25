// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { chromium, expect, type Page } from "@playwright/test";
import { mkdir, chmod, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  guiCredentials,
  guiEnvironment,
  type GuiAccount,
} from "./guiEnvironment";
import { browserExecutable } from "./browserExecutable";
import { demoPreflight } from "./guiResources";

export async function loginViaUI(page: Page, account: GuiAccount) {
  const { username, password } = guiCredentials(account);
  await page.getByPlaceholder("Username", { exact: true }).fill(username);
  await page.getByPlaceholder("Password", { exact: true }).fill(password);
  const login = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/v1/login" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Login", exact: true }).click();
  expect((await login).status()).toBe(204);
  await expect(page).not.toHaveURL(/\/login(?:[?#]|$)/);
  const response = await page.request.get(
    `${guiEnvironment().url}/api/v1/session`,
  );
  expect(response.status()).toBe(200);
  const session = await response.json();
  expect(session.accountAccessKey).toBe(username);
  return session;
}
export default async function authenticate() {
  const env = guiEnvironment();
  await mkdir(join(env.artifacts, "auth"), { recursive: true, mode: 0o700 });
  await mkdir(env.screenshots, { recursive: true, mode: 0o700 });
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
  });
  const accounts: { account: GuiAccount; identity: string; landing: string }[] =
    [];
  let browserPlatform = "";
  try {
    for (const account of ["admin", "alice", "bob"] as const) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        browserPlatform = await page.evaluate(() => navigator.platform);
        await page.goto(`${env.url}/login`);
        const session = await loginViaUI(page, account);
        accounts.push({
          account,
          identity: session.accountAccessKey,
          landing: new URL(page.url()).pathname,
        });
        await writeFile(
          join(env.artifacts, "authentication-progress.json"),
          JSON.stringify(accounts, null, 2),
          { mode: 0o600 },
        );
        if (account === "admin") {
          await page.goto(`${env.url}/browser/demo-data`);
          await expect(
            page.getByRole("grid", { name: "Objects", exact: true }),
          ).toBeVisible();
          await demoPreflight(context.request);
        } else {
          await page.goto(`${env.url}/buckets`);
          await expect(
            page.getByRole("heading", { name: "Buckets", exact: true }),
          ).toBeVisible();
        }
        await context.storageState({ path: env.authByAccount[account] });
        await chmod(env.authByAccount[account], 0o600);
      } finally {
        await context.close();
      }
    }
    await writeFile(
      join(env.artifacts, "authentication.json"),
      JSON.stringify(
        {
          accounts,
          browser: browser.version(),
          executable: browserExecutable(),
          hostPlatform: process.platform,
          browserPlatform,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
  } finally {
    await browser.close();
  }
}
