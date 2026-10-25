// This file is part of MinIO Console Server
// Copyright (c) 2022 MinIO, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import React, { Fragment, useState } from "react";

import { ConfirmDeleteIcon, Switch, Grid, InputBox } from "mds";
import ConfirmDialog from "../../../../Common/ModalWrapper/ConfirmDialog";
import { hasPermission } from "../../../../../../common/SecureComponent";
import { IAM_SCOPES } from "../../../../../../common/SecureComponent/permissions";
import { startMutationTask } from "../../../../Common/ObjectManager/mutationTasks";
import { interpolate, useT } from "i18n";
import { ObjectLocation } from "../objectIdentity";

interface IDeleteNonCurrentProps {
  closeDeleteModalAndRefresh: (refresh: boolean) => void;
  deleteOpen: boolean;
  // The object whose non-current versions are deleted, captured by the caller
  // when the dialog opens so a later route change cannot retarget it.
  location: ObjectLocation;
}

const DeleteNonCurrentVersions = ({
  closeDeleteModalAndRefresh,
  deleteOpen,
  location,
}: IDeleteNonCurrentProps) => {
  const selectedBucket = location.bucket;
  const selectedObject = location.key;
  const t = useT();
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [typeConfirm, setTypeConfirm] = useState<string>("");
  const [bypassGovernance, setBypassGovernance] = useState<boolean>(false);

  // A bucket default does not describe retention on individual versions.
  // Keep bypass an explicit, permission-gated choice; SILO enforces the lock.
  const canBypass =
    hasPermission(selectedBucket, [
      IAM_SCOPES.S3_BYPASS_GOVERNANCE_RETENTION,
    ]) ||
    hasPermission(`${selectedBucket}/${selectedObject}`, [
      IAM_SCOPES.S3_BYPASS_GOVERNANCE_RETENTION,
    ]);

  if (!selectedObject) {
    return null;
  }
  const onConfirmDelete = () => {
    if (deleteLoading) return;
    setDeleteLoading(true);
    startMutationTask(
      "delete",
      [
        {
          bucket: selectedBucket,
          key: selectedObject,
          nonCurrent: true,
          bypass: canBypass && bypassGovernance,
        },
      ],
      "Delete Non-Current versions",
    );
    closeDeleteModalAndRefresh(false);
  };

  return (
    <ConfirmDialog
      destructive
      title={t("Delete Non-Current versions")}
      confirmText={t("Delete")}
      isOpen={deleteOpen}
      titleIcon={<ConfirmDeleteIcon />}
      isLoading={deleteLoading}
      onConfirm={onConfirmDelete}
      onClose={() => closeDeleteModalAndRefresh(false)}
      confirmButtonProps={{
        disabled: typeConfirm !== "YES, PROCEED" || deleteLoading,
      }}
      confirmationContent={
        <Fragment>
          {interpolate(
            t(
              "Are you sure you want to delete all the non-current versions for: {object}?",
            ),
            { object: <b>{selectedObject}</b> },
          )}{" "}
          <br />
          {canBypass && (
            <Fragment>
              <div
                style={{
                  marginTop: 10,
                }}
              >
                <Switch
                  label={t("Bypass Governance Mode")}
                  indicatorLabels={[t("Yes"), t("No")]}
                  checked={bypassGovernance}
                  value={"bypass_governance"}
                  id="bypass_governance"
                  name="bypass_governance"
                  onChange={(e) => {
                    setBypassGovernance(!bypassGovernance);
                  }}
                  description=""
                />
              </div>
            </Fragment>
          )}
          <br />
          {interpolate(t("To continue please type {phrase} in the box."), {
            phrase: <b>YES, PROCEED</b>,
          })}
          <br />
          <br />
          <Grid item xs={12}>
            <InputBox
              id="type-confirm"
              name="retype-tenant"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setTypeConfirm(event.target.value);
              }}
              label=""
              aria-label={t(
                "To continue please type {phrase} in the box.",
              ).replace("{phrase}", () => "YES, PROCEED")}
              value={typeConfirm}
            />
          </Grid>
        </Fragment>
      }
    />
  );
};

export default DeleteNonCurrentVersions;
