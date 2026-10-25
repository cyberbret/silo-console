// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { Bucket } from "../../../api/consoleApi";

export const bucketStatistic = (
  bucket: Bucket | undefined,
  field: "size" | "objects",
  usageUpdatedAt?: string | null,
): number | undefined => {
  if (!bucket) return undefined;
  const value = bucket[field];
  if (value !== undefined)
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  // Go omits a known zero. Only a matching bucket in a calculated usage
  // snapshot makes an omitted statistic zero; unavailable metadata stays unknown.
  return usageUpdatedAt && Number.isFinite(Date.parse(usageUpdatedAt))
    ? 0
    : undefined;
};
