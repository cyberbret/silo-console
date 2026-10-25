// This file is part of MinIO Console Server
// Copyright (c) 2023 MinIO, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
import { expect } from "@playwright/test";
import { generateUUID, test } from "./fixtures/baseFixture";
import { minioadminFile } from "./consts";
import { BUCKET_LIST_PAGE } from "./consts";

test.use({ storageState: minioadminFile });

test.beforeEach(async ({ page }) => {
  await page.goto(BUCKET_LIST_PAGE);
  await page.waitForTimeout(1000);
});

test("create a new bucket", async ({ page }) => {
  await page.locator(`#buckets`).click();
  await page.locator(`#create-bucket`).click();
  await page.locator("#bucket-name").click();

  const bucketName = `new-bucket-${generateUUID()}`;

  await page.locator("#bucket-name").fill(bucketName);
  await page.locator(`#create-bucket`).click();
  await page.waitForTimeout(2000);
  await page.locator(`#buckets`).click();
  // The unified list opens Objects; the recent sidebar entry appears on visit.
  await page.reload();
  await page.locator("#refresh-buckets").click();
  await page.waitForTimeout(2000);
  await page.getByPlaceholder("Search Buckets").fill(bucketName);

  const bucketLocatorEl = `a[href="/browser/${encodeURIComponent(bucketName)}"]`;
  const bucketLocator = page.locator(bucketLocatorEl);
  await expect(bucketLocator).toHaveCount(1);
  await bucketLocator.click();
  await expect(page).toHaveURL(new RegExp(`/browser/${bucketName}$`));
  await expect(page.locator(`#sidebarManageBucket-${bucketName}`)).toHaveCount(
    1,
  );
  await page
    .getByRole("button", { name: "Bucket actions", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Delete Bucket", exact: true })
    .click();
  //confirm modal
  await page.locator("#confirm-ok").click();
  await expect(page).toHaveURL(/\/buckets(?:\?|$)/);
  await expect(page.locator(bucketLocatorEl)).toHaveCount(0);
});

test("invalid bucket name", async ({ page }) => {
  await page.locator(`#buckets`).click();
  await page.locator(`#create-bucket`).click();
  await page.locator("#bucket-name").click();
  await page.locator("#bucket-name").fill("invalid name");
  await page.getByRole("button", { name: "View Bucket Naming Rules" }).click();
  await expect(
    page.getByText(
      "Bucket names can consist only of lowercase letters, numbers, dots (.), and hyphe",
    ),
  ).toBeTruthy();
});
