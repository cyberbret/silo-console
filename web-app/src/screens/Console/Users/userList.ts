// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export type UserStatusFilter = "all" | "enabled" | "disabled";

// Some server responses contain a single empty policy after splitting CSV.
export const nonEmptyNames = (names: readonly string[] | undefined): string[] =>
  Array.from(new Set((names ?? []).map((name) => name.trim()).filter(Boolean)));

export const filterUsers = <T extends { accessKey: string; status?: string }>(
  users: readonly T[],
  query: string,
  status: UserStatusFilter,
): T[] => {
  const search = query.trim().toLocaleLowerCase();
  return users.filter(
    (user) =>
      user.accessKey.toLocaleLowerCase().includes(search) &&
      (status === "all" || user.status === status),
  );
};
