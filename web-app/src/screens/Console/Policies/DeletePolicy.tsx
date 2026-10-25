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

import React, { useEffect, useRef, useState } from "react";
import ConfirmDialog from "../Common/ModalWrapper/ConfirmDialog";
import { ConfirmDeleteIcon, useModalPresence } from "mds";
import { setErrorSnackMessage } from "../../../systemSlice";
import { useAppDispatch } from "../../../store";
import { api } from "api";
import { ApiError, HttpResponse, Policy } from "api/consoleApi";
import { errorToHandler } from "api/errors";
import { formatText, useT } from "i18n";
import { hasPermission } from "../../../common/SecureComponent";
import {
  CONSOLE_UI_RESOURCE,
  deletePolicyPermissions,
  listPolicyPermissions,
} from "../../../common/SecureComponent/permissions";
import { attachmentCount, policyAction } from "./policyPresentation";

interface IDeletePolicyProps {
  closeDeleteModalAndRefresh: (refresh: boolean) => void;
  deleteOpen: boolean;
  policy: Policy;
}

const DeletePolicy = ({
  closeDeleteModalAndRefresh,
  deleteOpen,
  policy,
}: IDeletePolicyProps) => {
  const dispatch = useAppDispatch();
  const t = useT();
  const present = useModalPresence();
  const canDelete = hasPermission(CONSOLE_UI_RESOURCE, deletePolicyPermissions);
  const canList = hasPermission(CONSOLE_UI_RESOURCE, listPolicyPermissions);
  const action = policyAction(policy, canDelete);
  const [current, setCurrent] = useState<Policy | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const active = useRef(false);
  const submitting = useRef(false);

  useEffect(() => {
    active.current = deleteOpen && present;
    const controller = new AbortController();
    setCurrent(null);
    setLoadingInfo(true);
    if (active.current) {
      const unknown = {
        ...policy,
        userCount: undefined,
        groupCount: undefined,
      };
      if (!canList) {
        setCurrent(unknown);
        setLoadingInfo(false);
      } else
        api.policies
          .listPolicies(undefined, { signal: controller.signal })
          .then(({ data }) => {
            if (active.current && !controller.signal.aborted)
              setCurrent(
                data.policies?.find((item) => item.name === policy.name) ??
                  null,
              );
          })
          .catch(() => {
            if (active.current && !controller.signal.aborted)
              setCurrent(unknown);
          })
          .finally(() => {
            if (active.current && !controller.signal.aborted)
              setLoadingInfo(false);
          });
    }
    return () => {
      active.current = false;
      controller.abort();
    };
  }, [policy, deleteOpen, present, canList]);

  const allowed =
    !!current && policyAction(current, canDelete) === action && action !== null;
  const onConfirm = async () => {
    if (
      !active.current ||
      !allowed ||
      loadingInfo ||
      submitting.current ||
      !policy.name
    )
      return;
    submitting.current = true;
    setLoadingDelete(true);
    try {
      await api.policy.removePolicy(policy.name);
      if (active.current) closeDeleteModalAndRefresh(true);
    } catch (response) {
      const result = response as HttpResponse<void, ApiError>;
      const error =
        result.error || (await result.json?.().catch(() => undefined));
      if (active.current)
        dispatch(
          setErrorSnackMessage(
            errorToHandler(error || { message: t("Could not update policy") }),
          ),
        );
    } finally {
      submitting.current = false;
      if (active.current) setLoadingDelete(false);
    }
  };
  const users = attachmentCount(current?.userCount);
  const groups = attachmentCount(current?.groupCount);
  const reset = action === "reset";
  return (
    <ConfirmDialog
      destructive
      title={reset ? t("Reset to default") : t("Delete Policy")}
      confirmText={reset ? t("Reset to default") : t("Delete")}
      isOpen={deleteOpen}
      titleIcon={<ConfirmDeleteIcon />}
      isLoading={loadingDelete}
      confirmButtonProps={{
        disabled: loadingInfo || !allowed || loadingDelete,
      }}
      onConfirm={onConfirm}
      onClose={() => {
        if (!submitting.current) closeDeleteModalAndRefresh(false);
      }}
      confirmationContent={
        <>
          <p>
            {reset
              ? formatText(
                  t("Reset policy {name} to its default definition?"),
                  { name: policy.name || "" },
                )
              : formatText(
                  t("Are you sure you want to delete policy {name}?"),
                  { name: policy.name || "" },
                )}
          </p>
          {reset && (
            <p>
              {t(
                "The built-in policy will be restored to the SILO default definition.",
              )}
            </p>
          )}
          {loadingInfo ? (
            <p role="status">{t("Loading attachment information…")}</p>
          ) : !allowed ? (
            <p role="alert">
              {t(
                "This policy has changed or is no longer available. Refresh the list.",
              )}
            </p>
          ) : users === undefined || groups === undefined ? (
            <p>{t("Attachment information is unavailable.")}</p>
          ) : (
            <p>
              {formatText(
                t(
                  "This policy is attached to {users} users and {groups} groups.",
                ),
                { users, groups },
              )}{" "}
              {reset
                ? t("Their permissions will follow the default definition.")
                : t("They will lose the permissions it grants.")}
            </p>
          )}
        </>
      }
    />
  );
};
export default DeletePolicy;
