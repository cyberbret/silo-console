// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import {
  shQuote,
  createBucketCommands,
  bucketVersioningCommands,
  bucketQuotaCommands,
  bucketTagsCommands,
  bucketAnonymousCommands,
  bucketAccessPolicyCommands,
  bucketAccessPolicyJSON,
  lifecycleRuleCommands,
  bucketEventCommands,
  createUserCommands,
  createGroupCommands,
  setPoliciesCommands,
  createPolicyCommands,
  createAccessKeyCommands,
} from "../src/common/mcli/commands";

// Exercise actual POSIX shell parsing without running mcli or needing a server.
const argv = (command: string): string[] =>
  execFileSync("/bin/sh", ["-c", `printf '%s\\0' ${command}`], {
    encoding: "utf8",
  })
    .split("\0")
    .slice(0, -1);

for (const value of [
  "",
  "simple",
  "operator's files",
  "'",
  "a\nb",
  "中文 / + &=",
  "$(printf injected); `printf injected` $HOME * ! \\",
]) {
  test(`shQuote preserves one literal argument: ${JSON.stringify(value)}`, () => {
    expect(argv(shQuote(value))).toEqual([value]);
    expect(shQuote(value).startsWith("'")).toBe(true);
    expect(shQuote(value).endsWith("'")).toBe(true);
  });
}

test("shQuote uses the portable single quote escape", () => {
  expect(shQuote("it's")).toBe("'it'\\''s'");
});

test("create bucket includes lock, versioning, quota and default retention in order", () => {
  expect(
    createBucketCommands({
      name: "archive",
      objectLock: true,
      versioning: true,
      quota: "10Gi",
      retention: { mode: "GOVERNANCE", validity: 30, unit: "days" },
    }),
  ).toEqual([
    "mcli mb --with-lock --with-versioning -- 'ALIAS/archive'",
    "mcli quota set --size '10Gi' -- 'ALIAS/archive'",
    "mcli retention set --default -- governance '30d' 'ALIAS/archive'",
  ]);
});

test("create bucket handles empty input, optional fields, exclusions and years", () => {
  expect(createBucketCommands({ name: "" })).toEqual([]);
  expect(
    createBucketCommands({
      name: "plain",
      quota: "",
      retention: { mode: "COMPLIANCE", validity: 3, unit: "years" },
    }),
  ).toEqual(["mcli mb -- 'ALIAS/plain'"]);
  expect(
    createBucketCommands({
      name: "locked",
      objectLock: true,
      retention: { mode: "COMPLIANCE", validity: 3, unit: "years" },
    })[1],
  ).toContain("compliance '3y'");
  expect(
    createBucketCommands({
      name: "versioned",
      versioning: true,
      excludeFolders: true,
      excludedPrefixes: "tmp/,",
    })[1],
  ).toBe(
    "mcli version enable --exclude-folders --excluded-prefixes 'tmp/' -- 'ALIAS/versioned'",
  );
  expect(
    createBucketCommands({
      name: "locked",
      objectLock: true,
      versioning: true,
      excludeFolders: true,
      excludedPrefixes: "tmp/",
    }),
  ).toHaveLength(1);
  expect(
    argv(createBucketCommands({ name: "name'; $(printf nope)" })[0]),
  ).toEqual(["mcli", "mb", "--", "ALIAS/name'; $(printf nope)"]);
});

test("versioning enables exclusions and suspends without stale options", () => {
  const input = {
    bucket: "bucket",
    enabled: true,
    excludeFolders: true,
    excludedPrefixes: "operator's/,中文/, ,",
  };
  expect(argv(bucketVersioningCommands(input)[0])).toEqual([
    "mcli",
    "version",
    "enable",
    "--exclude-folders",
    "--excluded-prefixes",
    "operator's/,中文/",
    "--",
    "ALIAS/bucket",
  ]);
  expect(bucketVersioningCommands({ ...input, enabled: false })).toEqual([
    "mcli version suspend -- 'ALIAS/bucket'",
  ]);
  expect(bucketVersioningCommands({ bucket: "bucket", enabled: true })).toEqual(
    ["mcli version enable -- 'ALIAS/bucket'"],
  );
  expect(bucketVersioningCommands({ bucket: "", enabled: false })).toEqual([]);
});

test("quota sets exact units or clears, and waits for a size", () => {
  expect(
    bucketQuotaCommands({ bucket: "bucket", enabled: true, size: "1.25Ti" }),
  ).toEqual(["mcli quota set --size '1.25Ti' -- 'ALIAS/bucket'"]);
  expect(
    bucketQuotaCommands({ bucket: "bucket", enabled: false, size: "99Gi" }),
  ).toEqual(["mcli quota clear -- 'ALIAS/bucket'"]);
  expect(
    bucketQuotaCommands({ bucket: "bucket", enabled: true, size: "" }),
  ).toEqual([]);
  expect(bucketQuotaCommands({ bucket: "", enabled: false })).toEqual([]);
});

test("tags preserve all existing tags and URL-escape query delimiters before shell quoting", () => {
  const tags = {
    env: "prod",
    "key&=+": "operator's & 中文 + = % $(printf nope)",
    empty: "",
  };
  const args = argv(bucketTagsCommands("bucket", tags)[0]);
  expect(args.slice(0, 5)).toEqual([
    "mcli",
    "tag",
    "set",
    "--",
    "ALIAS/bucket",
  ]);
  expect(Object.fromEntries(new URLSearchParams(args[5]))).toEqual(tags);
  expect(bucketTagsCommands("bucket", { k: "v", k2: "v2" })).toEqual([
    "mcli tag set -- 'ALIAS/bucket' 'k=v&k2=v2'",
  ]);
  expect(bucketTagsCommands("bucket", {})).toEqual([
    "mcli tag remove -- 'ALIAS/bucket'",
  ]);
  expect(bucketTagsCommands("", tags)).toEqual([]);
});

for (const [access, permission] of [
  ["readonly", "download"],
  ["writeonly", "upload"],
  ["readwrite", "public"],
  ["none", "none"],
]) {
  test(`anonymous ${access} uses ${permission}`, () => {
    expect(bucketAnonymousCommands({ bucket: "bucket", access })).toEqual([
      `mcli anonymous -- set ${permission} 'ALIAS/bucket'`,
    ]);
  });
}

test("anonymous prefixes stay literal and root slash is bucket-wide", () => {
  expect(
    argv(
      bucketAnonymousCommands({
        bucket: "bucket",
        access: "download",
        prefix: "operator's /*",
      })[0],
    ),
  ).toEqual([
    "mcli",
    "anonymous",
    "--",
    "set",
    "download",
    "ALIAS/bucket/operator's /*",
  ]);
  expect(
    bucketAnonymousCommands({
      bucket: "bucket",
      access: "upload",
      prefix: "/",
    }),
  ).toEqual(["mcli anonymous -- set upload 'ALIAS/bucket'"]);
  expect(
    bucketAnonymousCommands({ bucket: "bucket", access: "PRIVATE" }),
  ).toEqual([]);
  expect(
    bucketAnonymousCommands({ bucket: "bucket", access: "constructor" }),
  ).toEqual([]);
  expect(bucketAnonymousCommands({ bucket: "", access: "PUBLIC" })).toEqual([]);
});

test("lifecycle maps current/noncurrent expiry and newer-version retention", () => {
  const input = {
    bucket: "bucket",
    type: "expiry",
    version: "current",
    value: "30",
  } as const;
  expect(lifecycleRuleCommands(input)).toEqual([
    "mcli ilm rule add --expire-days '30' -- 'ALIAS/bucket'",
  ]);
  expect(lifecycleRuleCommands({ ...input, version: "noncurrent" })).toEqual([
    "mcli ilm rule add --noncurrent-expire-days '30' -- 'ALIAS/bucket'",
  ]);
  expect(
    lifecycleRuleCommands({
      ...input,
      version: "noncurrent",
      unit: "versions",
      expireDeleteMarker: true,
      expireAllVersions: true,
    }),
  ).toEqual([
    "mcli ilm rule add --noncurrent-expire-newer '30' --expire-delete-marker --expire-all-object-versions -- 'ALIAS/bucket'",
  ]);
  expect(lifecycleRuleCommands({ ...input, value: "" })).toEqual([]);
});

test("lifecycle uses current CLI tier flags, only configured filters and literal values", () => {
  const input = {
    bucket: "bucket",
    type: "transition",
    version: "current",
    value: "7",
    storageClass: "cold",
  } as const;
  expect(lifecycleRuleCommands(input)).toEqual([
    "mcli ilm rule add --transition-days '7' --transition-tier 'COLD' -- 'ALIAS/bucket'",
  ]);
  expect(
    argv(
      lifecycleRuleCommands({
        ...input,
        version: "noncurrent",
        prefix: "operator's/",
        tags: "env=prod&k=a%2Bb",
      })[0],
    ),
  ).toEqual([
    "mcli",
    "ilm",
    "rule",
    "add",
    "--prefix",
    "operator's/",
    "--tags",
    "env=prod&k=a%2Bb",
    "--noncurrent-transition-days",
    "7",
    "--noncurrent-transition-tier",
    "COLD",
    "--",
    "ALIAS/bucket",
  ]);
  expect(lifecycleRuleCommands({ ...input, storageClass: "" })).toEqual([]);
  expect(lifecycleRuleCommands({ ...input, bucket: "" })).toEqual([]);
});

test("events preserve event subsets, filters and API defaults", () => {
  const input = {
    bucket: "bucket",
    arn: "arn:minio:sqs::notify:webhook",
    events: ["put", "delete"],
  };
  expect(bucketEventCommands(input)).toEqual([
    "mcli event add --event 'put,delete' --ignore-existing -- 'ALIAS/bucket' 'arn:minio:sqs::notify:webhook'",
  ]);
  expect(
    argv(
      bucketEventCommands({
        ...input,
        prefix: "operator's/$(printf nope)",
        suffix: ".json",
      })[0],
    ).slice(5, 10),
  ).toEqual([
    "--prefix",
    "operator's/$(printf nope)",
    "--suffix",
    ".json",
    "--ignore-existing",
  ]);
  expect(bucketEventCommands({ ...input, events: [] })[0]).toContain(
    "--event 'get,put,delete'",
  );
  expect(bucketEventCommands({ ...input, arn: "" })).toEqual([]);
});

test("create user never accepts a secret and attaches multiple policies/groups", () => {
  expect(
    createUserCommands({
      accessKey: "operator's",
      policies: ["readonly", "diagnostics"],
      groups: ["ops team", "ops team", "audit"],
    }),
  ).toEqual([
    "mcli admin user add -- ALIAS 'operator'\\''s' '<SECRET>'",
    "mcli admin policy attach --user 'operator'\\''s' -- ALIAS 'readonly' 'diagnostics'",
    "mcli admin group add -- ALIAS 'ops team' 'operator'\\''s'",
    "mcli admin group add -- ALIAS 'audit' 'operator'\\''s'",
  ]);
  expect(createUserCommands({ accessKey: "new-user" })).toEqual([
    "mcli admin user add -- ALIAS 'new-user' '<SECRET>'",
  ]);
  expect(createUserCommands({ accessKey: "" })).toEqual([]);
});

test("create group requires members and quotes multiple member names", () => {
  expect(
    argv(
      createGroupCommands({
        name: "operator's group",
        members: ["alice", "bob", "alice"],
      })[0],
    ),
  ).toEqual([
    "mcli",
    "admin",
    "group",
    "add",
    "--",
    "ALIAS",
    "operator's group",
    "alice",
    "bob",
  ]);
  expect(createGroupCommands({ name: "empty", members: [] })).toEqual([]);
  expect(createGroupCommands({ name: "", members: ["alice"] })).toEqual([]);
});

test("set policies detaches removed policies, attaches additions and preserves unchanged ones", () => {
  const input = {
    entity: "user",
    name: "alice",
    currentPolicies: ["old", "keep"],
    policies: ["keep", "new", "extra", "new"],
  } as const;
  expect(setPoliciesCommands(input)).toEqual([
    "mcli admin policy detach --user 'alice' -- ALIAS 'old'",
    "mcli admin policy attach --user 'alice' -- ALIAS 'new' 'extra'",
  ]);
  expect(
    setPoliciesCommands({
      entity: "group",
      name: "ops",
      policies: [],
      currentPolicies: ["old", "keep"],
    }),
  ).toEqual(["mcli admin policy detach --group 'ops' -- ALIAS 'old' 'keep'"]);
  expect(
    setPoliciesCommands({
      entity: "group",
      name: "ops",
      policies: ["readonly", "diagnostics"],
    }),
  ).toEqual([
    "mcli admin policy attach --group 'ops' -- ALIAS 'readonly' 'diagnostics'",
  ]);
  expect(
    setPoliciesCommands({ ...input, policies: input.currentPolicies }),
  ).toEqual([]);
  expect(setPoliciesCommands({ ...input, name: "" })).toEqual([]);
});

test("create policy trims like the form, quotes its name, references policy.json", () => {
  expect(createPolicyCommands("  operator's policy  ")).toEqual([
    "mcli admin policy create -- ALIAS 'operator'\\''s policy' policy.json",
  ]);
  expect(createPolicyCommands("   ")).toEqual([]);
});

test("access keys support self/other users, UTC expiry, policy files and placeholder secrets", () => {
  expect(createAccessKeyCommands({})).toEqual([
    "mcli admin accesskey create -- ALIAS",
  ]);
  expect(
    argv(
      createAccessKeyCommands({
        user: "alice",
        accessKey: "new-key",
        customSecret: true,
        policy: true,
        name: "operator's key",
        description: "scripts & backups",
        expiry: "2027-01-02T03:04:05.000Z",
      })[0],
    ),
  ).toEqual([
    "mcli",
    "admin",
    "accesskey",
    "create",
    "--access-key",
    "new-key",
    "--secret-key",
    "<SECRET>",
    "--policy",
    "policy.json",
    "--name",
    "operator's key",
    "--description",
    "scripts & backups",
    "--expiry",
    "2027-01-02T03:04:05.000Z",
    "--",
    "ALIAS",
    "alice",
  ]);
  expect(
    createAccessKeyCommands({
      user: "",
      accessKey: "",
      name: "",
      description: "",
      expiry: null,
      policy: false,
      customSecret: false,
    }),
  ).toEqual(["mcli admin accesskey create -- ALIAS"]);
});

// Whole-bucket presets must not use the incremental prefix operation.
test("whole-bucket access replaces the complete policy using exact preset JSON", () => {
  for (const access of ["PRIVATE", "PUBLIC", "CUSTOM"]) {
    expect(bucketAccessPolicyCommands({ bucket: "bucket", access })).toEqual([
      "mcli anonymous -- set-json policy.json 'ALIAS/bucket'",
    ]);
  }
  expect(JSON.parse(bucketAccessPolicyJSON("bucket", "PRIVATE")!)).toEqual({
    Version: "2012-10-17",
    Statement: [],
  });
  expect(JSON.parse(bucketAccessPolicyJSON("bucket", "PUBLIC")!)).toEqual({
    Version: "2012-10-17",
    Statement: [
      {
        Action: [
          "s3:GetBucketLocation",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
        ],
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Resource: ["arn:aws:s3:::bucket"],
        Sid: "",
      },
      {
        Action: [
          "s3:AbortMultipartUpload",
          "s3:DeleteObject",
          "s3:GetObject",
          "s3:ListMultipartUploadParts",
          "s3:PutObject",
        ],
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Resource: ["arn:aws:s3:::bucket/*"],
        Sid: "",
      },
    ],
  });
  expect(bucketAccessPolicyJSON("bucket", "CUSTOM")).toBeUndefined();
  expect(bucketAccessPolicyJSON("", "PUBLIC")).toBeUndefined();
  expect(bucketAccessPolicyCommands({ bucket: "", access: "PUBLIC" })).toEqual(
    [],
  );
  expect(
    bucketAccessPolicyCommands({ bucket: "bucket", access: "download" }),
  ).toEqual([]);
});

test("leading-hyphen positionals follow the option terminator, while flag values stay literal", () => {
  const cases: [string, string[]][] = [
    [
      createUserCommands({ accessKey: "--help" })[0],
      ["ALIAS", "--help", "<SECRET>"],
    ],
    [
      createGroupCommands({ name: "--help", members: ["-user"] })[0],
      ["ALIAS", "--help", "-user"],
    ],
    [createPolicyCommands("--help")[0], ["ALIAS", "--help", "policy.json"]],
    [
      setPoliciesCommands({
        entity: "group",
        name: "--help",
        policies: ["-policy"],
      })[0],
      ["ALIAS", "-policy"],
    ],
    [
      createAccessKeyCommands({
        user: "--help",
        name: "--flag",
        customSecret: true,
      })[0],
      ["ALIAS", "--help"],
    ],
  ];
  for (const [command, expected] of cases) {
    const args = argv(command);
    expect(args.slice(args.indexOf("--") + 1)).toEqual(expected);
  }
  expect(argv(cases[3][0]).slice(4, 6)).toEqual(["--group", "--help"]);
  expect(cases[4][0]).toContain("--secret-key '<SECRET>'");
});
