// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import {
  nextSortDirection,
  priorityMediaQuery,
} from "../packages/mds/src/components/DataTable/DataTable.logic";

test("column priorities use SILO's md/lg boundaries and leave default columns visible", () => {
  expect(priorityMediaQuery(undefined)).toBeUndefined();
  expect(priorityMediaQuery("high")).toBeUndefined();
  expect(priorityMediaQuery("medium")).toBe("@media (max-width: 767.98px)");
  expect(priorityMediaQuery("low")).toBe("@media (max-width: 1199.98px)");
});

test("sort activation starts ascending, toggles, and resets when switching fields", () => {
  expect(nextSortDirection("name", undefined, undefined)).toBe("ASC");
  expect(nextSortDirection("name", "name", "ASC")).toBe("DESC");
  expect(nextSortDirection("name", "name", "DESC")).toBe("ASC");
  expect(nextSortDirection("size", "name", "ASC")).toBe("ASC");
  expect(nextSortDirection("size", "name", "DESC")).toBe("ASC");
  // Preserve the manual legacy API's undefined-direction behavior.
  expect(nextSortDirection("name", "name", undefined)).toBe("DESC");
});
