// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import {
  addRecentBucket,
  parseRecentBuckets,
  pruneRecentBuckets,
  recentBucketsKey,
} from "../src/navigation/recentBuckets";
import { landingPath } from "../src/navigation/landing";
import { menuOptions, menuPages } from "../src/navigation/menu";
import { registry } from "../src/navigation/registry";
import { resolveRoute, RouteContext } from "../src/navigation/resolveRoute";
import { routesAsKbarActions } from "../src/screens/Console/kbar-actions";
import { bucketTabs } from "../src/screens/Console/Buckets/bucketTabs";
import { bucketStatistic } from "../src/screens/Console/Buckets/bucketMetadata";
import {
  IAM_SCOPES,
  CONSOLE_UI_RESOURCE,
} from "../src/common/SecureComponent/permissions";

const admin: RouteContext = {
  features: ["kms"],
  distributedSetup: true,
  hasPermission: () => true,
};
const denied: RouteContext = { ...admin, hasPermission: () => false };

test("recents safely parse storage, deduplicate, move to front and cap at five", () => {
  for (const value of [null, "", "{", "{}", '"bucket"', "0"])
    expect(parseRecentBuckets(value)).toEqual([]);
  expect(
    parseRecentBuckets('[null,4,"","a/b","logs","logs","demo-data"]'),
  ).toEqual(["logs", "demo-data"]);
  expect(addRecentBucket(["a", "b", "c", "d", "e"], "f")).toEqual([
    "f",
    "a",
    "b",
    "c",
    "d",
  ]);
  expect(addRecentBucket(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
});

test("only a known list prunes, retaining order, and account keys never share state", () => {
  const recent = ["logs", "gone", "demo-data"];
  expect(pruneRecentBuckets(recent)).toEqual(recent);
  expect(pruneRecentBuckets(recent, ["demo-data", "logs"])).toEqual([
    "logs",
    "demo-data",
  ]);
  expect(pruneRecentBuckets(recent, [])).toEqual([]);
  expect(recentBucketsKey("alice")).toBe("silo.recentBuckets.alice");
  expect(recentBucketsKey("bob")).not.toBe(recentBucketsKey("alice"));
  expect(recentBucketsKey()).toBe("silo.recentBuckets.anon");
});

test("sidebar exactly follows the approved order without duplicate or create entries", () => {
  const options = menuOptions(admin, ["logs", "demo-data"], true, (s) => s);
  expect(options.map((item) => item.name)).toEqual([
    "Overview",
    "Buckets",
    "Access Keys",
    "Identity",
    "Monitoring",
    "Settings",
    "Tools",
  ]);
  expect(
    options.slice(3).map((item) => item.children?.map((child) => child.name)),
  ).toEqual([
    ["Users", "Groups", "Policies", "OpenID", "LDAP"],
    ["Metrics", "Logs", "Audit", "Trace", "Watch"],
    ["Configuration", "Events", "Tiering", "Site Replication", "Encryption"],
    ["Health", "Performance", "Profile", "Inspect"],
  ]);
  expect(options[1].children?.map((item) => item.name)).toEqual([
    "logs",
    "demo-data",
  ]);
  expect(
    menuOptions(admin, ["logs"], false, (s) => s)[1].children,
  ).toBeUndefined();
});

test("menu and kbar preserve forceDisplay, original Users menu predicate and feature filtering", () => {
  expect(menuPages(denied).map((page) => page.id)).toEqual([
    "buckets",
    "access-keys",
  ]);
  const createOnly = {
    ...denied,
    hasPermission: (_resource: string | undefined, scopes: string[]) =>
      scopes.includes(IAM_SCOPES.ADMIN_CREATE_USER),
  };
  expect(menuPages(createOnly).some((page) => page.id === "users")).toBe(false);
  const users = {
    ...denied,
    hasPermission: (resource: string | undefined, scopes: string[]) =>
      resource === CONSOLE_UI_RESOURCE &&
      scopes.includes(IAM_SCOPES.ADMIN_GET_USER),
  };
  expect(menuPages(users).some((page) => page.id === "users")).toBe(true);
  const ldap = menuPages({ ...admin, features: ["ldap-idp"] });
  expect(
    ldap.some((page) => ["users", "groups", "kms-keys"].includes(page.id)),
  ).toBe(false);
  expect(ldap.some((page) => page.id === "ldap")).toBe(true);
  const navigated: string[] = [];
  const actions = routesAsKbarActions(
    ["demo-data"],
    (path) => navigated.push(path),
    denied,
  );
  expect(actions.map((action) => action.id)).toEqual([
    "buckets",
    "nav-accesskeys",
    "recent-bucket-demo-data",
  ]);
  actions[2].perform?.();
  expect(navigated).toEqual(["/browser/demo-data"]);
});

test("landing gates Overview and browser-only accepts the new bucket list without admin routes", () => {
  expect(landingPath(admin)).toBe("/overview");
  expect(landingPath(denied)).toBe("/buckets");
  const browserOnly = { ...admin, features: ["object-browser-only"] };
  expect(landingPath(browserOnly)).toBe("/buckets");
  expect(resolveRoute("/buckets", registry, browserOnly).kind).toBe("page");
  expect(resolveRoute("/browser", registry, browserOnly).kind).toBe("page");
  expect(
    resolveRoute("/buckets/demo-data/admin/summary", registry, browserOnly)
      .kind,
  ).toBe("feature-off");
  expect(resolveRoute("/overview", registry, denied).kind).toBe("forbidden");
  expect(resolveRoute("/buckets/demo-data", registry, admin)).toMatchObject({
    kind: "page",
    def: { id: "legacy-bucket" },
  });
});

test("bucket tabs combine list, settings and existing feature permissions", () => {
  expect(bucketTabs("demo-data", admin, false).map((tab) => tab.id)).toEqual([
    "objects",
    "summary",
    "events",
    "replication",
    "lifecycle",
    "access",
    "anonymous",
  ]);
  const reader = {
    ...denied,
    hasPermission: (resource: string | undefined, scopes: string[]) =>
      resource === "demo-data" && scopes.includes(IAM_SCOPES.S3_LIST_BUCKET),
  };
  expect(bucketTabs("demo-data", reader, false).map((tab) => tab.id)).toEqual([
    "objects",
  ]);
  expect(bucketTabs("other", reader, false)).toEqual([]);
  expect(
    bucketTabs("demo-data", { ...admin, distributedSetup: false }, false).map(
      (tab) => tab.id,
    ),
  ).not.toContain("replication");
  expect(
    bucketTabs("demo-data", admin, true).map((tab) => tab.id),
  ).not.toContain("replication");
  expect(
    bucketTabs(
      "demo-data",
      { ...admin, features: ["object-browser-only"] },
      false,
    ).map((tab) => tab.id),
  ).toEqual(["objects"]);
});

test("registry detail routes select their parent group without duplicate menu entries", () => {
  for (const [path, section] of [
    ["/add-policy", "identity"],
    ["/kms/status", "settings"],
    ["/kms/add-key/", "settings"],
  ]) {
    const options = menuOptions(admin, [], true, (s) => s, path);
    expect(
      options.filter((item) => item.selected).map((item) => item.id),
    ).toEqual([section]);
    expect(
      options
        .flatMap((item) => item.children || [])
        .some((item) => item.path === path),
    ).toBe(false);
  }
});

test("calculated list metadata distinguishes omitted zero values from unknown statistics", () => {
  const at = "2026-10-24T00:00:00Z";
  const empty = { name: "compliance" };
  for (const field of ["size", "objects"] as const) {
    expect(bucketStatistic(empty, field, at)).toBe(0);
    expect(bucketStatistic(undefined, field, at)).toBeUndefined();
    expect(bucketStatistic(empty, field)).toBeUndefined();
    expect(bucketStatistic(empty, field, "invalid")).toBeUndefined();
    expect(bucketStatistic({ ...empty, [field]: 12 }, field)).toBe(12);
    for (const value of [-1, Infinity, NaN]) {
      expect(
        bucketStatistic({ ...empty, [field]: value }, field, at),
      ).toBeUndefined();
    }
  }
});
