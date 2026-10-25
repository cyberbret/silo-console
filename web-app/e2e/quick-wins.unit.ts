// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import {
  nonEmptyNames,
  filterUsers,
} from "../src/screens/Console/Users/userList";
import { validateBucketName } from "../src/screens/Console/Buckets/ListBuckets/AddBucket/bucketNameValidation";
import { reportedBucketSize } from "../src/screens/Console/Buckets/BucketDetails/bucketUsage";

test("server policy placeholders do not become chips or duplicate identities", () => {
  expect(nonEmptyNames(undefined)).toEqual([]);
  expect(nonEmptyNames(["", " ", "\t"])).toEqual([]);
  expect(nonEmptyNames([" readonly ", "readwrite", "readonly", ""])).toEqual([
    "readonly",
    "readwrite",
  ]);
});

test("user text and status filters combine without mutating identities or the source list", () => {
  const users = Object.freeze([
    { accessKey: "Alice", status: "enabled" },
    { accessKey: "alice-reader", status: "disabled" },
    { accessKey: "bob", status: "enabled" },
    { accessKey: "unknown" },
  ]);
  expect(filterUsers(users, " ALICE ", "all")).toEqual(users.slice(0, 2));
  expect(filterUsers(users, "alice", "disabled")).toEqual([users[1]]);
  expect(filterUsers(users, "bob", "disabled")).toEqual([]);
  expect(filterUsers(users, "", "enabled")).toEqual([users[0], users[2]]);
  expect(filterUsers(users, "", "all")[0]).toBe(users[0]);
  expect(users).toHaveLength(4);
});

test("bucket validity covers length, reserved names, punctuation and late uniqueness results", () => {
  for (const name of [
    "",
    "A",
    "ab",
    "a".repeat(64),
    "a..b",
    "a.-b",
    "a-.b",
    "192.168.5.4",
    "xn--bucket",
    "bucket-s3alias",
    "-bucket",
    "bucket-",
  ]) {
    expect(validateBucketName(name, []).every(Boolean), name).toBe(false);
  }
  for (const name of ["abc", "a".repeat(63), "data.2026-10"]) {
    expect(validateBucketName(name, []).every(Boolean), name).toBe(true);
  }
  expect(validateBucketName("existing", []).every(Boolean)).toBe(true);
  expect(validateBucketName("existing", ["existing"]).every(Boolean)).toBe(
    false,
  );
});

test("usage distinguishes known zero from an uncomputed snapshot or missing bucket", () => {
  const at = "2026-10-24T00:00:00Z";
  expect(reportedBucketSize({ size: 0 })).toBe(0);
  expect(reportedBucketSize({}, at)).toBe(0);
  expect(reportedBucketSize({ size: 1024 })).toBe(1024);
  expect(reportedBucketSize({})).toBeUndefined();
  expect(reportedBucketSize({}, "not-a-date")).toBeUndefined();
  expect(reportedBucketSize(undefined, at)).toBeUndefined();
  expect(reportedBucketSize({ size: NaN }, at)).toBeUndefined();
});
