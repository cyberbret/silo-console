// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import {
  alerts,
  capacity,
  driveCapacity,
  health,
  usage,
} from "../src/screens/Console/Overview/overviewModel";
import { quickActions } from "../src/screens/Console/Overview/quickActions";
import { IAM_SCOPES } from "../src/common/SecureComponent/permissions";

const usageUpdatedAt = "2026-10-24T00:00:00Z";
const okDrive = {
  state: "ok",
  totalSpace: 100,
  usedSpace: 20,
  availableSpace: 80,
};

test("health uses the actual distinct server and drive states without counting unknowns as offline", () => {
  expect(
    health([
      {
        state: "online",
        drives: [okDrive, { state: "offline", healing: true }],
      },
      { state: "offline", drives: [{}, okDrive] },
    ]),
  ).toEqual({
    serversOnline: 1,
    serversTotal: 2,
    serversOffline: 1,
    drivesOnline: 2,
    drivesTotal: 4,
    drivesOffline: 1,
    healing: 1,
    incomplete: true,
  });
  expect(health(undefined).serversTotal).toBeUndefined();
  expect(health([]).serversTotal).toBe(0);
  expect(health([{ state: "online" }]).drivesTotal).toBeUndefined();
  expect(health([{ state: "online", drives: [] }]).drivesTotal).toBe(0);
});

test("capacity is the sum of per-drive raw measurements, with no guessed EC geometry", () => {
  const result = capacity([
    {
      drives: [
        {
          totalSpace: 2147483648,
          usedSpace: 19935232,
          availableSpace: 2127548416,
        },
        { totalSpace: 1024, usedSpace: 0, availableSpace: 1024 },
      ],
    },
  ]);
  expect(result.rawTotal).toBe(2147484672);
  expect(result.rawUsed).toBe(19935232);
  expect(result.rawAvailable).toBe(2127549440);
  expect(result.usedRatio).toBe(19935232 / 2147484672);
  expect(result.incomplete).toBe(false);
  expect(result).not.toHaveProperty("usableEstimate");
});

test("capacity preserves missing and partial measurements instead of inventing zero", () => {
  expect(capacity(undefined).rawTotal).toBeUndefined();
  expect(capacity([]).usedRatio).toBeUndefined();
  for (const totalSpace of [0, -1, NaN, Infinity]) {
    expect(driveCapacity({ totalSpace, usedSpace: 0 }).total).toBeUndefined();
  }
  const partial = capacity([{ drives: [okDrive, { state: "offline" }] }]);
  expect(partial.rawTotal).toBe(100);
  expect(partial.incomplete).toBe(true);
  expect(capacity([{ drives: [okDrive] }, {}]).incomplete).toBe(true);
  const missing = capacity([
    { drives: [{ totalSpace: 100, availableSpace: 100 }] },
  ]);
  expect(missing.rawUsed).toBeUndefined();
  expect(missing.usedRatio).toBeUndefined();
  expect(missing.incomplete).toBe(true);
});

test("computed omitted zero, unknown freshness and malformed numbers stay distinct", () => {
  expect(usage({ usageUpdatedAt })).toEqual({
    computed: true,
    objects: 0,
    bytes: 0,
    buckets: 0,
  });
  expect(usage({ objects: 12, usage: 100, buckets: 2 })).toEqual({
    computed: false,
    objects: undefined,
    bytes: undefined,
    buckets: 2,
  });
  expect(
    usage({ usageUpdatedAt: "not-a-date", objects: 0 }).objects,
  ).toBeUndefined();
  expect(
    usage({ usageUpdatedAt, objects: NaN, usage: -1, buckets: Infinity }),
  ).toEqual({
    computed: true,
    objects: undefined,
    bytes: undefined,
    buckets: undefined,
  });
  expect(
    usage({ usageUpdatedAt, objects: 0, usage: 0, buckets: 0 }).computed,
  ).toBe(true);
});

test("capacity alerts include exact 85/95 thresholds and do not double-report warning and danger", () => {
  for (const [usedSpace, severity] of [
    [84.99, undefined],
    [85, "warning"],
    [94.99, "warning"],
    [95, "danger"],
    [96, "danger"],
  ] as const) {
    const result = alerts(
      {
        usageUpdatedAt,
        servers: [{ state: "online", drives: [{ ...okDrive, usedSpace }] }],
      },
      false,
    );
    expect(
      result
        .filter((alert) => alert.id.startsWith("drive-capacity"))
        .map((alert) => alert.severity),
    ).toEqual(severity ? [severity] : []);
  }
});

test("offline, full and healing simulation orders actionable alerts before incomplete statistics", () => {
  const result = alerts(
    {
      servers: [
        {
          state: "offline",
          drives: [
            { ...okDrive, state: "offline", usedSpace: 96, healing: true },
            { ...okDrive, usedSpace: 86 },
          ],
        },
      ],
    },
    true,
  );
  expect(result.map((alert) => alert.id)).toEqual([
    "servers-offline",
    "drives-offline",
    "drive-capacity-0-0",
    "drive-capacity-0-1",
    "healing",
    "restart",
    "usage-pending",
  ]);
  expect(result.find((alert) => alert.id === "restart")?.href).toBe(
    "#restart-server",
  );
  expect(result[2].message).toContain("may reject writes");
  expect(
    alerts(
      { usageUpdatedAt, servers: [{ state: "online", drives: [okDrive] }] },
      false,
    ),
  ).toEqual([]);
  expect(
    alerts({ usageUpdatedAt }, false).some(
      (alert) => alert.id === "health-unknown",
    ),
  ).toBe(true);
});

test("quick actions use complete form permissions, local identity and actual OBDInfo capability", () => {
  const grants = new Set<string>([IAM_SCOPES.ADMIN_SERVER_INFO]);
  const permit = (_resource: string, scopes: string[], all = false) =>
    all
      ? scopes.every((scope) => grants.has(scope))
      : scopes.some((scope) => grants.has(scope));
  expect(quickActions({}, [], permit)).toEqual([]);
  grants.add(IAM_SCOPES.ADMIN_CREATE_USER);
  expect(quickActions({}, [], permit)).toEqual([]);
  for (const grant of [
    IAM_SCOPES.ADMIN_LIST_USER_POLICIES,
    IAM_SCOPES.ADMIN_LIST_GROUPS,
    IAM_SCOPES.ADMIN_ATTACH_USER_OR_GROUP_POLICY,
    IAM_SCOPES.ADMIN_CREATE_SERVICEACCOUNT,
    IAM_SCOPES.ADMIN_HEALTH_INFO,
  ])
    grants.add(grant);
  const actions = quickActions(
    { "arn:aws:s3:::team-*": ["s3:Create*"] },
    [],
    permit,
  );
  expect(actions.map((action) => action.id)).toEqual([
    "bucket",
    "user",
    "access-key",
    "health",
  ]);
  expect(actions[0].path).toBe("/buckets/add-bucket");
  expect(
    quickActions({}, ["ldap-idp"], permit).map((action) => action.id),
  ).toEqual(["access-key", "health"]);
});
