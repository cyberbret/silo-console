// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { IColumns } from "./DataTable.types";

// These opt-in breakpoints follow SILO's md/lg sizes without changing the
// older MDS grid's lg breakpoint for existing consumers.
export const priorityMediaQuery = (priority: IColumns["priority"]) => {
  if (priority === "medium") return "@media (max-width: 767.98px)";
  if (priority === "low") return "@media (max-width: 1199.98px)";
  return undefined;
};

export const isColumnVisible = (
  priority: IColumns["priority"],
  viewportWidth: number,
) =>
  priority === "low"
    ? viewportWidth >= 1200
    : priority === "medium"
      ? viewportWidth >= 768
      : true;

/** Hidden cells remain mounted, but must not reserve any visible width. */
export const calculateColumnRest = (
  columns: IColumns[],
  availableWidth: number,
  viewportWidth: number,
) => {
  const visible = columns.filter((column) =>
    isColumnVisible(column.priority, viewportWidth),
  );
  const flexible = visible.filter((column) => !column.width).length;
  const fixed = visible.reduce((sum, column) => sum + (column.width || 0), 0);
  return flexible ? Math.max(0, availableWidth - fixed) / flexible : 0;
};

export const nextSortDirection = (
  field: string,
  currentField: string | undefined,
  currentDirection: "ASC" | "DESC" | undefined,
): "ASC" | "DESC" =>
  field !== currentField || currentDirection === "DESC" ? "ASC" : "DESC";
