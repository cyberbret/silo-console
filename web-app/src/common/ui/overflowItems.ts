// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Stable partition: preserve caller order within each group and never mutate.
export const orderOverflowItems = <T extends { danger?: boolean }>(
  items: readonly T[],
): T[] => [
  ...items.filter((item) => !item.danger),
  ...items.filter((item) => item.danger),
];
