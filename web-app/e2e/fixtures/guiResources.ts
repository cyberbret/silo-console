// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "minio";
import type { APIRequestContext } from "@playwright/test";
import { guiCredentials, guiEnvironment } from "./guiEnvironment.ts";

export const guiDemo = {
  bucket: "demo-data",
  docsPrefix: "docs/",
  readme: {
    key: "docs/README.md",
    detailPath: "/browser/demo-data/docs%2FREADME.md",
    size: 17792,
  },
  user: "alice",
  builtin: "readwrite",
} as const;
export type PreviewKind =
  "markdown" | "text" | "csv" | "tsv" | "largeLog" | "html" | "xhtml";
export type PreviewObject = {
  key: string;
  detailPath: string;
  size: number;
  contentType: string;
  versionId?: string;
};
export type PreviewFixture = {
  bucket: string;
  objects: Record<PreviewKind, PreviewObject>;
  expected: {
    markdownHeading: string;
    csvRows: number;
    csvColumns: number;
    text: string;
  };
};

type Resource = {
  kind: "bucket" | "user" | "group" | "policy" | "binding" | "membership";
  name: string;
  user?: string;
  group?: string;
};
type Entry = {
  at: string;
  scope: string;
  event: string;
  resource?: Resource;
  [key: string]: unknown;
};
const fixtureDir = () => join(guiEnvironment().artifacts, "fixtures");
export function recordFixture(
  scope: string,
  event: string,
  fields: Record<string, unknown> = {},
) {
  mkdirSync(fixtureDir(), { recursive: true, mode: 0o700 });
  appendFileSync(
    join(fixtureDir(), "journal.jsonl"),
    JSON.stringify({ at: new Date().toISOString(), scope, event, ...fields }) +
      "\n",
    { mode: 0o600 },
  );
}
function entries(): Entry[] {
  const path = join(fixtureDir(), "journal.jsonl");
  return existsSync(path)
    ? readFileSync(path, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
}
export function s3Client() {
  const endpoint = guiEnvironment().s3Endpoint;
  if (!endpoint)
    throw new Error(
      "GUI_E2E_S3_ENDPOINT is required for GUI preflight and owned resources",
    );
  const url = new URL(endpoint),
    credentials = guiCredentials("admin");
  return new Client({
    endPoint: url.hostname,
    port: Number(url.port || (url.protocol === "https:" ? 443 : 80)),
    useSSL: url.protocol === "https:",
    accessKey: credentials.username,
    secretKey: credentials.password,
  });
}
function mcli(...args: string[]) {
  const config = join(fixtureDir(), "mcli-config");
  mkdirSync(config, { recursive: true, mode: 0o700 });
  const run = (command: string[]) => {
    try {
      return execFileSync(
        "mcli",
        ["--config-dir", config, "--json", ...command],
        { encoding: "utf8", timeout: 30000, maxBuffer: 4 * 1024 * 1024 },
      );
    } catch {
      // execFileSync's default error includes argv, which can contain credentials.
      throw new Error(
        `mcli ${command.slice(0, 2).join(" ")} failed; private resource journal retains the intended operation`,
      );
    }
  };
  if (!existsSync(join(config, "config.json"))) {
    const { username, password } = guiCredentials("admin");
    run([
      "alias",
      "set",
      "t23gui",
      guiEnvironment().s3Endpoint!,
      username,
      password,
    ]);
  }
  return run(args);
}
export async function readJSON(request: APIRequestContext, path: string) {
  const response = await request.get(`${guiEnvironment().url}/api/v1${path}`);
  const body = await response.text();
  assert.equal(
    response.status(),
    200,
    `GET ${path}: ${response.status()} ${body}`,
  );
  return JSON.parse(body);
}
export async function policySnapshot(
  request: APIRequestContext,
  name = "writeonly",
) {
  // Full inventory reads may rehydrate default-policy caches on the backend.
  // Call only for prerequisites or AFTER the actual page's immediate GET and
  // explicit UI recovery have succeeded. Never use this as Reset readiness.
  const [detail, list, users, groups] = await Promise.all([
    readJSON(request, `/policy/${encodeURIComponent(name)}`),
    readJSON(request, "/policies"),
    readJSON(request, `/policies/${encodeURIComponent(name)}/users`),
    readJSON(request, `/policies/${encodeURIComponent(name)}/groups`),
  ]);
  return {
    detail,
    inventory: list.policies.sort((a: { name: string }, b: { name: string }) =>
      a.name.localeCompare(b.name),
    ),
    users,
    groups,
  };
}
export function canonicalPolicySnapshot(
  snapshot: Awaited<ReturnType<typeof policySnapshot>>,
  name = "writeonly",
) {
  return {
    ...snapshot,
    inventory: snapshot.inventory.map(
      (item: { name: string; policy: string }) => {
        if (item.name === name) return item;
        const policy = JSON.parse(item.policy);
        // Go policy sets can serialize in either order. Keep the target policy
        // byte-exact; only normalize set order in unrelated inventory entries.
        for (const statement of policy.Statement || [])
          for (const field of ["Action", "Resource"])
            if (Array.isArray(statement[field])) statement[field].sort();
        return { ...item, policy };
      },
    ),
  };
}
export async function demoPreflight(request: APIRequestContext) {
  const client = s3Client();
  const docs: { name?: string; size?: number }[] = [];
  for await (const object of client.listObjectsV2(
    guiDemo.bucket,
    guiDemo.docsPrefix,
    true,
  ))
    docs.push({ name: object.name, size: object.size });
  assert.equal(
    docs.length,
    9,
    "The preserved T21 docs contract requires exactly nine existing objects",
  );
  assert.equal(
    docs.find((item) => item.name === guiDemo.readme.key)?.size,
    guiDemo.readme.size,
  );
  const [alice, bob, snapshot, info] = await Promise.all([
    readJSON(request, "/user/alice"),
    readJSON(request, "/user/bob"),
    policySnapshot(request, guiDemo.builtin),
    readJSON(request, "/admin/info?defaultOnly=true"),
  ]);
  assert.equal(snapshot.detail.builtin, true);
  assert.equal(snapshot.detail.modified, false);
  const target = snapshot.inventory.find(
    (item: { name: string }) => item.name === guiDemo.builtin,
  );
  assert.ok(Number.isInteger(target?.userCount));
  assert.ok(Number.isInteger(target?.groupCount));
  const manifest = {
    captured: new Date().toISOString(),
    ...guiDemo,
    docs,
    accounts: { alice, bob },
    builtin: snapshot,
    backend: {
      serverCount: info.servers?.length,
      bucketCount: info.buckets,
    },
  };
  mkdirSync(fixtureDir(), { recursive: true, mode: 0o700 });
  writeFileSync(
    join(fixtureDir(), "demo-preflight.json"),
    JSON.stringify(manifest, null, 2),
    { mode: 0o600 },
  );
  return manifest;
}

function assertOwned(resource: Resource) {
  for (const name of [resource.name, resource.user, resource.group].filter(
    Boolean,
  ) as string[])
    assert.match(
      name,
      /^e2e-t23-[a-z0-9-]+$/,
      "Refusing cleanup of an unowned resource",
    );
}
const resourceKey = (resource: Resource) => JSON.stringify(resource);
// Interruption cleanup never uses an inventory read to conceal a failed
// post-Reset detail read. Reconciliation is separate from test acceptance.
export async function reconcileBuiltin(): Promise<{
  pending: boolean;
  restored: boolean;
  error?: string;
}> {
  const journal = entries();
  const start = journal.findLast((item) => item.event === "builtin-before");
  if (
    !start ||
    journal.some(
      (item) =>
        item.scope === start.scope &&
        ["builtin-restored", "builtin-cleanup-restored"].includes(item.event),
    )
  )
    return { pending: false, restored: true };
  const { request } = await import("@playwright/test");
  const context = await request.newContext({
    storageState: guiEnvironment().auth,
  });
  try {
    const before = JSON.parse(readFileSync(String(start.beforePath), "utf8"));
    const relevant = journal.filter((item) => item.scope === start.scope);
    let response = await context.get(
      `${guiEnvironment().url}/api/v1/policy/writeonly`,
    );
    let body = await response.text();
    recordFixture(start.scope, "builtin-cleanup-detail", {
      status: response.status(),
      body,
    });
    assert.ok(
      !relevant.some((item) => item.event === "builtin-save-intent") ||
        relevant.some((item) => item.event === "builtin-save-confirmed"),
      "Unconfirmed Save remains uncertain even when a read currently shows the default; retain the lock for coordinator disposition",
    );
    assert.equal(
      response.status(),
      200,
      "Builtin cleanup cannot infer restoration from a failed detail read",
    );
    let detail = JSON.parse(body);
    if (detail.modified) {
      const confirmed = relevant.some(
        (item) => item.event === "builtin-save-confirmed",
      );
      const resetAttempted = relevant.some((item) =>
        ["builtin-reset-intent", "builtin-compensating-reset-intent"].includes(
          item.event,
        ),
      );
      assert.ok(
        confirmed && !resetAttempted,
        "Never repeat an attempted reset or compensate an unconfirmed write",
      );
      const saved = relevant.find(
        (item) => item.event === "builtin-save-intent",
      );
      assert.deepEqual(
        JSON.parse(detail.policy),
        saved?.draft,
        "Builtin changed outside the recorded override",
      );
      recordFixture(start.scope, "builtin-compensating-reset-intent", {
        name: "writeonly",
        reason: "interrupted confirmed override",
      });
      const reset = await context.delete(
        `${guiEnvironment().url}/api/v1/policy/writeonly`,
      );
      recordFixture(start.scope, "builtin-compensating-reset-result", {
        status: reset.status(),
      });
      assert.equal(reset.status(), 204);
      response = await context.get(
        `${guiEnvironment().url}/api/v1/policy/writeonly`,
      );
      body = await response.text();
      recordFixture(start.scope, "builtin-cleanup-immediate", {
        status: response.status(),
        body,
      });
      assert.equal(
        response.status(),
        200,
        "Compensation detail failed; explicit UI reconciliation is required",
      );
      detail = JSON.parse(body);
    }
    assert.deepEqual(detail, before.detail);
    const after = await policySnapshot(context);
    assert.deepEqual(
      canonicalPolicySnapshot(after),
      canonicalPolicySnapshot(before),
    );
    recordFixture(start.scope, "builtin-cleanup-restored", {
      originalTestResultUnchanged: true,
    });
    return { pending: true, restored: true };
  } catch (error) {
    recordFixture(start.scope, "builtin-cleanup-error", {
      error: String(error),
    });
    return { pending: true, restored: false, error: String(error) };
  } finally {
    await context.dispose();
  }
}

async function iamPresent(
  request: APIRequestContext,
  resource: Resource,
): Promise<boolean> {
  if (resource.kind === "user")
    return (await readJSON(request, "/users")).users.some(
      (user: { accessKey: string }) => user.accessKey === resource.name,
    );
  if (resource.kind === "group" || resource.kind === "membership") {
    if (!(await readJSON(request, "/groups")).groups.includes(resource.name))
      return false;
    return (
      resource.kind === "group" ||
      (
        (await readJSON(request, `/group/${encodeURIComponent(resource.name)}`))
          .members ?? []
      ).includes(resource.user)
    );
  }
  if (
    !(await readJSON(request, "/policies")).policies.some(
      (policy: { name: string }) => policy.name === resource.name,
    )
  )
    return false;
  if (resource.kind === "policy") return true;
  const entities = await readJSON(
    request,
    `/policies/${encodeURIComponent(resource.name)}/${resource.user ? "users" : "groups"}`,
  );
  return entities.includes(resource.user || resource.group);
}

export async function cleanupResources(scope?: string) {
  const builtin = !scope ? await reconcileBuiltin() : undefined;
  const journal = entries();
  const completed = new Set(
    journal
      .filter((item) => item.event === "cleaned")
      .map((item) => resourceKey(item.resource!)),
  );
  const unique = [
    ...new Map(
      journal
        .filter(
          (item) =>
            item.event === "intent" &&
            item.resource &&
            (!scope || item.scope === scope),
        )
        .map((item) => [
          resourceKey(item.resource!),
          { scope: item.scope, resource: item.resource! },
        ]),
    ).values(),
  ];
  const rank: Record<Resource["kind"], number> = {
    binding: 0,
    membership: 1,
    group: 2,
    user: 3,
    policy: 4,
    bucket: 5,
  };
  unique.sort((a, b) => rank[a.resource.kind] - rank[b.resource.kind]);
  const client = unique.some((item) => item.resource.kind === "bucket")
    ? s3Client()
    : undefined;
  const request = unique.some((item) => item.resource.kind !== "bucket")
    ? await (
        await import("@playwright/test")
      ).request.newContext({ storageState: guiEnvironment().auth })
    : undefined;
  const failures: { resource: Resource; error: string }[] = [];
  try {
    for (const { resource, scope: owner } of unique) {
      try {
        assertOwned(resource);
        const exists =
          resource.kind === "bucket"
            ? await client!.bucketExists(resource.name)
            : await iamPresent(request!, resource);
        if (completed.has(resourceKey(resource))) {
          assert.equal(
            exists,
            false,
            "A previously cleaned identity reappeared; do not adopt it",
          );
          continue;
        }
        recordFixture(owner, "cleanup-start", { resource, exists });
        if (exists && resource.kind === "bucket") {
          const versions: { name: string; versionId: string }[] = [];
          for await (const object of client!.listObjects(
            resource.name,
            "",
            true,
            { IncludeVersion: true },
          )) {
            assert.ok(object.name);
            versions.push({
              name: object.name,
              versionId: object.versionId || "null",
            });
          }
          recordFixture(owner, "versions-before-cleanup", {
            resource,
            versions,
          });
          for (let index = 0; index < versions.length; index += 1000) {
            const batch = versions.slice(index, index + 1000);
            recordFixture(owner, "delete-versions-intent", {
              resource,
              versions: batch,
            });
            const errors = (
              await client!.removeObjects(resource.name, batch)
            ).filter((item) => item?.Error);
            recordFixture(owner, "delete-versions-result", {
              resource,
              errors,
            });
            assert.deepEqual(
              errors,
              [],
              "Exact version deletion returned per-object errors",
            );
          }
          const remaining = [];
          for await (const object of client!.listObjects(
            resource.name,
            "",
            true,
            { IncludeVersion: true },
          ))
            remaining.push(object);
          assert.deepEqual(
            remaining,
            [],
            "Every version and delete marker must be gone before bucket removal",
          );
          recordFixture(owner, "remove-empty-bucket-intent", { resource });
          await client!.removeBucket(resource.name);
          assert.equal(await client!.bucketExists(resource.name), false);
        } else if (exists) {
          if (resource.kind === "binding")
            mcli(
              "admin",
              "policy",
              "detach",
              "t23gui",
              resource.name,
              resource.user ? "--user" : "--group",
              resource.user || resource.group!,
            );
          else if (resource.kind === "membership")
            mcli(
              "admin",
              "group",
              "remove",
              "t23gui",
              resource.name,
              resource.user!,
            );
          else if (resource.kind === "group")
            mcli("admin", "group", "remove", "t23gui", resource.name);
          else if (resource.kind === "user")
            mcli("admin", "user", "remove", "t23gui", resource.name);
          else mcli("admin", "policy", "remove", "t23gui", resource.name);
          assert.equal(
            await iamPresent(request!, resource),
            false,
            "Owned IAM identity or mapping survived cleanup",
          );
        }
        recordFixture(owner, "cleaned", { resource, alreadyAbsent: !exists });
      } catch (error) {
        const failure = { resource, error: String(error) };
        failures.push(failure);
        recordFixture(owner, "cleanup-error", failure);
      }
    }
  } finally {
    await request?.dispose();
  }
  if (!scope)
    writeFileSync(
      join(fixtureDir(), "cleanup.json"),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          resources: unique.length,
          failures,
          complete: failures.length === 0 && builtin?.restored !== false,
          builtin,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
  assert.deepEqual(
    failures,
    [],
    "Cleanup failed; independent owned identities were still reconciled",
  );
  assert.notEqual(
    builtin?.restored,
    false,
    "Builtin restoration is unproven; stop the campaign",
  );
}
export class OwnedResources {
  scope: string;
  constructor(scope: string) {
    this.scope = scope;
  }
  private name(label: string) {
    const test = createHash("sha256")
      .update(this.scope)
      .digest("hex")
      .slice(0, 5);
    return `e2e-t23-${guiEnvironment().runId}-${test}-${label}-${randomBytes(3).toString("hex")}`;
  }
  private create(resource: Resource, args: string[]) {
    assertOwned(resource);
    recordFixture(this.scope, "intent", { resource });
    mcli(...args);
    recordFixture(this.scope, "created", { resource });
  }
  async buckets(count: number): Promise<readonly string[]> {
    assert.ok(Number.isInteger(count) && count > 0 && count <= 6);
    const client = s3Client(),
      names: string[] = [];
    for (let index = 0; index < count; index++) {
      const name = this.name(`b${index}`);
      assert.equal(
        await client.bucketExists(name),
        false,
        "Generated resource name collision",
      );
      this.create({ kind: "bucket", name }, ["mb", `t23gui/${name}`]);
      assert.equal(await client.bucketExists(name), true);
      names.push(name);
    }
    return names;
  }
  async preview(): Promise<PreviewFixture> {
    const [bucket] = await this.buckets(1),
      client = s3Client();
    recordFixture(this.scope, "versioning-intent", { bucket });
    mcli("version", "enable", `t23gui/${bucket}`);
    const header = Array.from(
      { length: 102 },
      (_, index) => `column${index}`,
    ).join(",");
    const csv =
      header +
      "\n" +
      Array.from({ length: 505 }, (_, row) =>
        Array.from({ length: 102 }, (_, col) =>
          col === 0
            ? `row-${row}`
            : col === 1
              ? "=1+1"
              : col === 2
                ? "<b>literal html</b>"
                : `v${row}-${col}`,
        ).join(","),
      ).join("\n");
    const text =
      "Plain text without an extension: 中文 %2F\n" +
      "long unbroken line ".repeat(30) +
      "\nsecond line\n";
    const inputs: Record<PreviewKind, [string, string, string]> = {
      markdown: [
        "docs/中文%2F note.md",
        "text/markdown",
        "# GUI preview fixture\n\n**strong text**\n\n<script>globalThis.t23Injected = true</script>\n\n![remote](https://example.invalid/t23-remote.png)\n",
      ],
      text: ["docs/无扩展%2F", "text/plain", text],
      csv: ["tables/data.csv", "text/csv", csv],
      tsv: [
        "tables/data.tsv",
        "text/tab-separated-values",
        "name\tvalue\nalpha\t=1+1\nbeta\t42\n",
      ],
      largeLog: [
        "logs/large.log",
        "text/plain",
        "bounded log line 0123456789\n".repeat(50000),
      ],
      html: [
        "unsafe/page.html",
        "text/html",
        "<h1>Blocked HTML</h1><script>globalThis.t23Injected=true</script>",
      ],
      xhtml: [
        "unsafe/page.xhtml",
        "application/xhtml+xml",
        '<html xmlns="http://www.w3.org/1999/xhtml"><body>Blocked XHTML</body></html>',
      ],
    };
    const objects = {} as Record<PreviewKind, PreviewObject>;
    for (const kind of Object.keys(inputs) as PreviewKind[]) {
      const [key, contentType, content] = inputs[kind];
      const file = join(fixtureDir(), `${bucket}-${kind}`);
      writeFileSync(file, content, { mode: 0o600 });
      recordFixture(this.scope, "put-intent", {
        bucket,
        key,
        size: Buffer.byteLength(content),
        sourceSHA256: createHash("sha256")
          .update(content, "utf8")
          .digest("hex"),
      });
      mcli(
        "cp",
        "--attr",
        `Content-Type=${contentType}`,
        file,
        `t23gui/${bucket}/${key}`,
      );
      const stat = await client.statObject(bucket, key);
      assert.equal(
        stat.size,
        Buffer.byteLength(content),
        "Uploaded size must equal the exact UTF-8 fixture bytes",
      );
      assert.ok(
        stat.versionId && stat.versionId !== "null",
        "Preview fixture must have a genuine version ID",
      );
      objects[kind] = {
        key,
        detailPath: `/browser/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`,
        size: stat.size,
        contentType,
        versionId: stat.versionId,
      };
      recordFixture(this.scope, "put-confirmed", { bucket, ...objects[kind] });
    }
    return {
      bucket,
      objects,
      expected: {
        markdownHeading: "GUI preview fixture",
        csvRows: 505,
        csvColumns: 102,
        text,
      },
    };
  }
  async iam(request: APIRequestContext) {
    const policy = this.name("p"),
      user = this.name("u"),
      group = this.name("g");
    const [policies, users, groups] = await Promise.all([
      readJSON(request, "/policies"),
      readJSON(request, "/users"),
      readJSON(request, "/groups"),
    ]);
    assert.ok(!JSON.stringify({ policies, users, groups }).includes(policy));
    assert.ok(!JSON.stringify({ policies, users, groups }).includes(user));
    assert.ok(!JSON.stringify({ policies, users, groups }).includes(group));
    const file = join(fixtureDir(), `${policy}.json`);
    writeFileSync(
      file,
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["s3:ListBucket"],
            Resource: ["arn:aws:s3:::demo-data"],
          },
        ],
      }),
      { mode: 0o600 },
    );
    this.create({ kind: "policy", name: policy }, [
      "admin",
      "policy",
      "create",
      "t23gui",
      policy,
      file,
    ]);
    this.create({ kind: "user", name: user }, [
      "admin",
      "user",
      "add",
      "t23gui",
      user,
      randomBytes(24).toString("hex"),
    ]);
    recordFixture(this.scope, "intent", {
      resource: { kind: "group", name: group },
    });
    this.create({ kind: "membership", name: group, user }, [
      "admin",
      "group",
      "add",
      "t23gui",
      group,
      user,
    ]);
    this.create({ kind: "binding", name: policy, user }, [
      "admin",
      "policy",
      "attach",
      "t23gui",
      policy,
      "--user",
      user,
    ]);
    this.create({ kind: "binding", name: policy, group }, [
      "admin",
      "policy",
      "attach",
      "t23gui",
      policy,
      "--group",
      group,
    ]);
    return { policy, user, group };
  }
  async cleanup() {
    await cleanupResources(this.scope);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv[2] !== "cleanup") throw new Error("Expected cleanup");
  mkdirSync(fixtureDir(), { recursive: true, mode: 0o700 });
  await cleanupResources();
}
