// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { Group } from "../../../api/consoleApi";
import { nonEmptyNames } from "./userList";

export type GroupPolicyResult =
  | { name: string; state: "ready"; group: Group }
  | { name: string; state: "error" };

export const inheritedPolicies = (
  groups: readonly GroupPolicyResult[],
  direct: readonly string[],
): { name: string; groups: string[]; direct: boolean }[] => {
  const policies = new Map<string, Set<string>>();
  for (const result of groups) {
    // Disabled/unknown group status must not imply currently inherited grants.
    if (result.state !== "ready" || result.group.status !== "enabled") continue;
    for (const name of nonEmptyNames(result.group.policy?.split(","))) {
      if (!policies.has(name)) policies.set(name, new Set());
      policies.get(name)!.add(result.name);
    }
  }
  return [...policies]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, sources]) => ({
      name,
      groups: [...sources].sort((a, b) => a.localeCompare(b)),
      direct: direct.includes(name),
    }));
};

// Only three requests can be in flight. Abort also prevents queued work from
// starting; the caller guards completion against a superseded user generation.
export const loadGroupPolicies = async (
  names: readonly string[],
  signal: AbortSignal,
  load: (name: string, signal: AbortSignal) => Promise<Group>,
): Promise<GroupPolicyResult[]> => {
  const groups = nonEmptyNames([...names]);
  const results: GroupPolicyResult[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(3, groups.length) }, async () => {
      while (!signal.aborted && next < groups.length) {
        const index = next++;
        const name = groups[index];
        try {
          const group = await load(name, signal);
          if (!signal.aborted) results[index] = { name, state: "ready", group };
        } catch {
          if (!signal.aborted) results[index] = { name, state: "error" };
        }
      }
    }),
  );
  return results;
};
