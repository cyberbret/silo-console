// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

test("frontend credits retain the workspace's provenance and license", () => {
  const workspace = new URL("../packages/mds/", import.meta.url);
  const manifest = JSON.parse(
    readFileSync(new URL("package.json", workspace), "utf8"),
  );
  expect(realpathSync(new URL("../node_modules/mds", import.meta.url))).toBe(
    realpathSync(workspace),
  );

  const report = execFileSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("../../hack/credits/frontend.mjs", import.meta.url),
      ),
    ],
    { encoding: "utf8" },
  );
  const heading = `${manifest.name}@${manifest.version} (${manifest.license})`;
  expect(report.split(heading)).toHaveLength(2);
  expect(report).toContain(
    `${heading}\n${manifest.repository.url}\nIn-tree workspace: web-app/packages/mds\n`,
  );
  expect(report).not.toContain("https://www.npmjs.com/package/mds\n");
  expect(report).toContain(
    readFileSync(new URL("LICENSE", workspace), "utf8").trim(),
  );
  expect(report).not.toContain("Font: Inter");
  expect(report).toContain("Font: Chakra Petch (SIL Open Font License 1.1)");
  expect(report).toContain("Copyright (c) 2026 Micka Touillaud");
  expect(report).toContain("Lucide 1.61.0 selected SVG icons");
  expect(report).toContain("c29c276f16590cf017126671535ad8c792be64d8");
  expect(report).toContain(
    readFileSync(
      new URL("../licenses/lucide-LICENSE.txt", import.meta.url),
      "utf8",
    ).trim(),
  );
  expect(report).toContain("Copyright (c) 2026 Lucide Icons and Contributors");
  expect(report).toContain("Copyright (c) 2013-present Cole Bemis");
});
