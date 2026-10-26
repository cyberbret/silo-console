// Copyright (c) 2026 PGSTY
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test, expect } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { chmod, readFile } from "node:fs/promises";
import { Client } from "minio";
import { minioadminFile, SERVER_ENDPOINT } from "./consts";

// Credentials must not end up in traces or screenshots on failure.
test.use({
  storageState: minioadminFile,
  trace: "off",
  screenshot: "off",
  video: "off",
});

for (const [kind, secretKey] of [
  ["plain", "ConsolePlainSecret2026"],
  ["hash", "Console#HashSecret2026"],
  ["percent-41", "Console%41PercentSecret2026"],
  ["percent-2F", "Console%2FSlashSecret2026"],
  ["unicode", "Console中文Secret2026"],
  ["json-escapes", 'Console"quote\\Secret2026'],
]) {
  test(`downloaded ${kind} credentials preserve bytes and authenticate`, async ({
    page,
  }, testInfo) => {
    const accessKey = `export-${randomUUID().slice(0, 12)}`;
    let created = false;
    const receipts: object[] = [];
    try {
      await page.goto(`${SERVER_ENDPOINT}/access-keys/new-account`);
      await page.locator("#accessKey").fill(accessKey);
      await page.locator("#secretKey").fill(secretKey);
      const creating = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/v1/service-account-credentials") &&
          response.request().method() === "POST",
      );
      await page.locator("#create-sa").click();
      const response = await creating;
      expect(response.status()).toBe(201);
      created = true;
      const credentials = await response.json();
      expect(
        credentials.accessKey === accessKey &&
          credentials.secretKey === secretKey,
      ).toBe(true);
      const expected = Buffer.from(
        JSON.stringify({
          url: credentials.url,
          accessKey,
          secretKey,
          api: "s3v4",
          path: "auto",
        }),
      );
      const authenticate = async (exported: typeof credentials) => {
        const endpoint = new URL(exported.url);
        const client = new Client({
          endPoint: endpoint.hostname,
          port: Number(
            endpoint.port || (endpoint.protocol === "https:" ? 443 : 80),
          ),
          useSSL: endpoint.protocol === "https:",
          accessKey: exported.accessKey,
          secretKey: exported.secretKey,
        });
        return Array.isArray(await client.listBuckets());
      };
      expect(await authenticate(credentials)).toBe(true);
      // Consecutive downloads also cover retained modal state and filename.
      for (let repeat = 0; repeat < 2; repeat++) {
        const downloading = page.waitForEvent("download");
        await page.locator("#download-button").click();
        const download = await downloading;
        try {
          expect(download.suggestedFilename()).toBe("credentials.json");
          const path = (await download.path())!;
          await chmod(path, 0o600);
          const raw = await readFile(path);
          expect(
            raw.equals(expected),
            "exported UTF-8 bytes must match the created credentials",
          ).toBe(true);
          const parsed = JSON.parse(raw.toString("utf8"));
          expect(
            Buffer.from(parsed.secretKey).equals(Buffer.from(secretKey)),
          ).toBe(true);
          expect(await authenticate(parsed)).toBe(true);
          receipts.push({
            repeat,
            bytes: raw.length,
            sha256: createHash("sha256").update(raw).digest("hex"),
            authenticated: true,
          });
        } finally {
          await download.delete();
        }
      }
      await testInfo.attach("credential-export-receipts", {
        body: JSON.stringify({ kind, receipts }),
        contentType: "application/json",
      });
    } finally {
      if (created) {
        const cleanup = await page.request.delete(
          `${SERVER_ENDPOINT}/api/v1/service-accounts/${accessKey}`,
        );
        expect(cleanup.status()).toBe(204);
      }
    }
  });
}
