// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import { objectActionState } from "../src/screens/Console/Buckets/ListBuckets/Objects/objectActionState";

test("delete markers explain every content action before permissions or type", () => {
  for (const action of [
    "download",
    "share",
    "preview",
    "tags",
    "legalHold",
    "retention",
    "restore",
    "inspect",
    "selectVersion",
  ] as const)
    expect(
      objectActionState({
        action,
        isDeleteMarker: true,
        allowed: false,
        previewSupported: false,
      }),
    ).toEqual({ disabled: true, reason: "This version is a delete marker." });
  expect(
    objectActionState({
      action: "delete",
      isDeleteMarker: true,
      explicitVersion: true,
    }),
  ).toEqual({ disabled: false });
});
test("read permissions and preview types have distinct reasons", () => {
  for (const action of ["download", "share", "preview"] as const) {
    expect(objectActionState({ action, allowed: false }).reason).toBe(
      "You need s3:GetObject permission.",
    );
    expect(
      objectActionState({ action, allowed: false, readVersion: true }).reason,
    ).toBe("You need s3:GetObjectVersion permission.");
  }
  expect(
    objectActionState({ action: "preview", previewSupported: false }),
  ).toEqual({
    disabled: true,
    reason: "Preview is not available for this file type.",
  });
});
test("lock availability and permissions match their existing combined guards", () => {
  for (const action of ["legalHold", "retention"] as const) {
    for (const locking of [false, true])
      for (const distributedSetup of [false, true])
        for (const allowed of [false, true])
          for (const isDeleteMarker of [false, true])
            for (const explicitVersion of [false, true]) {
              const state = objectActionState({
                action,
                locking,
                distributedSetup,
                allowed,
                isDeleteMarker,
                explicitVersion,
              });
              expect(state.disabled).toBe(
                !locking ||
                  !distributedSetup ||
                  !allowed ||
                  isDeleteMarker ||
                  explicitVersion,
              );
              expect(Boolean(state.reason)).toBe(state.disabled);
            }
    expect(
      objectActionState({ action, locking: false, allowed: false }).reason,
    ).toBe("Object Lock is not enabled on this bucket.");
  }
  expect(
    objectActionState({ action: "legalHold", locking: true, allowed: false })
      .reason,
  ).toBe("You need s3:PutObjectLegalHold permission.");
  expect(
    objectActionState({ action: "retention", locking: true, allowed: false })
      .reason,
  ).toBe("You need s3:PutObjectRetention permission.");
});
test("tags keep the explicit-version restriction, including an explicit latest ID", () => {
  expect(
    objectActionState({ action: "tags", explicitVersion: true }).reason,
  ).toBe("Tags can only be changed on the current version.");
  expect(objectActionState({ action: "tags", explicitVersion: false })).toEqual(
    { disabled: false },
  );
  expect(objectActionState({ action: "tags", allowed: false }).reason).toBe(
    "You need s3:PutObjectTagging permission.",
  );
});
test("selection, folders, versioning, rewind and remaining restrictions always explain disabled state", () => {
  for (const action of [
    "download",
    "share",
    "preview",
    "delete",
    "anonymousAccess",
  ] as const)
    expect(objectActionState({ action, selectionCount: 0 }).reason).toBe(
      "Select one or more objects first.",
    );
  for (const action of ["share", "preview", "anonymousAccess"] as const)
    expect(objectActionState({ action, selectionCount: 2 }).reason).toBe(
      "Select a single object first.",
    );
  expect(objectActionState({ action: "download", selectionCount: 2 })).toEqual({
    disabled: false,
  });
  expect(objectActionState({ action: "share", isPrefix: true }).reason).toBe(
    "Select a file instead of a folder.",
  );
  expect(
    objectActionState({ action: "anonymousAccess", isPrefix: false }).reason,
  ).toBe("Select a folder to change anonymous access.");
  expect(
    objectActionState({
      action: "versions",
      versionsAvailable: false,
      versioningEnabled: false,
    }).reason,
  ).toBe("Versioning is not enabled on this bucket.");
  expect(
    objectActionState({
      action: "versions",
      versionsAvailable: true,
      versioningEnabled: false,
    }),
  ).toEqual({ disabled: false });
  expect(
    objectActionState({ action: "rewind", versioningEnabled: false }).disabled,
  ).toBe(true);
  expect(
    objectActionState({ action: "refresh", rewindEnabled: true }).reason,
  ).toBe("Exit rewind mode to refresh the object list.");
  expect(
    objectActionState({ action: "deleteNonCurrent", versionsAvailable: false })
      .reason,
  ).toBe("There are no non-current versions to delete.");
  for (const action of [
    "delete",
    "inspect",
    "versions",
    "anonymousAccess",
    "refresh",
    "rewind",
  ] as const)
    expect(objectActionState({ action, allowed: false }).reason).toBeTruthy();
});
