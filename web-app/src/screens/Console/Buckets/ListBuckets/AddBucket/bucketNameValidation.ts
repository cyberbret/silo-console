// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Keep this order aligned with BucketNamingRules. Validity is independent of
// interaction; the form decides when to reveal these results.
export const validateBucketName = (
  name: string,
  existing: readonly string[],
) => [
  name.length >= 3 && name.length <= 63,
  /^[a-z0-9][a-z0-9.\-]{1,61}[a-z0-9]$/.test(name),
  !name.includes(".-") && !name.includes("-.") && !name.includes(".."),
  !/^(\d+\.){3}\d+$/.test(name),
  !name.startsWith("xn--"),
  !name.endsWith("-s3alias"),
  !existing.includes(name),
];
