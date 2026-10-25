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
import ConfirmDialog from "../../../../Common/ModalWrapper/ConfirmDialog";
import { ConfirmDeleteIcon, Switch } from "mds";
import { hasPermission } from "../../../../../../common/SecureComponent";
import { IAM_SCOPES } from "../../../../../../common/SecureComponent/permissions";
import { startMutationTask } from "../../../../Common/ObjectManager/mutationTasks";
import { interpolate, useT } from "i18n";
import { ObjectTarget } from "../objectIdentity";

interface IDeleteSelectedVersionsProps {
  closeDeleteModalAndRefresh: (refresh: boolean) => void;
  deleteOpen: boolean;
  // Concrete versions validated against the current listing when the dialog
  // opened; all of them belong to one bucket and key.
  targets: ObjectTarget[];
  onQueued: (targets: ObjectTarget[]) => void;
}

const DeleteObject = ({
  closeDeleteModalAndRefresh,
  deleteOpen,
  targets,
  onQueued,
}: IDeleteSelectedVersionsProps) => {
  const selectedBucket = targets[0]?.bucket || "";
  const selectedObject = targets[0]?.key || "";
  const selectedVersions = targets.map((target) => target.versionId);
  const t = useT();
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
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

  const onClose = () => closeDeleteModalAndRefresh(false);
  const onConfirmDelete = () => {
    if (deleteLoading) return;
    setDeleteLoading(true);
    startMutationTask(
      "delete",
      targets.map((target) => ({
        ...target,
        recursive: false,
        allVersions: false,
        bypass: canBypass && bypassGovernance,
      })),
      "Delete Versions",
    );
    onQueued(targets);
    closeDeleteModalAndRefresh(false);
  };

  if (targets.length === 0) {
    return null;
  }

  return (
    <ConfirmDialog
      destructive
      title={t("Delete Selected Versions")}
      confirmText={t("Delete")}
      isOpen={deleteOpen}
      titleIcon={<ConfirmDeleteIcon />}
      isLoading={deleteLoading}
      onConfirm={onConfirmDelete}
      onClose={onClose}
      confirmationContent={
        <Fragment>
          {interpolate(
            t(
              "Are you sure you want to delete the selected {count} versions for {object}?",
            ).replace("{count}", () => String(selectedVersions.length)),
            { object: <strong>{selectedObject}</strong> },
          )}
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
        </Fragment>
      }
    />
  );
};

export default DeleteObject;
