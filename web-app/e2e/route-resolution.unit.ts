// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import { registry } from "../src/navigation/registry";
import { resolveRoute, RouteContext } from "../src/navigation/resolveRoute";
import {
  IAM_PAGES,
  IAM_PAGES_PERMISSIONS,
  IAM_SCOPES,
  S3_ALL_RESOURCES,
} from "../src/common/SecureComponent/permissions";

const context: RouteContext = {
  features: [],
  distributedSetup: true,
  hasPermission: () => true,
};

test("encoded object paths retain their browser route and mount base", () => {
  for (const pathname of [
    "/browser/demo-data/docs%2F",
    "/browser/demo-data/docs%2Fsub%2Freport.txt",
    "/browser/demo-data/a%252Fb%20c.txt",
    "/browser/demo-data/hop",
    "/browser/demo-data/",
  ]) {
    expect(resolveRoute(pathname, registry, context)).toMatchObject({
      kind: "page",
      def: { id: "browser", path: "/browser/*" },
    });
  }
});

test("all KMS paths explain missing encryption, even without IAM grants", () => {
  for (const pathname of [
    "/kms",
    "/kms/status",
    "/kms/keys",
    "/kms/add-key/",
    "/kms/unknown",
  ]) {
    expect(
      resolveRoute(pathname, registry, {
        ...context,
        hasPermission: () => false,
      }),
    ).toMatchObject({ kind: "feature-off", feature: "kms" });
  }
});

test("KMS status renders with its feature and lists its own permissions when denied", () => {
  const ctx = { ...context, features: ["kms"] };
  expect(resolveRoute("/kms/unknown", registry, ctx)).toEqual({
    kind: "not-found",
  });
  expect(resolveRoute("/kms/status", registry, ctx)).toMatchObject({
    kind: "page",
    def: { id: "kms-status", mountPath: "/kms/*" },
  });
  expect(
    resolveRoute("/kms/status", registry, {
      ...ctx,
      hasPermission: () => false,
    }),
  ).toMatchObject({
    kind: "forbidden",
    def: { permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.KMS_STATUS] },
  });
});

test("forbidden users page reports the actual IAM actions", () => {
  expect(
    resolveRoute("/identity/users", registry, {
      ...context,
      hasPermission: () => false,
    }),
  ).toMatchObject({
    kind: "forbidden",
    def: { permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.USERS] },
  });
  // The existing Users exception accepts CreateUser on the global S3 resource.
  expect(
    resolveRoute("/identity/users", registry, {
      ...context,
      hasPermission: (resource, scopes) =>
        resource === S3_ALL_RESOURCES &&
        scopes.includes(IAM_SCOPES.ADMIN_CREATE_USER),
    }).kind,
  ).toBe("page");
});

test("bucket administration resolves its bucket resource with Router params", () => {
  const checked: (string | undefined)[] = [];
  expect(
    resolveRoute("/buckets/demo-data/admin/events", registry, {
      ...context,
      hasPermission: (resource, scopes) => {
        checked.push(resource);
        return (
          resource === "demo-data" &&
          scopes === IAM_PAGES_PERMISSIONS[IAM_PAGES.BUCKETS_ADMIN_VIEW]
        );
      },
    }),
  ).toMatchObject({
    kind: "page",
    def: { id: "bucket-settings/events", mountPath: "/buckets/*" },
  });
  expect(checked).toEqual(["demo-data"]);
  expect(
    resolveRoute("/buckets/private/admin/events", registry, {
      ...context,
      hasPermission: () => false,
    }).kind,
  ).toBe("forbidden");
});

test("Router-decoded resource parameters are used for permission checks", () => {
  expect(
    resolveRoute("/buckets/%64emo-data/admin/events", registry, {
      ...context,
      hasPermission: (resource) => resource === "demo-data",
    }),
  ).toMatchObject({ kind: "page", def: { id: "bucket-settings/events" } });
});

test("static forms outrank dynamic details regardless of registry order", () => {
  for (const pages of [registry, [...registry].reverse()]) {
    for (const [pathname, id] of [
      ["/identity/groups/create-group", "add-group"],
      ["/identity/users/add-user", "add-user"],
      ["/identity/idp/openid/configurations/add-idp", "add-openid"],
      ["/buckets/add-replication", "add-bucket-replication"],
    ]) {
      expect(resolveRoute(pathname, pages, context)).toMatchObject({
        kind: "page",
        def: { id },
      });
    }
    expect(
      resolveRoute("/identity/users/add-user", pages, {
        ...context,
        hasPermission: (_resource, scopes) =>
          scopes.includes(IAM_SCOPES.ADMIN_LIST_USERS),
      }).kind,
    ).toBe("forbidden");
  }
});

test("settings options and the existing nested pages retain their mount bases", () => {
  for (const [pathname, id, mountPath] of [
    [
      "/settings/configurations/region",
      "settings-option",
      "/settings/configurations/*",
    ],
    ["/policies/demo-reader", "policy", "/policies/*"],
    ["/support/profile", "profile", "/support/*"],
    ["/identity/users/alice", "user", "/identity/users/*"],
    [
      "/identity/users/new-user-sa/alice",
      "user-access-key",
      "/identity/users/*",
    ],
    ["/buckets/add-bucket", "add-bucket", "/buckets/*"],
  ]) {
    expect(resolveRoute(pathname, registry, context)).toMatchObject({
      kind: "page",
      def: { id, mountPath },
    });
  }
});

test("LDAP hides local identity pages but keeps LDAP configuration accessible", () => {
  const ctx = { ...context, features: ["ldap-idp"] };
  for (const pathname of [
    "/identity/users",
    "/identity/users/alice",
    "/identity/groups",
  ]) {
    expect(resolveRoute(pathname, registry, ctx)).toMatchObject({
      kind: "feature-off",
      feature: "local-identity",
    });
  }
  expect(resolveRoute("/identity/ldap/configuration", registry, ctx).kind).toBe(
    "page",
  );
  expect(
    resolveRoute("/identity/ldap/configuration", registry, context).kind,
  ).toBe("page");
});

test("non-distributed setups explain both tier creation routes, preserving the list", () => {
  const ctx = { ...context, distributedSetup: false };
  for (const pathname of ["/settings/tiers/add", "/settings/tiers/add/s3"]) {
    expect(resolveRoute(pathname, registry, ctx)).toMatchObject({
      kind: "feature-off",
      feature: "distributed",
    });
  }
  expect(resolveRoute("/settings/tiers", registry, ctx).kind).toBe("page");
});

test("object-browser-only mode explains known admin routes without exposing pages", () => {
  const ctx = { ...context, features: ["object-browser-only"] };
  expect(resolveRoute("/browser/demo-data/docs%2F", registry, ctx).kind).toBe(
    "page",
  );
  expect(resolveRoute("/tools/metrics", registry, ctx)).toMatchObject({
    kind: "feature-off",
    feature: "full-console",
  });
  expect(resolveRoute("/no/such/page", registry, ctx).kind).toBe("not-found");
});

test("unknown paths never borrow a permitted parent and only the exact index lands", () => {
  for (const pathname of [
    "/no/such/page",
    "/tools/metrics/typo",
    "/identity/users/alice/typo",
    "/browserish",
    "/buckets/demo-data/typo",
    "/buckets/demo-data/admin/typo",
  ]) {
    expect(resolveRoute(pathname, registry, context)).toEqual({
      kind: "not-found",
    });
  }
  expect(resolveRoute("/", registry, context)).toEqual({ kind: "page" });
});
