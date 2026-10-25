// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import {
  CONSOLE_UI_RESOURCE,
  IAM_SCOPES,
} from "../common/SecureComponent/permissions";
import type { RouteContext } from "./resolveRoute";

export const landingPath = (ctx: RouteContext): string =>
  !ctx.features.includes("object-browser-only") &&
  ctx.hasPermission(CONSOLE_UI_RESOURCE, [IAM_SCOPES.ADMIN_SERVER_INFO])
    ? "/overview"
    : "/buckets";
