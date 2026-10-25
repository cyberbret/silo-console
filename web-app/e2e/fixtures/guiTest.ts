// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { test as base, expect } from "@playwright/test";
import { OwnedResources } from "./guiResources";

export const test = base.extend<{ owned: OwnedResources }>({
  owned: async ({}, use, testInfo) => {
    const owned = new OwnedResources(testInfo.testId);
    try {
      await use(owned);
    } finally {
      await owned.cleanup();
    }
  },
});
export { expect };
