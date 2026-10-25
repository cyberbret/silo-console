// This file is part of MinIO Console Server
// Copyright (c) 2021 MinIO, Inc.
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
import ConfirmDialog from "../../../../Common/ModalWrapper/ConfirmDialog";
import { ConfirmDeleteIcon, Switch } from "mds";
import { hasPermission } from "../../../../../../common/SecureComponent";
import { IAM_SCOPES } from "../../../../../../common/SecureComponent/permissions";
import { BucketVersioningResponse } from "api/consoleApi";
import { startMutationTask } from "../../../../Common/ObjectManager/mutationTasks";
import { useT } from "i18n";

interface IDeleteObjectProps {
  closeDeleteModalAndRefresh: (refresh: boolean) => void;
  deleteOpen: boolean;
  selectedObjects: string[];
  selectedBucket: string;

  versioning: BucketVersioningResponse;
}

const DeleteObject = ({
  closeDeleteModalAndRefresh,
  deleteOpen,
  selectedBucket,
  selectedObjects,

  versioning,
}: IDeleteObjectProps) => {
  const t = useT();
  const onClose = () => closeDeleteModalAndRefresh(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteVersions, setDeleteVersions] = useState<boolean>(false);
  const [bypassGovernance, setBypassGovernance] = useState<boolean>(false);

  // A bucket default does not describe retention on individual versions.
  // Keep bypass an explicit, permission-gated choice; SILO enforces the lock.
  const canBypass =
    hasPermission(selectedBucket, [
      IAM_SCOPES.S3_BYPASS_GOVERNANCE_RETENTION,
    ]) ||
    selectedObjects?.some((object) =>
      hasPermission(`${selectedBucket}/${object}`, [
        IAM_SCOPES.S3_BYPASS_GOVERNANCE_RETENTION,
      ]),
    );

  if (!selectedObjects) {
    return null;
  }
  const onConfirmDelete = () => {
    if (deleteLoading) return;
    setDeleteLoading(true);
    startMutationTask(
      "delete",
      selectedObjects.map((key) => ({
        bucket: selectedBucket,
        key,
        recursive: key.endsWith("/"),
        allVersions: deleteVersions,
        bypass: canBypass && bypassGovernance,
      })),
      "Delete Objects",
    );
    closeDeleteModalAndRefresh(false);
  };

  const isVersionedDelete =
    versioning?.status === "Enabled" || versioning?.status === "Suspended";

  return (
    <ConfirmDialog
      destructive
      title={t("Delete Objects")}
      confirmText={t("Delete")}
      isOpen={deleteOpen}
      titleIcon={<ConfirmDeleteIcon />}
      isLoading={deleteLoading}
      onConfirm={onConfirmDelete}
      onClose={onClose}
      confirmationContent={
        <Fragment>
          {t(
            "Are you sure you want to delete the selected {count} objects?",
          ).replace("{count}", () => String(selectedObjects.length))}{" "}
          {isVersionedDelete && (
            <Fragment>
              <br />
              <br />
              <Switch
                label={t("Delete All Versions")}
                indicatorLabels={[t("Yes"), t("No")]}
                checked={deleteVersions}
                value={"delete_versions"}
                id="delete-versions"
                name="delete-versions"
                onChange={(e) => {
                  setDeleteVersions(!deleteVersions);
                }}
                description=""
              />
              {canBypass && deleteVersions && (
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
              {deleteVersions && (
                <Fragment>
                  <div
                    style={{
                      marginTop: 10,
                      border: "1px solid var(--destructive)",
                      borderRadius: "var(--radius-control, 4px)",
                      padding: "6px 10px",
                      backgroundColor: "var(--destructive-bg)",
                      color: "var(--destructive-text)",
                    }}
                  >
                    {t(
                      "This will remove the objects as well as all of their versions,",
                    )}{" "}
                    <br />
                    {t("This action is irreversible.")}
                  </div>
                  <br />
                  {t("Are you sure you want to continue?")}
                </Fragment>
              )}
            </Fragment>
          )}
        </Fragment>
      }
    />
  );
};

export default DeleteObject;
