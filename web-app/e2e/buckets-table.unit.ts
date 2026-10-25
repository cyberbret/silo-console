// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import {
  filterSortBuckets,
  hasUsageTimestamp,
  listBucketStatistic,
  parseBucketQuery,
  parseBucketView,
  toggleVisibleBuckets,
  updateBucketQuery,
} from "../src/screens/Console/Buckets/ListBuckets/bucketList";
import type { Bucket } from "../src/api/consoleApi";
const at = "2026-10-24T00:00:00Z";

test("query parsing validates enums and preserves literal search text", () => {
  expect(parseBucketQuery(new URLSearchParams())).toEqual({
    sort: "name",
    dir: "asc",
    q: "",
  });
  expect(
    parseBucketQuery(new URLSearchParams("sort=size&dir=desc&q=team%26%2B")),
  ).toEqual({ sort: "size", dir: "desc", q: "team&+" });
  expect(
    parseBucketQuery(new URLSearchParams("sort=__proto__&dir=DESC")),
  ).toEqual({ sort: "name", dir: "asc", q: "" });
  expect(parseBucketView("cards")).toBe("cards");
  expect(parseBucketView("unexpected")).toBe("table");
});
test("query writes retain unrelated state and encode search without double encoding", () => {
  const original = new URLSearchParams("sort=size&dir=desc&keep=yes&q=old");
  const changed = updateBucketQuery(original, {
    sort: "name",
    dir: "asc",
    q: " +&中文 ",
  });
  expect(changed.get("keep")).toBe("yes");
  expect(parseBucketQuery(new URLSearchParams(changed.toString()))).toEqual({
    sort: "name",
    dir: "asc",
    q: " +&中文 ",
  });
  expect(original.get("q")).toBe("old");
  expect(updateBucketQuery(changed, { q: "" }).has("q")).toBe(false);
});
test("statistics-capable administrators require a valid scanner timestamp", () => {
  for (const date of [undefined, null, "", "invalid"]) {
    expect(hasUsageTimestamp(date)).toBe(false);
    expect(
      listBucketStatistic({ name: "x", size: 12 }, "size", true, date),
    ).toBeUndefined();
    expect(
      listBucketStatistic({ name: "x", objects: 0 }, "objects", true, date),
    ).toBeUndefined();
  }
  expect(listBucketStatistic({ name: "x" }, "size", true, at)).toBe(0);
  expect(listBucketStatistic({ name: "x" }, "objects", true, at)).toBe(0);
  expect(listBucketStatistic({ name: "x", size: 12 }, "size", true, at)).toBe(
    12,
  );
  expect(listBucketStatistic(undefined, "size", true, at)).toBeUndefined();
});
test("non-admin AccountInfo values stay visible without scanner permission", () => {
  expect(
    listBucketStatistic({ name: "x", objects: 13 }, "objects", false),
  ).toBe(13);
  expect(listBucketStatistic({ name: "x", size: 0 }, "size", false)).toBe(0);
  expect(listBucketStatistic({ name: "x" }, "objects", false)).toBe(0);
  for (const value of [-1, NaN, Infinity]) {
    expect(
      listBucketStatistic({ name: "x", size: value }, "size", false),
    ).toBeUndefined();
    expect(
      listBucketStatistic({ name: "x", size: value }, "size", true, at),
    ).toBeUndefined();
  }
});
const records: readonly Bucket[] = Object.freeze([
  {
    name: "team-b",
    size: 20,
    objects: 4,
    creation_date: "2026-10-23T12:00:00Z",
  },
  {
    name: "team-a",
    size: 20,
    objects: 6,
    creation_date: "2026-10-22T12:00:00Z",
  },
  { name: "logs", size: -1, creation_date: "invalid" },
  { name: "empty" },
]);
test("sorting is stable, nonmutating and keeps unknowns last in both directions", () => {
  const sort = (dir: "asc" | "desc") =>
    filterSortBuckets(records, { sort: "size", dir, q: "" }, true, at).map(
      (r) => r.name,
    );
  expect(sort("asc")).toEqual(["empty", "team-a", "team-b", "logs"]);
  expect(sort("desc")).toEqual(["team-a", "team-b", "empty", "logs"]);
  expect(records[0].name).toBe("team-b");
  expect(
    filterSortBuckets(
      records,
      { sort: "created", dir: "desc", q: "" },
      true,
      at,
    ).map((r) => r.name),
  ).toEqual(["team-b", "team-a", "empty", "logs"]);
  expect(
    filterSortBuckets(
      records,
      { sort: "objects", dir: "desc", q: "" },
      true,
    ).map((r) => r.name),
  ).toEqual(["empty", "logs", "team-a", "team-b"]);
});
test("search and whitespace recovery use the same normalized name predicate", () => {
  expect(
    filterSortBuckets(
      records,
      { sort: "objects", dir: "desc", q: " TEAM " },
      false,
    ).map((r) => r.name),
  ).toEqual(["team-a", "team-b"]);
  expect(
    filterSortBuckets(records, { sort: "name", dir: "asc", q: " \t " }, false),
  ).toHaveLength(4);
  expect(
    filterSortBuckets(
      records,
      { sort: "name", dir: "asc", q: "missing" },
      false,
    ),
  ).toHaveLength(0);
});
test("visible select-all preserves hidden identities and never duplicates names", () => {
  expect(toggleVisibleBuckets(["hidden", "a"], ["a", "b"])).toEqual([
    "hidden",
    "a",
    "b",
  ]);
  expect(toggleVisibleBuckets(["hidden", "a", "b"], ["a", "b"])).toEqual([
    "hidden",
  ]);
  expect(toggleVisibleBuckets(["hidden"], [])).toEqual(["hidden"]);
});
