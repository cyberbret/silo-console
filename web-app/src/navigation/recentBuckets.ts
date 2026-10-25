// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export const recentBucketsKey = (accessKey?: string) =>
  `silo.recentBuckets.${accessKey || "anon"}`;

// Storage is untrusted and may be unavailable in private browsing.
export const parseRecentBuckets = (raw: string | null): string[] => {
  try {
    const value: unknown = JSON.parse(raw || "[]");
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (item): item is string =>
                typeof item === "string" &&
                item.length > 0 &&
                !item.includes("/"),
            ),
          ),
        ].slice(0, 5)
      : [];
  } catch {
    return [];
  }
};

export const addRecentBucket = (recent: readonly string[], bucket: string) =>
  parseRecentBuckets(JSON.stringify([bucket, ...recent]));

// undefined means loading/failed: only an authoritative successful list prunes.
export const pruneRecentBuckets = (
  recent: readonly string[],
  known?: readonly string[],
): string[] =>
  known === undefined
    ? [...recent]
    : recent.filter((name) => known.includes(name));
