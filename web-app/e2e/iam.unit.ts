// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import {
  attachmentCount,
  policyAction,
  policyKind,
  visiblePolicies,
} from "../src/screens/Console/Policies/policyPresentation";
import {
  inheritedPolicies,
  loadGroupPolicies,
} from "../src/screens/Console/Users/inheritedPolicies";
import type { Group, Policy } from "../src/api/consoleApi";

test("only explicit custom policies can be deleted and modified built-ins reset", () => {
  const cases: [Policy, string, string | null][] = [
    [{ name: "custom", builtin: false, modified: false }, "custom", "delete"],
    [{ name: "builtin", builtin: true, modified: false }, "builtin", null],
    [{ name: "builtin", builtin: true, modified: true }, "modified", "reset"],
    [{ name: "legacy" }, "unknown", null],
    [{ name: "missing", builtin: true }, "unknown", null],
    [{ name: "null", builtin: null, modified: null }, "unknown", null],
  ];
  for (const [policy, kind, action] of cases) {
    expect(policyKind(policy)).toBe(kind);
    expect(policyAction(policy, true)).toBe(action);
    expect(policyAction(policy, false)).toBeNull();
  }
  expect(policyAction({ builtin: false }, true)).toBeNull();
});

test("zero attachments stay known while missing, fractional and invalid counts stay unknown", () => {
  expect(attachmentCount(0)).toBe(0);
  expect(attachmentCount(4)).toBe(4);
  for (const value of [undefined, null, NaN, Infinity, -1, 1.5])
    expect(attachmentCount(value)).toBeUndefined();
});

test("policy type/name filters and numeric sorts preserve input and put unknown counts last", () => {
  const policies = Object.freeze([
    {
      name: "read",
      builtin: true,
      modified: false,
      userCount: 0,
      groupCount: 3,
    },
    {
      name: "write",
      builtin: true,
      modified: true,
      userCount: 9,
      groupCount: 0,
    },
    { name: "custom", builtin: false, userCount: null, groupCount: 1 },
    { name: "legacy" },
  ]);
  expect(
    visiblePolicies(policies, " READ ", "builtin", "name", "ASC").map(
      (p) => p.name,
    ),
  ).toEqual(["read"]);
  expect(
    visiblePolicies(policies, "", "builtin", "name", "ASC").map((p) => p.name),
  ).toEqual(["read", "write"]);
  expect(
    visiblePolicies(policies, "", "custom", "name", "ASC").map((p) => p.name),
  ).toEqual(["custom"]);
  expect(
    visiblePolicies(policies, "", "all", "userCount", "DESC").map(
      (p) => p.name,
    ),
  ).toEqual(["write", "read", "custom", "legacy"]);
  expect(
    visiblePolicies(policies, "", "all", "groupCount", "ASC").map(
      (p) => p.name,
    ),
  ).toEqual(["write", "custom", "read", "legacy"]);
  expect(policies[0].name).toBe("read");
});

test("inherited policy merge deduplicates names and source attribution without hiding direct overlap", () => {
  expect(
    inheritedPolicies(
      [
        {
          name: "analysts",
          state: "ready",
          group: {
            status: "enabled",
            policy: " readonly,readonly, readwrite, ",
          },
        },
        {
          name: "engineering",
          state: "ready",
          group: { status: "enabled", policy: "readonly" },
        },
        { name: "failed", state: "error" },
        {
          name: "disabled",
          state: "ready",
          group: { status: "disabled", policy: "consoleAdmin" },
        },
        { name: "unknown", state: "ready", group: { policy: "diagnostics" } },
      ],
      ["readwrite"],
    ),
  ).toEqual([
    { name: "readonly", groups: ["analysts", "engineering"], direct: false },
    { name: "readwrite", groups: ["analysts"], direct: true },
  ]);
});

test("group loading caps concurrency at three, deduplicates and retains failed sources", async () => {
  const pending = new Map<
    string,
    { resolve: (group: Group) => void; reject: () => void }
  >();
  let active = 0;
  let peak = 0;
  const load = (name: string) =>
    new Promise<Group>((resolve, reject) => {
      active++;
      peak = Math.max(peak, active);
      pending.set(name, {
        resolve: (group) => {
          active--;
          resolve(group);
        },
        reject: () => {
          active--;
          reject(new Error("unavailable"));
        },
      });
    });
  const result = loadGroupPolicies(
    ["a", "b", "c", "d", "a"],
    new AbortController().signal,
    load,
  );
  expect([...pending.keys()]).toEqual(["a", "b", "c"]);
  pending.get("b")!.reject();
  await expect.poll(() => pending.has("d")).toBe(true);
  for (const name of ["a", "c", "d"])
    pending.get(name)!.resolve({ name, policy: "readonly", status: "enabled" });
  expect((await result).map((value) => [value.name, value.state])).toEqual([
    ["a", "ready"],
    ["b", "error"],
    ["c", "ready"],
    ["d", "ready"],
  ]);
  expect(peak).toBe(3);
});

test("aborting group retrieval prevents queued requests and discards late replies", async () => {
  const controller = new AbortController();
  const complete: ((group: Group) => void)[] = [];
  const names: string[] = [];
  const result = loadGroupPolicies(
    ["a", "b", "c", "d", "e"],
    controller.signal,
    (name) => {
      names.push(name);
      return new Promise<Group>((resolve) => complete.push(resolve));
    },
  );
  controller.abort();
  for (const resolve of complete)
    resolve({ status: "enabled", policy: "readonly" });
  expect(await result).toEqual([]);
  expect(names).toEqual(["a", "b", "c"]);
});
