// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import {
  browseBucketPermissions,
  IAM_PAGES,
  IAM_PAGES_PERMISSIONS,
  IAM_SCOPES,
} from "../../../common/SecureComponent/permissions";
import { i18nKey } from "../../../i18n/lang";
import type { RouteContext } from "../../../navigation/resolveRoute";

export const bucketTabs = (
  bucket: string,
  ctx: RouteContext,
  siteReplication: boolean,
) => {
  const has = (scopes: string[]) => ctx.hasPermission(bucket, scopes);
  const settings =
    !ctx.features.includes("object-browser-only") &&
    has(IAM_PAGES_PERMISSIONS[IAM_PAGES.BUCKETS_ADMIN_VIEW]);
  const path = `/buckets/${encodeURIComponent(bucket)}/admin`;
  return [
    {
      id: "objects",
      label: i18nKey("Objects"),
      to: `/browser/${encodeURIComponent(bucket)}`,
      permitted: has(browseBucketPermissions),
    },
    {
      id: "summary",
      label: i18nKey("Summary"),
      to: `${path}/summary`,
      permitted: settings,
    },
    {
      id: "events",
      label: i18nKey("Events"),
      to: `${path}/events`,
      permitted:
        settings &&
        has([
          IAM_SCOPES.S3_GET_BUCKET_NOTIFICATIONS,
          IAM_SCOPES.S3_PUT_BUCKET_NOTIFICATIONS,
          IAM_SCOPES.S3_GET_ACTIONS,
          IAM_SCOPES.S3_PUT_ACTIONS,
        ]),
    },
    {
      id: "replication",
      label: i18nKey("Replication"),
      to: `${path}/replication`,
      permitted:
        settings &&
        ctx.distributedSetup &&
        !siteReplication &&
        has([
          IAM_SCOPES.S3_GET_REPLICATION_CONFIGURATION,
          IAM_SCOPES.S3_PUT_REPLICATION_CONFIGURATION,
          IAM_SCOPES.S3_GET_ACTIONS,
          IAM_SCOPES.S3_PUT_ACTIONS,
        ]),
    },
    {
      id: "lifecycle",
      label: i18nKey("Lifecycle"),
      to: `${path}/lifecycle`,
      permitted:
        settings &&
        ctx.distributedSetup &&
        has([
          IAM_SCOPES.S3_GET_LIFECYCLE_CONFIGURATION,
          IAM_SCOPES.S3_PUT_LIFECYCLE_CONFIGURATION,
          IAM_SCOPES.S3_GET_ACTIONS,
          IAM_SCOPES.S3_PUT_ACTIONS,
        ]),
    },
    {
      id: "access",
      label: i18nKey("Access"),
      to: `${path}/access`,
      permitted:
        settings &&
        has([
          IAM_SCOPES.ADMIN_GET_POLICY,
          IAM_SCOPES.ADMIN_LIST_USER_POLICIES,
          IAM_SCOPES.ADMIN_LIST_USERS,
        ]),
    },
    {
      id: "anonymous",
      label: i18nKey("Anonymous"),
      to: `${path}/prefix`,
      permitted:
        settings &&
        has([IAM_SCOPES.S3_GET_BUCKET_POLICY, IAM_SCOPES.S3_GET_ACTIONS]),
    },
  ].filter((tab) => tab.permitted);
};
