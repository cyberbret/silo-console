// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { Policy } from "../../../api/consoleApi";

type PolicyKind = "builtin" | "modified" | "custom" | "unknown";
type PolicyAction = "delete" | "reset";
export type PolicyFilter = "all" | "builtin" | "custom";
export type PolicySort = "name" | "userCount" | "groupCount";

export const policyKind = (policy: Policy): PolicyKind => {
  if (policy.builtin === false) return "custom";
  if (policy.builtin !== true) return "unknown";
  if (policy.modified === true) return "modified";
  return policy.modified === false ? "builtin" : "unknown";
};

export const policyAction = (
  policy: Policy,
  canDelete: boolean,
): PolicyAction | null => {
  if (!canDelete || !policy.name) return null;
  const kind = policyKind(policy);
  return kind === "custom" ? "delete" : kind === "modified" ? "reset" : null;
};

export const attachmentCount = (count: number | null | undefined) =>
  typeof count === "number" && Number.isSafeInteger(count) && count >= 0
    ? count
    : undefined;

export const visiblePolicies = (
  policies: readonly Policy[],
  query: string,
  filter: PolicyFilter,
  field: PolicySort,
  direction: "ASC" | "DESC",
): Policy[] => {
  const search = query.trim().toLocaleLowerCase();
  return policies
    .filter(
      (policy) =>
        policy.name?.toLocaleLowerCase().includes(search) &&
        (filter === "all" ||
          (filter === "builtin" && policy.builtin === true) ||
          (filter === "custom" && policy.builtin === false)),
    )
    .sort((a, b) => {
      const nameOrder = (a.name || "").localeCompare(b.name || "");
      if (field === "name") return nameOrder * (direction === "ASC" ? 1 : -1);
      const left = attachmentCount(a[field]);
      const right = attachmentCount(b[field]);
      // Unknown counts sort last in either direction; they are never zeroes.
      if (left === undefined) return right === undefined ? nameOrder : 1;
      if (right === undefined) return -1;
      return (left - right) * (direction === "ASC" ? 1 : -1) || nameOrder;
    });
};
