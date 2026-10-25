// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export const reportedBucketSize = (
  bucket: { size?: number } | undefined,
  usageUpdatedAt?: string | null,
): number | undefined => {
  if (!bucket) return undefined;
  if (bucket.size !== undefined)
    return Number.isFinite(bucket.size) && bucket.size >= 0
      ? bucket.size
      : undefined;
  // The API omits a known zero. A completed usage snapshot distinguishes that
  // from an absent statistic; a missing bucket or failed request is unknown.
  return usageUpdatedAt && Number.isFinite(Date.parse(usageUpdatedAt))
    ? 0
    : undefined;
};
