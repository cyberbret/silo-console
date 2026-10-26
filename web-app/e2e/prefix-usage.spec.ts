// Copyright (c) 2026 Urbanize
// SPDX-License-Identifier: AGPL-3.0-or-later

import { randomUUID } from "node:crypto";
import * as Minio from "minio";
import { expect, test } from "@playwright/test";
import { SERVER_ENDPOINT, adminAccessKey, adminSecretKey } from "./consts";
import { browserExecutable } from "./fixtures/browserExecutable";
import type { PrefixUsageFrame } from "../src/api/consoleApi";

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);
test.use({ launchOptions: { executablePath: browserExecutable() } });
const bucket = `prefix-usage-${randomUUID()}`;
const accessKey = process.env.CONSOLE_TEST_ACCESS_KEY || adminAccessKey;
const secretKey = process.env.CONSOLE_TEST_SECRET_KEY || adminSecretKey;
const endpoint = new URL(
  process.env.SILO_TEST_ENDPOINT || "http://localhost:9000",
);
const client = new Minio.Client({
  endPoint: endpoint.hostname,
  port: Number(endpoint.port || (endpoint.protocol === "https:" ? 443 : 80)),
  useSSL: endpoint.protocol === "https:",
  accessKey,
  secretKey,
});
const pageObjects = 1003;
const created: { name: string; versionId?: string }[] = [];
const put = async (name: string, size: number) => {
  const result = await client.putObject(bucket, name, Buffer.alloc(size));
  created.push({ name, versionId: result.versionId });
};

test.beforeAll(async () => {
  await client.makeBucket(bucket, "us-east-1");
  await client.setBucketVersioning(bucket, { Status: "Enabled" });
  await put("folder/a", 7);
  await put("folder/a", 11);
  await put("folder/nested/b", 13);
  await put("root", 5);
  await put("empty/", 0);
  await put("gone/item", 17);
  await client.removeObject(bucket, "gone/item");
  for (let offset = 0; offset < pageObjects; offset += 20) {
    await Promise.all(
      Array.from({ length: Math.min(20, pageObjects - offset) }, (_, i) =>
        put(`paged/${String(offset + i).padStart(5, "0")}`, 1),
      ),
    );
  }
});
test.afterAll(async () => {
  // This generated bucket is owned exclusively by this fixture; delete every
  // version and marker so acceptance tests leave no retained storage behind.
  const objects = [...created];
  // Only this one deletion creates a marker not returned by putObject.
  // Listing its exact key never needs the Node SDK's broken version-marker
  // pagination. The product API's Go SDK pagination is exercised above.
  for await (const object of client.listObjects(bucket, "gone/item", true, {
    IncludeVersion: true,
  })) {
    if (object.name)
      objects.push({ name: object.name, versionId: object.versionId });
  }
  if (objects.length) {
    const failures = await client.removeObjects(bucket, objects);
    expect(failures).toHaveLength(0);
  }
  await client.removeBucket(bucket);
});
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("language", "en"));
  const login = await page.request.post(`${SERVER_ENDPOINT}/api/v1/login`, {
    data: { accessKey, secretKey },
  });
  expect(login.ok()).toBe(true);
});
test("authenticated recursive API crosses pagination and separates retained versions", async ({
  page,
}) => {
  for (const versions of [false, true]) {
    const response = await page.request.get(
      `${SERVER_ENDPOINT}/api/v1/buckets/${bucket}/prefix-usage?prefix=&versions=${versions}`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain(
      "application/x-ndjson",
    );
    const frames = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as PrefixUsageFrame);
    const last = frames.at(-1)!;
    expect(last.status).toBe("complete");
    expect(last.totals.current_bytes).toBe(String(29 + pageObjects));
    expect(last.totals.current_objects).toBe(4 + pageObjects);
    expect(last.totals.retained_bytes).toBe(versions ? "24" : "0");
    expect(last.totals.retained_versions).toBe(versions ? 2 : 0);
    expect(last.totals.delete_markers).toBe(versions ? 1 : 0);
    expect(
      last.folders.find((f) => f.prefix === "folder/")?.usage.current_bytes,
    ).toBe("24");
    expect(
      last.folders.find((f) => f.prefix === "paged/")?.usage.current_bytes,
    ).toBe(String(pageObjects));
  }
});
test("folder rows display calculated sizes and retained bytes without opening a details screen", async ({
  page,
}) => {
  await page.goto(`${SERVER_ENDPOINT}/browser/${bucket}`);
  const panel = page.getByRole("region", { name: "Folder sizes" });
  await expect(panel).toBeVisible();
  await panel.getByLabel("Include retained versions").check();
  await panel
    .getByRole("button", { name: "Calculate folder sizes", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText(/Complete/);
  await expect(panel.getByRole("status")).toContainText("Retained size: 24 B");
  const folder = page.getByRole("row", { name: /^folder\/, Folder, 24 B/ });
  await expect(folder).toBeVisible();
  await expect(folder).toContainText("Retained size: 7 B");
  const empty = page.getByRole("row", { name: /^empty\/, Folder, 0 B/ });
  await expect(empty).toBeVisible();
  await folder.getByRole("button", { name: "Object actions: folder/" }).click();
  await page
    .getByRole("menuitem", { name: "Calculate size", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText("folder/");
  await expect(panel.getByRole("status")).toContainText(/Complete/);
  await expect(panel.getByRole("status")).toContainText("Current size: 24 B");
});
test("operator can cancel a pending calculation and navigation clears old totals", async ({
  page,
}) => {
  await page.goto(`${SERVER_ENDPOINT}/browser/${bucket}`);
  let requested = false;
  await page.route("**/prefix-usage?**", () => {
    requested = true;
  });
  const panel = page.getByRole("region", { name: "Folder sizes" });
  await panel
    .getByRole("button", { name: "Calculate folder sizes", exact: true })
    .click();
  await expect.poll(() => requested).toBe(true);
  await panel.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText(
    "Canceled — totals are partial",
  );
  await page.unroute("**/prefix-usage?**");
  await page.getByRole("row", { name: /^folder\/, Folder/ }).click();
  await expect(page).toHaveURL(new RegExp("folder"));
  await expect(
    page.getByRole("region", { name: "Folder sizes" }).getByRole("status"),
  ).toHaveCount(0);
});
