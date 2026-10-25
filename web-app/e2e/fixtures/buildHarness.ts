// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { build } from "vite";

// Vite can set NODE_ENV on the test worker. Match React's production exports
// while bundling a mounted harness, then leave later dev-server tests untouched.
export async function buildHarness(options: Parameters<typeof build>[0]) {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    return await build(options);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
}
