// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, Page } from "@playwright/test";

// Chromium 147 can accept hasTouch with its default contact count still zero.
// Set the supported nonzero count and verify the browser's real media/input state.
export async function emulateCoarsePointer(page: Page) {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  await expect
    .poll(() =>
      page.evaluate(() => ({
        coarse: matchMedia("(pointer: coarse)").matches,
        contacts: navigator.maxTouchPoints,
      })),
    )
    .toEqual({ coarse: true, contacts: 1 });
  // The page/context owns this session and closes it with the test browser.
}
