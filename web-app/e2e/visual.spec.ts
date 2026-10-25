// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { join } from "node:path";
import { test, expect } from "./fixtures/guiTest";
import { guiEnvironment } from "./fixtures/guiEnvironment";
import {
  attachGuiEvidence,
  guiScreenMasks,
  guiScreens,
  guiVisualVariants,
  openGuiScreen,
} from "./fixtures/guiScreens";

// Selection and external snapshotPathTemplate belong to playwright.gui.config.
// Acceptance never creates or updates a missing baseline implicitly.
for (const variant of guiVisualVariants)
  for (const screen of guiScreens)
    test(`visual ${screen.id} ${variant.id}`, async ({ browser }, info) => {
      const { context, page, pageErrors, visualEvidence } = await openGuiScreen(
        browser,
        screen,
        variant,
        "en",
        true,
      );
      try {
        await info.attach("visual-data-provenance", {
          body: JSON.stringify(
            {
              mode: "Visual-only controlled clock and measurement fields; actual GET responses, identities, counts and health retained.",
              ...visualEvidence,
            },
            null,
            2,
          ),
          contentType: "application/json",
        });
        const masks = guiScreenMasks(screen, page);
        const name = `${screen.id}-${variant.id}.png`;
        await info.attach("visual-mask-reasons", {
          body: JSON.stringify(
            [
              ...masks.map(({ reason }) => reason),
              ...(screen.screenshotStyle
                ? [screen.screenshotStyle.reason]
                : []),
            ],
            null,
            2,
          ),
          contentType: "application/json",
        });
        const options = {
          fullPage: true,
          animations: "disabled" as const,
          mask: masks.map(({ locator }) => locator),
        };
        // The matcher accepts stylePath, whereas page.screenshot accepts style.
        // One temporary rule makes both captures identical without a broad mask.
        const style = screen.screenshotStyle
          ? await page.addStyleTag({ content: screen.screenshotStyle.css })
          : null;
        try {
          if (style) {
            await expect(
              page.locator('canvas[aria-hidden="true"]'),
            ).toBeHidden();
            if (variant.width >= 768)
              await expect(page.locator("aside h1")).toBeVisible();
            await expect(page.locator("#accessKey")).toBeVisible();
          }
          await expect(page).toHaveScreenshot(name, {
            ...options,
            maxDiffPixels: 0,
          });
          const path = join(guiEnvironment().screenshots, name);
          await page.screenshot({ ...options, path });
          await info.attach("actual-visual", {
            path,
            contentType: "image/png",
          });
        } finally {
          await style?.evaluate((element) => element.remove());
        }
        await attachGuiEvidence(page, info, pageErrors);
      } finally {
        try {
          await info.attach("visual-page-errors", {
            body: JSON.stringify(pageErrors),
            contentType: "application/json",
          });
        } finally {
          await context.close();
        }
      }
    });
