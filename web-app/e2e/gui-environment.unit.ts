// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { test, expect } from "@playwright/test";
import {
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { externalDirectory, guiEnvironment } from "./fixtures/guiEnvironment";
import {
  canonicalPolicySnapshot,
  reconcileBuiltin,
  recordFixture,
} from "./fixtures/guiResources";

test.describe.configure({ mode: "default" });
let directory: string;
const keys = [
  "CONSOLE_URL",
  "GUI_E2E_ARTIFACTS",
  "GUI_E2E_SCREENSHOTS",
  "GUI_E2E_BASELINES",
  "GUI_E2E_RUN_ID",
  "GUI_E2E_S3_ENDPOINT",
  "VISUAL",
  "GUI_UNIT_DIRECTORY",
];
let previous: Record<string, string | undefined>;
test.beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "silo-gui-path-"));
  previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    CONSOLE_URL: "http://127.0.0.1:19330",
    GUI_E2E_ARTIFACTS: join(directory, "artifacts"),
    GUI_E2E_SCREENSHOTS: join(directory, "screens"),
    GUI_E2E_RUN_ID: "unit",
    VISUAL: "0",
  });
  delete process.env.GUI_E2E_S3_ENDPOINT;
});
test.afterEach(() => {
  for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
  rmSync(directory, { recursive: true, force: true });
});

test("external artifact path rejects checkout descendants even before creation", () => {
  const checkout = join(directory, "checkout");
  mkdirSync(join(checkout, ".git"), { recursive: true });
  process.env.GUI_UNIT_DIRECTORY = join(checkout, "new", "results");
  expect(() => externalDirectory("GUI_UNIT_DIRECTORY")).toThrow(
    /outside every Git checkout/,
  );
});
test("external artifact path resolves a symlink ancestor before checking checkout ownership", () => {
  const checkout = join(directory, "checkout");
  mkdirSync(join(checkout, ".git"), { recursive: true });
  symlinkSync(checkout, join(directory, "innocent-link"));
  process.env.GUI_UNIT_DIRECTORY = join(
    directory,
    "innocent-link",
    "new",
    "results",
  );
  expect(() => externalDirectory("GUI_UNIT_DIRECTORY")).toThrow(
    /outside every Git checkout/,
  );
});
test("external path accepts a new nested sibling without requiring premature writes", () => {
  process.env.GUI_UNIT_DIRECTORY = join(directory, "new", "nested");
  expect(externalDirectory("GUI_UNIT_DIRECTORY")).toBe(
    join(realpathSync(directory), "new", "nested"),
  );
  process.env.GUI_UNIT_DIRECTORY = "relative/results";
  expect(() => externalDirectory("GUI_UNIT_DIRECTORY")).toThrow(
    /absolute external/,
  );
});
test("artifact, screenshot and baseline destinations cannot overlap", () => {
  process.env.GUI_E2E_SCREENSHOTS = join(directory, "artifacts", "screens");
  expect(() => guiEnvironment()).toThrow(/separate directories/);
  process.env.GUI_E2E_SCREENSHOTS = join(directory, "screens");
  process.env.VISUAL = "1";
  process.env.GUI_E2E_BASELINES = join(directory, "screens", "baseline");
  expect(() => guiEnvironment()).toThrow(/separate directories/);
});
test("origin credentials and resource path traversal fail before fixture setup", () => {
  process.env.CONSOLE_URL = "http://secret:password@127.0.0.1:19330";
  expect(() => guiEnvironment()).toThrow(/without credentials/);
  process.env.CONSOLE_URL = "http://127.0.0.1:19330";
  process.env.GUI_E2E_RUN_ID = "../existing";
  expect(() => guiEnvironment()).toThrow(/1–28/);
});

test("restoration comparison normalizes only non-target action order, preserving exact target bytes and attachments", () => {
  const target = {
    name: "writeonly",
    builtin: true,
    modified: false,
    policy: '{"Statement":[{"Action":["s3:PutObject"]}]}',
  };
  const first = {
    detail: target,
    inventory: [
      target,
      { name: "other", policy: '{"Statement":[{"Action":["b","a"]}]}' },
    ],
    users: [],
    groups: [],
  };
  const equivalent = structuredClone(first);
  equivalent.inventory[1].policy = '{"Statement":[{"Action":["a","b"]}]}';
  expect(canonicalPolicySnapshot(equivalent)).toEqual(
    canonicalPolicySnapshot(first),
  );
  const changedTarget = structuredClone(first);
  changedTarget.detail.policy = ' {"Statement":[{"Action":["s3:PutObject"]}]}';
  expect(canonicalPolicySnapshot(changedTarget)).not.toEqual(
    canonicalPolicySnapshot(first),
  );
  const changedAttachment = { ...first, users: ["unexpected-user"] };
  expect(canonicalPolicySnapshot(changedAttachment)).not.toEqual(
    canonicalPolicySnapshot(first),
  );
});

for (const scenario of [
  "unconfirmed",
  "changed",
  "reset-attempted",
  "confirmed",
] as const)
  test(`builtin cleanup reconciles ${scenario} Save without repeating an uncertain write`, async () => {
    const original = {
      name: "writeonly",
      builtin: true,
      modified: false,
      policy: '{"Statement":[{"Action":["s3:PutObject"]}]}',
    };
    const draft = {
      Statement: [{ Action: ["s3:PutObject"], Sid: "OwnedProbe" }],
    };
    let current =
      scenario === "unconfirmed"
        ? original
        : {
            ...original,
            modified: true,
            policy: JSON.stringify(
              scenario === "changed" ? { Statement: [] } : draft,
            ),
          };
    const requests: string[] = [];
    const server = createServer((request, response) => {
      requests.push(`${request.method} ${request.url}`);
      response.setHeader("Content-Type", "application/json");
      if (request.method === "DELETE") {
        current = original;
        response.writeHead(204);
        response.end();
        return;
      }
      response.end(
        JSON.stringify(
          request.url === "/api/v1/policies"
            ? { policies: [original] }
            : request.url?.endsWith("/users") ||
                request.url?.endsWith("/groups")
              ? []
              : current,
        ),
      );
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    try {
      const address = server.address();
      expect(address && typeof address !== "string").toBeTruthy();
      process.env.CONSOLE_URL = `http://127.0.0.1:${(address as { port: number }).port}`;
      const env = guiEnvironment();
      mkdirSync(join(env.artifacts, "auth"), { recursive: true });
      writeFileSync(env.auth, JSON.stringify({ cookies: [], origins: [] }));
      const beforePath = join(directory, "before.json");
      writeFileSync(
        beforePath,
        JSON.stringify({
          detail: original,
          inventory: [original],
          users: [],
          groups: [],
        }),
      );
      recordFixture("controlled-cleanup", "builtin-before", {
        name: "writeonly",
        beforePath,
      });
      recordFixture("controlled-cleanup", "builtin-save-intent", {
        name: "writeonly",
        draft,
      });
      if (scenario !== "unconfirmed")
        recordFixture("controlled-cleanup", "builtin-save-confirmed", {
          status: 201,
        });
      if (scenario === "reset-attempted")
        recordFixture("controlled-cleanup", "builtin-reset-intent", {
          name: "writeonly",
        });
      const result = await reconcileBuiltin();
      expect(result.restored).toBe(scenario === "confirmed");
      expect(
        requests.filter((request) => request.startsWith("DELETE")),
      ).toHaveLength(scenario === "confirmed" ? 1 : 0);
      if (scenario !== "confirmed")
        expect(requests).toEqual(["GET /api/v1/policy/writeonly"]);
      await reconcileBuiltin();
      expect(
        requests.filter((request) => request.startsWith("DELETE")),
      ).toHaveLength(scenario === "confirmed" ? 1 : 0);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
