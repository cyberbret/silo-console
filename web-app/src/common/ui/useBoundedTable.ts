// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useTableRowHeight } from "mds";

/** A definite virtualizer viewport for short administrative lists. */
export function useBoundedTable(count: number, loading = false) {
  const rowHeight = useTableRowHeight();
  const height = loading
    ? Math.max(240, rowHeight * 6 + 8)
    : count === 0
      ? 320
      : rowHeight * (Math.min(count, 10) + 1) + 8;
  return {
    customPaperHeight: `${height}px`,
    sx: { minHeight: 0, overflowY: "auto" as const },
  };
}
