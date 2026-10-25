// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { existsSync, realpathSync } from "node:fs";
import {
  isAbsolute,
  resolve,
  join,
  dirname,
  basename,
  relative,
  sep,
} from "node:path";

export type GuiAccount = "admin" | "alice" | "bob";

// Resolve existing symlink ancestors even when the output directory is new.
export function externalDirectory(name: string): string {
  const value = process.env[name];
  if (!value || !isAbsolute(value))
    throw new Error(`${name} must be an absolute external directory`);
  let ancestor = resolve(value);
  const missing: string[] = [];
  while (!existsSync(ancestor)) {
    missing.unshift(basename(ancestor));
    ancestor = dirname(ancestor);
  }
  const path = join(realpathSync(ancestor), ...missing);
  for (let parent = path; ; parent = dirname(parent)) {
    if (existsSync(join(parent, ".git")))
      throw new Error(`${name} must be outside every Git checkout`);
    if (parent === dirname(parent)) break;
  }
  return path;
}
function httpURL(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is required`);
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error(`${name} must be an HTTP(S) origin without credentials`);
  return url.origin;
}
function overlaps(first: string, second: string) {
  const within = (a: string, b: string) => {
    const path = relative(a, b);
    return (
      path === "" ||
      (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`))
    );
  };
  return within(first, second) || within(second, first);
}
export function guiEnvironment() {
  const url = httpURL(process.env.CONSOLE_URL, "CONSOLE_URL");
  const artifacts = externalDirectory("GUI_E2E_ARTIFACTS");
  const screenshots = externalDirectory("GUI_E2E_SCREENSHOTS");
  const baselines =
    process.env.VISUAL === "1"
      ? externalDirectory("GUI_E2E_BASELINES")
      : undefined;
  if (
    overlaps(artifacts, screenshots) ||
    (baselines &&
      (overlaps(artifacts, baselines) || overlaps(screenshots, baselines)))
  )
    throw new Error(
      "GUI artifacts, screenshots and baselines must be separate directories",
    );
  const runId = process.env.GUI_E2E_RUN_ID || "discovery";
  if (!/^[a-z0-9][a-z0-9-]{0,27}$/.test(runId))
    throw new Error(
      "GUI_E2E_RUN_ID must contain 1–28 lowercase letters, digits or hyphens",
    );
  const authByAccount = Object.fromEntries(
    (["admin", "alice", "bob"] as const).map((account) => [
      account,
      join(artifacts, "auth", `${account}.json`),
    ]),
  ) as Record<GuiAccount, string>;
  return {
    url,
    artifacts,
    screenshots,
    baselines,
    runId,
    authByAccount,
    auth: authByAccount.admin,
    s3Endpoint: process.env.GUI_E2E_S3_ENDPOINT
      ? httpURL(process.env.GUI_E2E_S3_ENDPOINT, "GUI_E2E_S3_ENDPOINT")
      : undefined,
  };
}
export function guiCredentials(account: GuiAccount) {
  const username = account === "admin" ? process.env.GUI_E2E_USERNAME : account;
  const password =
    process.env[
      account === "admin"
        ? "GUI_E2E_PASSWORD"
        : `GUI_E2E_${account.toUpperCase()}_PASSWORD`
    ];
  if (!username || !password)
    throw new Error(`Missing GUI credentials for ${account}`);
  return { username, password };
}
