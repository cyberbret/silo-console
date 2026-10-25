// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { Locator, Page, Response, TestInfo } from "@playwright/test";
import { createHash } from "node:crypto";
import { test, expect } from "./fixtures/guiTest";
import type {
  PreviewFixture,
  PreviewKind,
  PreviewObject,
} from "./fixtures/guiResources";

const limit = 1048576;
const parserError = "Markdown preview exceeds its structural budget.";
const errors = new WeakMap<Page, string[]>();
const expectedParserErrors = new WeakSet<Page>();
const previewDialog = (page: Page, object: PreviewObject) =>
  page.getByRole("dialog", { name: `Preview - ${object.key}`, exact: true });
const downloadURL =
  (fixture: PreviewFixture, object: PreviewObject) => (url: URL) =>
    url.pathname === `/api/v1/buckets/${fixture.bucket}/objects/download` &&
    url.searchParams.get("prefix") === object.key;
const sourceText = (dialog: Locator) =>
  dialog
    .getByTestId("text-preview-content")
    .locator("[data-text-line]")
    .allTextContents()
    .then((lines) => lines.join(""));

async function assertRequest(response: Response, object: PreviewObject) {
  expect(response.request().method()).toBe("GET");
  expect(object.versionId).toBeTruthy();
  expect(object.versionId).not.toBe("null");
  expect(new URL(response.url()).searchParams.get("prefix")).toBe(object.key);
  expect(new URL(response.url()).searchParams.get("version_id")).toBe(
    object.versionId,
  );
  expect(await response.request().headerValue("range")).toBe("bytes=0-1048575");
}

async function requestReceipt(
  response: Response,
  testInfo: TestInfo,
  name: string,
) {
  await testInfo.attach(name, {
    body: JSON.stringify({
      url: response.url(),
      status: response.status(),
      range: await response.request().headerValue("range"),
      contentRange: response.headers()["content-range"],
      contentLength: response.headers()["content-length"],
      contentType: response.headers()["content-type"],
    }),
    contentType: "application/json",
  });
}

async function rawRangeBody(
  page: Page,
  response: Response,
  info: TestInfo,
  name: string,
) {
  // Chromium's protocol can decode charset-less text before Response.text(),
  // and a cancelled bounded stream need not retain a CDP response body. Keep
  // the actual browser request assertions and obtain an independent raw-byte
  // witness from the same authenticated, exact-version Range endpoint.
  const raw = await page.request.get(response.url(), {
    headers: { Range: "bytes=0-1048575" },
  });
  try {
    expect(raw.status()).toBe(response.status());
    for (const header of ["content-range", "content-length", "content-type"])
      expect(raw.headers()[header]).toBe(response.headers()[header]);
    const body = await raw.body();
    await info.attach(name, {
      body: JSON.stringify({
        provenance: "independent authenticated exact-version Range read",
        url: raw.url(),
        status: raw.status(),
        headers: raw.headers(),
        bytes: body.byteLength,
        sha256: createHash("sha256").update(body).digest("hex"),
      }),
      contentType: "application/json",
    });
    return body;
  } finally {
    await raw.dispose();
  }
}

async function openPreview(
  page: Page,
  fixture: PreviewFixture,
  kind: PreviewKind,
) {
  const object = fixture.objects[kind];
  await page.goto(object.detailPath);
  const preview = page.getByRole("button", { name: "Preview", exact: true });
  await expect(preview).toBeEnabled();
  const received = page.waitForResponse((response) =>
    downloadURL(fixture, object)(new URL(response.url())),
  );
  await preview.click();
  const response = await received;
  expect([200, 206]).toContain(response.status());
  await assertRequest(response, object);
  const dialog = previewDialog(page, object);
  await expect(dialog).toBeVisible();
  return { dialog, response, object };
}

async function closePreview(dialog: Locator) {
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("language", "en"));
  const messages: string[] = [];
  errors.set(page, messages);
  page.on("pageerror", (error) => messages.push(error.message));
});

test.afterEach(async ({ page }, testInfo) => {
  const messages = errors.get(page) ?? [];
  await testInfo.attach("preview-page-errors", {
    body: JSON.stringify({
      messages,
      expectedControlledError: expectedParserErrors.has(page)
        ? parserError
        : null,
    }),
    contentType: "application/json",
  });
  // React development builds may report the deliberately rejected Markdown
  // render before its error boundary recovers. No other error is accepted.
  expect(
    messages.filter(
      (message) => !(expectedParserErrors.has(page) && message === parserError),
    ),
  ).toEqual([]);
});

test("real Markdown and extensionless text preview safely, with the exact object version", async ({
  page,
  owned,
}, testInfo) => {
  const fixture = await owned.preview();
  const remoteRequests: string[] = [];
  const dialogs: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname === "example.invalid")
      remoteRequests.push(request.url());
  });
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });

  await test.step("real Markdown renders semantic content and inert links; Source preserves bytes", async () => {
    const { dialog, response } = await openPreview(page, fixture, "markdown");
    const markdown = dialog.getByRole("region", {
      name: "Markdown preview content",
      exact: true,
    });
    await expect(
      markdown.getByRole("heading", {
        name: fixture.expected.markdownHeading,
        exact: true,
      }),
    ).toBeVisible();
    await expect(markdown.locator("strong")).toHaveText("strong text");
    await expect(
      markdown.locator("script,img,iframe,object,embed,svg"),
    ).toHaveCount(0);
    const link = markdown.getByRole("link", {
      name: "Image: remote",
      exact: true,
    });
    await expect(link).toHaveAttribute(
      "href",
      "https://example.invalid/t23-remote.png",
    );
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      await page.evaluate(() => Object.hasOwn(globalThis, "t23Injected")),
    ).toBe(false);
    expect(remoteRequests).toEqual([]);
    expect(dialogs).toEqual([]);
    await expect(dialog.locator("#preview-rendered")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const original = (
      await rawRangeBody(page, response, testInfo, "raw-markdown-bytes")
    ).toString("utf8");
    expect(original).toContain(
      "<script>globalThis.t23Injected = true</script>",
    );
    await dialog.locator("#preview-source").click();
    await expect(dialog.locator("#preview-source")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect.poll(() => sourceText(dialog)).toBe(original);
    await expect(
      dialog.getByTestId("text-preview-content").locator("script"),
    ).toHaveCount(0);
    await dialog.locator("#preview-rendered").click();
    await expect(
      markdown.getByRole("heading", {
        name: fixture.expected.markdownHeading,
        exact: true,
      }),
    ).toBeVisible();
    await requestReceipt(response, testInfo, "real-markdown-request");
    await closePreview(dialog);
  });

  await test.step("the actual version row previews its returned version ID", async () => {
    const object = fixture.objects.markdown;
    await page
      .getByRole("button", { name: "Display Object Versions", exact: true })
      .click();
    const version = page.locator(".mainFileVersionItem").filter({
      has: page.getByText(object.versionId!, { exact: true }),
    });
    await expect(version).toHaveCount(1);
    const received = page.waitForResponse((response) =>
      downloadURL(fixture, object)(new URL(response.url())),
    );
    await version.getByRole("button", { name: "Preview", exact: true }).click();
    const response = await received;
    expect([200, 206]).toContain(response.status());
    await assertRequest(response, object);
    const dialog = previewDialog(page, object);
    await expect(
      dialog.getByRole("heading", {
        name: fixture.expected.markdownHeading,
        exact: true,
      }),
    ).toBeVisible();
    await requestReceipt(response, testInfo, "real-selected-version-request");
    await closePreview(dialog);
  });

  await test.step("extensionless text preserves Chinese and literal percent escapes and wraps on demand", async () => {
    const { dialog, response, object } = await openPreview(
      page,
      fixture,
      "text",
    );
    expect(object.key).toContain("无扩展");
    expect(object.key).toContain("%2F");
    expect(
      await rawRangeBody(page, response, testInfo, "raw-extensionless-bytes"),
    ).toEqual(Buffer.from(fixture.expected.text, "utf8"));
    await expect.poll(() => sourceText(dialog)).toBe(fixture.expected.text);
    const wrap = dialog.getByRole("checkbox", {
      name: "Wrap lines",
      exact: true,
    });
    const line = dialog.locator("pre[data-text-line]").nth(1);
    await expect(wrap).toBeChecked();
    await expect(line).toHaveCSS("white-space", "pre-wrap");
    await wrap.uncheck();
    await expect(line).toHaveCSS("white-space", "pre");
    await wrap.check();
    await expect(line).toHaveCSS("white-space", "pre-wrap");
    await expect.poll(() => sourceText(dialog)).toBe(fixture.expected.text);
    await requestReceipt(response, testInfo, "real-extensionless-text-request");
    await closePreview(dialog);
  });
  expect(remoteRequests).toEqual([]);
  expect(dialogs).toEqual([]);
});

test("real CSV, TSV and large log previews enforce visible limits without evaluating cells", async ({
  page,
  owned,
}, testInfo) => {
  const fixture = await owned.preview();
  await test.step("CSV caps rows and columns while Source retains the complete small object", async () => {
    const { dialog, response } = await openPreview(page, fixture, "csv");
    expect(fixture.expected.csvRows).toBeGreaterThan(500);
    expect(fixture.expected.csvColumns).toBeGreaterThan(100);
    const content = dialog.getByRole("region", {
      name: "CSV preview content",
      exact: true,
    });
    await expect(content.locator("tr")).toHaveCount(500);
    await expect(content.locator("tbody tr")).toHaveCount(499);
    await expect(content.locator("thead th")).toHaveCount(101);
    await expect(content.locator("thead th").last()).toHaveText("column99");
    const firstRow = content.locator("tbody tr").first();
    await expect(firstRow.locator("td").nth(0)).toHaveText("row-0");
    await expect(firstRow.locator("td").nth(1)).toHaveText("=1+1");
    await expect(firstRow.locator("td").nth(2)).toHaveText(
      "<b>literal html</b>",
    );
    await expect(content.locator("b,script,img,iframe")).toHaveCount(0);
    await expect(
      dialog.getByText("Showing first 500 rows", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(
        "Showing the first 100 columns. View Source or download the object to see all columns.",
        { exact: true },
      ),
    ).toBeVisible();
    const original = (
      await rawRangeBody(page, response, testInfo, "raw-csv-bytes")
    ).toString("utf8");
    await dialog.locator("#preview-source").click();
    await expect.poll(() => sourceText(dialog)).toBe(original);
    expect(original).toContain("column101");
    expect(original).toContain("row-504");
    await dialog.locator("#preview-rendered").click();
    await expect(content.locator("tr")).toHaveCount(500);
    await requestReceipt(response, testInfo, "real-csv-request");
    await closePreview(dialog);
  });

  await test.step("TSV uses tab columns and retains formulas as text", async () => {
    const { dialog, response } = await openPreview(page, fixture, "tsv");
    const table = dialog
      .getByRole("region", { name: "CSV preview content", exact: true })
      .getByRole("table");
    await expect(table.locator("tr")).toHaveCount(3);
    await expect(table.locator("thead th")).toHaveText([
      "Row",
      "name",
      "value",
    ]);
    await expect(table.locator("tbody tr").first().locator("td")).toHaveText([
      "alpha",
      "=1+1",
    ]);
    await expect(table.locator("tbody tr").last().locator("td")).toHaveText([
      "beta",
      "42",
    ]);
    await expect(
      dialog.getByText("Showing first 500 rows", { exact: true }),
    ).toHaveCount(0);
    await requestReceipt(response, testInfo, "real-tsv-request");
    await closePreview(dialog);
  });

  await test.step("large log uses the real 1 MiB Range and a bounded virtualized source", async () => {
    const { dialog, response, object } = await openPreview(
      page,
      fixture,
      "largeLog",
    );
    expect(object.size).toBeGreaterThan(limit);
    expect(response.status()).toBe(206);
    expect(response.headers()["content-range"]).toBe(
      `bytes 0-${limit - 1}/${object.size}`,
    );
    expect(Number(response.headers()["content-length"])).toBe(limit);
    await expect(
      dialog.getByText(
        "Showing the first 1 MiB. Download the object to see the full file.",
        { exact: true },
      ),
    ).toBeVisible();
    const body = await rawRangeBody(
      page,
      response,
      testInfo,
      "raw-large-log-bytes",
    );
    const firstLine = "bounded log line 0123456789\n";
    expect(body.byteLength).toBe(limit);
    expect(body.subarray(0, firstLine.length).toString("utf8")).toBe(firstLine);
    expect(body).toEqual(
      Buffer.from(firstLine.repeat(50000)).subarray(0, limit),
    );
    const source = dialog.getByTestId("text-preview-content");
    await expect(source).toBeVisible();
    await expect(source.locator("[data-text-line]").first()).toHaveText(
      firstLine,
    );
    expect(await source.locator("[data-text-line]").count()).toBeLessThan(1000);
    await expect(dialog.locator("#download-text-preview")).toBeEnabled();
    await requestReceipt(response, testInfo, "real-large-log-range-request");
    await closePreview(dialog);
  });
});

test("real HTML and XHTML objects have accessible disabled previews and never download for rendering", async ({
  page,
  owned,
}) => {
  const fixture = await owned.preview();
  const downloads: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      [fixture.objects.html, fixture.objects.xhtml].some((object) =>
        downloadURL(fixture, object)(url),
      )
    )
      downloads.push(request.url());
  });
  for (const kind of ["html", "xhtml"] as const) {
    await test.step(`real ${kind} metadata blocks preview`, async () => {
      await page.goto(fixture.objects[kind].detailPath);
      const button = page.getByRole("button", { name: "Preview", exact: true });
      await expect(button).toBeDisabled();
      const group = page.getByRole("group", { name: "Preview", exact: true });
      await group.focus();
      await expect(group).toBeFocused();
      await expect(group).toHaveAccessibleDescription(
        "Preview is not available for this file type.",
      );
      await expect(button).toHaveAccessibleDescription(
        "Preview is not available for this file type.",
      );
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(
        await page.evaluate(() => Object.hasOwn(globalThis, "t23Injected")),
      ).toBe(false);
      expect(downloads).toEqual([]);
    });
  }
});

test("controlled preview read failure retries the real object and Markdown budget failures recover to Source", async ({
  page,
  owned,
}, testInfo) => {
  const fixture = await owned.preview();
  const object = fixture.objects.markdown;
  const match = downloadURL(fixture, object);
  await page.goto(object.detailPath);
  await expect(
    page.getByRole("button", { name: "Preview", exact: true }),
  ).toBeEnabled();
  await test.step("intercepted 503 shows Retry; removing interception reads the actual version", async () => {
    await page.route(match, (route) =>
      route.fulfill({
        status: 503,
        json: { message: "T23 controlled text preview failure" },
      }),
    );
    const received = page.waitForResponse(
      (response) => match(new URL(response.url())) && response.status() === 503,
    );
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const failed = await received;
    await assertRequest(failed, object);
    const dialog = previewDialog(page, object);
    await expect(
      dialog.getByText("Text preview failed", { exact: true }),
    ).toBeVisible();
    await expect(dialog.locator("#retry-text-preview")).toBeEnabled();
    await expect(dialog.locator("#download-text-preview")).toBeEnabled();
    await requestReceipt(failed, testInfo, "intercepted-503-request");
    await page.unroute(match);
    const retried = page.waitForResponse(
      (response) => match(new URL(response.url())) && response.ok(),
    );
    await dialog.locator("#retry-text-preview").click();
    const recovered = await retried;
    await assertRequest(recovered, object);
    await expect(
      dialog.getByRole("heading", {
        name: fixture.expected.markdownHeading,
        exact: true,
      }),
    ).toBeVisible();
    await expect(dialog.locator("#retry-text-preview")).toHaveCount(0);
    await requestReceipt(
      recovered,
      testInfo,
      "real-recovered-markdown-request",
    );
    await closePreview(dialog);
  });

  for (const [name, body] of [
    ["nested", `${"> ".repeat(40)}deep\n`],
    ["oversized", "a".repeat(262145)],
  ] as const) {
    await test.step(`intercepted ${name} Markdown falls back without losing the dialog`, async () => {
      expectedParserErrors.add(page);
      await page.route(match, (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/markdown; charset=utf-8",
          body,
        }),
      );
      const received = page.waitForResponse((response) =>
        match(new URL(response.url())),
      );
      await page.getByRole("button", { name: "Preview", exact: true }).click();
      const response = await received;
      await assertRequest(response, object);
      const dialog = previewDialog(page, object);
      await expect(
        dialog.getByText(
          "Markdown rendering is unavailable for this content. Showing the source instead.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(dialog.locator("#preview-source")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect.poll(() => sourceText(dialog)).toBe(body);
      await expect(
        dialog.getByRole("region", {
          name: "Markdown preview content",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(dialog.locator("#download-text-preview")).toBeEnabled();
      await requestReceipt(
        response,
        testInfo,
        `intercepted-${name}-markdown-request`,
      );
      await closePreview(dialog);
      await page.unroute(match);
    });
  }
});
