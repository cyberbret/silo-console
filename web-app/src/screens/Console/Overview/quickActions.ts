// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { hasCreateBucketPermission } from "../../../common/SecureComponent/createBucketPermission";
import {
  CONSOLE_UI_RESOURCE,
  IAM_PAGES,
  IAM_SCOPES,
} from "../../../common/SecureComponent/permissions";
import { i18nKey } from "../../../i18n/lang";

export const quickActions = (
  permissions: Record<string, string[]> | undefined,
  features: readonly string[],
  hasPermission: (
    resource: string,
    scopes: string[],
    matchAll?: boolean,
  ) => boolean,
) =>
  [
    {
      id: "bucket",
      label: i18nKey("Create bucket"),
      path: `/buckets/${IAM_PAGES.ADD_BUCKETS}`,
      allowed: hasCreateBucketPermission(permissions),
    },
    {
      id: "user",
      label: i18nKey("Create user"),
      path: IAM_PAGES.USER_ADD,
      allowed:
        !features.includes("ldap-idp") &&
        hasPermission(
          CONSOLE_UI_RESOURCE,
          [
            IAM_SCOPES.ADMIN_CREATE_USER,
            IAM_SCOPES.ADMIN_LIST_USER_POLICIES,
            IAM_SCOPES.ADMIN_LIST_GROUPS,
            IAM_SCOPES.ADMIN_ATTACH_USER_OR_GROUP_POLICY,
          ],
          true,
        ),
    },
    {
      id: "access-key",
      label: i18nKey("Create access key"),
      path: IAM_PAGES.ACCOUNT_ADD,
      allowed: hasPermission(CONSOLE_UI_RESOURCE, [
        IAM_SCOPES.ADMIN_CREATE_SERVICEACCOUNT,
      ]),
    },
    // The Health page's route also permits ServerInfo, but report generation
    // itself requires OBDInfo. Navigation never starts a diagnostic operation.
    {
      id: "health",
      label: i18nKey("Generate health report"),
      path: IAM_PAGES.TOOLS_DIAGNOSTICS,
      allowed: hasPermission(CONSOLE_UI_RESOURCE, [
        IAM_SCOPES.ADMIN_HEALTH_INFO,
      ]),
    },
  ].filter((action) => action.allowed);
