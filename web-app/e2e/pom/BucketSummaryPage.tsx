import { Page, Locator } from "@playwright/test";

export class BucketSummaryPage {
  page: Page;
  bucketName: string;

  constructor(page: Page, bucketName: string) {
    this.page = page;
    this.bucketName = bucketName;
  }
  getLocator(selector: string): Locator {
    const page = this.page;
    const locator: Locator = page.locator(`${selector}`);
    return locator;
  }

  async loadPage() {
    await this.clickOnTab("Summary");
  }

  async clickOnTab(label: string) {
    await this.page.getByRole("tab", { name: label, exact: true }).click();
  }

  async confirmDeleteBucket() {
    await this.page
      .getByRole("button", { name: "Bucket actions", exact: true })
      .click();
    await this.page
      .getByRole("menuitem", { name: "Delete Bucket", exact: true })
      .click();
    await this.getLocator("#confirm-ok").click();
  }

  async getObjectVersionOption() {
    await this.getLocator("#add-bucket-lifecycle-rule").click();
    return this.getLocator("#object_version-select > div").nth(0);
  }
}
