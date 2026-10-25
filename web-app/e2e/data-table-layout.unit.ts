// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import {
  calculateColumnRest,
  isColumnVisible,
} from "../packages/mds/src/components/DataTable/DataTable.logic";
import type { IColumns } from "../packages/mds/src/components/DataTable/DataTable.types";

const columns: IColumns[] = [
  { label: "Name", priority: "high" },
  { label: "Status", priority: "high", width: 120 },
  { label: "Policies", priority: "medium", width: 200 },
  { label: "Groups", priority: "low", width: 300 },
  { label: "Actions", priority: "high", width: 48 },
];

test("phone columns give identity the space left by only visible facts and actions", () => {
  // 366px viewport content, minus the table's 16px padding and 45px selection.
  const name = calculateColumnRest(columns, 305, 390);
  expect(name).toBe(137);
  expect(name + 120 + 48 + 45 + 16).toBe(366);
});

test("tablet hides only low priority; desktop restores every allocation", () => {
  expect(calculateColumnRest(columns, 600, 768)).toBe(232);
  expect(calculateColumnRest(columns, 1000, 1200)).toBe(332);
  expect(isColumnVisible("medium", 767)).toBe(false);
  expect(isColumnVisible("medium", 768)).toBe(true);
  expect(isColumnVisible("low", 1199)).toBe(false);
  expect(isColumnVisible("low", 1200)).toBe(true);
});

test("unprioritized columns remain visible and empty or constrained layouts stay finite", () => {
  expect(isColumnVisible(undefined, 390)).toBe(true);
  expect(
    calculateColumnRest([{ label: "Name" }, { label: "Other" }], 300, 390),
  ).toBe(150);
  expect(calculateColumnRest(columns, 50, 390)).toBe(0);
  expect(calculateColumnRest([{ label: "Fixed", width: 100 }], 300, 390)).toBe(
    0,
  );
  expect(calculateColumnRest([], 300, 390)).toBe(0);
});
