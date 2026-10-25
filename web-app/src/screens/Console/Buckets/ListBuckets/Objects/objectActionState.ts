// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { i18nKey } from "../../../../../i18n/lang";

type ObjectAction =
  | "download"
  | "share"
  | "preview"
  | "legalHold"
  | "retention"
  | "tags"
  | "inspect"
  | "versions"
  | "delete"
  | "anonymousAccess"
  | "rewind"
  | "refresh"
  | "restore"
  | "selectVersion"
  | "deleteNonCurrent";

interface ObjectActionContext {
  action: ObjectAction;
  allowed?: boolean;
  readVersion?: boolean;
  selectionCount?: number;
  isDeleteMarker?: boolean;
  isPrefix?: boolean;
  explicitVersion?: boolean;
  locking?: boolean;
  distributedSetup?: boolean;
  previewSupported?: boolean;
  versionsAvailable?: boolean;
  versioningEnabled?: boolean;
  rewindEnabled?: boolean;
}

export type ObjectActionState =
  { disabled: false; reason?: undefined } | { disabled: true; reason: string };

const permissionReasons = {
  download: i18nKey("You need s3:GetObject permission."),
  share: i18nKey("You need s3:GetObject permission."),
  preview: i18nKey("You need s3:GetObject permission."),
  legalHold: i18nKey("You need s3:PutObjectLegalHold permission."),
  retention: i18nKey("You need s3:PutObjectRetention permission."),
  tags: i18nKey("You need s3:PutObjectTagging permission."),
  inspect: i18nKey("You need admin:InspectData permission."),
  versions: i18nKey("You need permission to view object versions."),
  delete: i18nKey("You need s3:DeleteObject permission."),
  anonymousAccess: i18nKey("You need permission to change the bucket policy."),
  rewind: i18nKey("You need permission to read objects and bucket versioning."),
  refresh: i18nKey("You need s3:ListBucket permission."),
  restore: i18nKey("You need permission to restore this version."),
  selectVersion: i18nKey("You need permission to select this version."),
  deleteNonCurrent: i18nKey("You need permission to delete object versions."),
};

// One ordered decision supplies both the disabled bit and its explanation.
// Callers pass their existing IAM checks; this helper never grants permission.
export const objectActionState = (
  context: ObjectActionContext,
): ObjectActionState => {
  const { action, selectionCount, isDeleteMarker, explicitVersion } = context;
  let reason: string | undefined;
  const singleSelection = ["share", "preview", "anonymousAccess"].includes(
    action,
  );
  const lockingAction = action === "legalHold" || action === "retention";
  const readsObject = ["download", "share", "preview"].includes(action);
  if (selectionCount === 0) {
    reason = i18nKey("Select one or more objects first.");
  } else if (
    singleSelection &&
    selectionCount !== undefined &&
    selectionCount !== 1
  ) {
    reason = i18nKey("Select a single object first.");
  } else if (
    isDeleteMarker &&
    (readsObject ||
      lockingAction ||
      ["tags", "inspect", "restore", "selectVersion"].includes(action) ||
      (action === "delete" && !explicitVersion))
  ) {
    reason = i18nKey("This version is a delete marker.");
  } else if (lockingAction && !context.locking) {
    reason = i18nKey("Object Lock is not enabled on this bucket.");
  } else if (context.allowed === false) {
    reason =
      readsObject && context.readVersion
        ? i18nKey("You need s3:GetObjectVersion permission.")
        : permissionReasons[action];
  } else if ((action === "share" || action === "preview") && context.isPrefix) {
    reason = i18nKey("Select a file instead of a folder.");
  } else if (action === "anonymousAccess" && !context.isPrefix) {
    reason = i18nKey("Select a folder to change anonymous access.");
  } else if (action === "tags" && explicitVersion) {
    // The existing rule disallows ANY explicit ID, even the latest version's ID.
    reason = i18nKey("Tags can only be changed on the current version.");
  } else if ((lockingAction || action === "inspect") && explicitVersion) {
    reason = i18nKey("Open the current object to use this action.");
  } else if (
    (lockingAction || action === "inspect") &&
    context.distributedSetup === false
  ) {
    reason = i18nKey("This action requires a distributed server.");
  } else if (action === "preview" && context.previewSupported === false) {
    reason = i18nKey("Preview is not available for this file type.");
  } else if (
    (action === "versions" && context.versionsAvailable === false) ||
    (action === "rewind" && !context.versioningEnabled)
  ) {
    reason = context.versioningEnabled
      ? i18nKey("No object versions are available")
      : i18nKey("Versioning is not enabled on this bucket.");
  } else if (action === "refresh" && context.rewindEnabled) {
    reason = i18nKey("Exit rewind mode to refresh the object list.");
  } else if (
    action === "deleteNonCurrent" &&
    context.versionsAvailable === false
  ) {
    reason = i18nKey("There are no non-current versions to delete.");
  }
  return reason ? { disabled: true, reason } : { disabled: false };
};
