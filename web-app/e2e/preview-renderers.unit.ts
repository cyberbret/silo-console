// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { Browser, chromium, expect, Page, test } from "@playwright/test";
import { createServer, ViteDevServer } from "vite";
import { browserExecutable } from "./fixtures/browserExecutable";

test.describe.configure({ mode: "serial" });
let server: ViteDevServer;
let browser: Browser;
let page: Page;
let base: string;
test.beforeAll(async () => {
  server = await createServer({
    logLevel: "silent",
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test port");
  base = `http://127.0.0.1:${address.port}/e2e/fixtures/object-preview-harness.html`;
  browser = await chromium.launch({ executablePath: browserExecutable() });
});
test.beforeEach(async () => {
  page = await browser.newPage();
  page.on("pageerror", (error) => console.error(error));
  page.on("console", (message) => {
    if (message.type() === "error") console.error(message.text());
  });
});
test.afterEach(async () => {
  await page.close();
});
test.afterAll(async () => {
  await browser.close();
  await server.close();
});

const load = async (format: string, content: string, total?: number) => {
  await page.route(
    "**/api/v1/buckets/demo/objects/download*",
    async (route) => {
      expect(route.request().headers()["range"]).toBe("bytes=0-1048575");
      await route.fulfill({
        status: total ? 206 : 200,
        headers: total ? { "Content-Range": `bytes 0-1048575/${total}` } : {},
        contentType: "application/octet-stream",
        body: content,
      });
    },
  );
  await page.goto(`${base}?format=${format}`);
};

test("Markdown defaults to rendered, drops raw HTML and never auto-loads images", async () => {
  const requests: string[] = [];
  const dialogs: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("preview.invalid")) requests.push(request.url());
  });
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  const content =
    '# Preview\n\n<script>alert(1)</script>\n\n<img src="https://preview.invalid/raw" onerror="alert(1)">\n\n![remote](https://preview.invalid/image)\n\n![relative](images/photo.webp)\n\n[site](https://preview.invalid/link)\n\n[bad](javascript:alert(1))\n\n| Name | Value |\n| --- | --- |\n| text | safe |';
  await load("markdown", content);
  await expect(page.getByRole("heading", { name: "Preview" })).toBeVisible();
  await expect(page.locator("#preview-rendered")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.locator(
      "#root img, #root script, #root iframe, #root svg, #root object, #root embed",
    ),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Image: remote", exact: true }),
  ).toHaveAttribute("href", "https://preview.invalid/image");
  for (const link of await page.locator("#root a").all()) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(await link.getAttribute("href")).not.toMatch(/^javascript:/);
  }
  await expect(
    page.getByRole("cell", { name: "safe", exact: true }),
  ).toBeVisible();
  await page.locator("#preview-source").click();
  const source = await page.locator("[data-text-line]").allTextContents();
  expect(source.join("")).toBe(content);
  expect(requests).toEqual([]);
  expect(dialogs).toEqual([]);
});

const expectLocalMarkdownFallback = async (content: string) => {
  await page.route("**/api/v1/buckets/demo/objects/metadata*", (route) =>
    route.fulfill({
      json: { objectMetadata: { "Content-Type": "text/markdown" } },
    }),
  );
  await page.route("**/api/v1/buckets/demo/objects/download*", (route) => {
    expect(route.request().headers().range).toBe("bytes=0-1048575");
    return route.fulfill({ contentType: "text/plain", body: content });
  });
  await page.goto(base.replace("object-preview", "markdown-failure"));
  await expect(
    page.getByText(
      "Markdown rendering is unavailable for this content. Showing the source instead.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator(".recovery-page")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Console shell" }),
  ).toBeVisible();
  await expect(page.locator("#preview-source")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#preview-source").click();
  expect(
    (await page.locator("[data-text-line]").allTextContents()).join(""),
  ).toBe(content);
  await expect(page.locator("#download-text-preview")).toBeEnabled();
  await page.locator("#close").click();
  await expect(page.locator("#preview-source")).toHaveCount(0);
  await page.getByRole("button", { name: "Console action" }).click();
  await expect(page.getByLabel("Completed actions")).toHaveText("1");
};

test("3000 nested Markdown quotes keep Console, Source and the real modal close usable", async () => {
  await expectLocalMarkdownFallback("> ".repeat(3000) + "text");
});

test("unexpected Markdown parser exceptions are caught by the preview boundary", async () => {
  let intercepted = false;
  await page.route(/\/react-markdown\.js(?:\?|$)/, async (route) => {
    intercepted = true;
    await route.fulfill({
      contentType: "application/javascript",
      body: 'export default function Markdown() { throw new RangeError("Injected Markdown parser failure"); }',
    });
  });
  await expectLocalMarkdownFallback(
    "# Valid source after an unexpected parser failure",
  );
  expect(intercepted).toBe(true);
});

test("CSV defaults to a table, caps records and keeps formula/HTML cells inert", async () => {
  const content =
    'name,value\r\n"<img src=x>","=HYPERLINK(""https://preview.invalid"")"\r\n' +
    Array.from({ length: 500 }, (_, i) => `row${i},${i}`).join("\r\n");
  await load("csv", content);
  await expect(page.getByRole("table")).toBeVisible();
  await expect(
    page.getByText("Showing first 500 rows", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(500);
  await expect(
    page.getByRole("cell", { name: "<img src=x>", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#root img, #root a")).toHaveCount(0);
  await page.locator("#preview-source").click();
  expect(
    (await page.locator("[data-text-line]").allTextContents()).join(""),
  ).toBe(content);
});

test("wide CSV tables explain the column limit and preserve the full source", async () => {
  const content =
    "header,".repeat(100) + "last\n" + "value,".repeat(100) + "last";
  await load("csv", content);
  await expect(
    page.getByText(
      "Showing the first 100 columns. View Source or download the object to see all columns.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("columnheader")).toHaveCount(101);
  await expect(page.getByRole("cell")).toHaveCount(100);
  await page.locator("#preview-source").click();
  expect(
    (await page.locator("[data-text-line]").allTextContents()).join(""),
  ).toBe(content);
});

test("large logs show the range banner and virtualized line numbers with wrapping", async () => {
  const content = "hello\n".repeat(174763).slice(0, 1048576);
  await load("text", content, 2000000);
  await expect(
    page.getByText(
      "Showing the first 1 MiB. Download the object to see the full file.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Wrap lines" }),
  ).toBeChecked();
  await expect(page.locator(".lineNumber").first()).toHaveText("1");
  expect(await page.locator("[data-text-line]").count()).toBeLessThan(100);
  await page.getByRole("checkbox", { name: "Wrap lines" }).uncheck();
  await expect(page.locator("[data-text-line]").first()).toHaveCSS(
    "white-space",
    "pre",
  );
});

test("disabled actions explain themselves on hover and keyboard focus without enabling clicks", async () => {
  await load("text", "safe");
  const target = page.getByRole("group", { name: "Legal Hold" });
  const reason = "Object Lock is not enabled on this bucket.";
  await expect(page.locator("#disabled-action")).toBeDisabled();
  await expect(page.locator("#disabled-action")).toHaveAccessibleDescription(
    reason,
  );
  await target.hover();
  await expect(page.getByRole("tooltip")).toHaveText(reason);
  await page.mouse.move(0, 0);
  await target.focus();
  await expect(page.getByRole("tooltip")).toHaveText(reason);
  await expect(target).toHaveAccessibleDescription(reason);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});
