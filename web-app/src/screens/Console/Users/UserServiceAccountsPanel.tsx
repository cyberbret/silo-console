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

import { AccessKeyRowMenu } from "../Account/AccessKeyRowMenu";
import { EmptyState, SkeletonRows } from "common/ui";
import { AccountIcon } from "mds";
import { ModalPresence } from "common/ui/ModalPresence";
import React, { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AddIcon, Box, Button, DataTable, DeleteIcon, SectionTitle } from "mds";
import api from "../../../common/api";
import { NewServiceAccount } from "../Common/CredentialsPrompt/types";
import { ErrorResponseHandler } from "../../../common/types";
import DeleteServiceAccount from "../Account/DeleteServiceAccount";
import CredentialsPrompt from "../Common/CredentialsPrompt/CredentialsPrompt";

import DeleteMultipleServiceAccounts from "./DeleteMultipleServiceAccounts";
import { selectSAs } from "../Configurations/utils";
import EditServiceAccount from "../Account/EditServiceAccount";
import { CONSOLE_UI_RESOURCE } from "../../../common/SecureComponent/permissions";
import { hasPermission } from "../../../common/SecureComponent";
import {
  setErrorSnackMessage,
  setHelpName,
  setSnackBarMessage,
} from "../../../systemSlice";
import { useAppDispatch } from "../../../store";
import TooltipWrapper from "../Common/TooltipWrapper/TooltipWrapper";
import { ServiceAccounts } from "../../../api/consoleApi";
import { usersSort } from "../../../utils/sortFunctions";
import { accountTableColumns } from "../Account/AccountUtils";
import { useT } from "i18n";
import {
  buildUserServiceAccountTableActions,
  getUserServiceAccountCapabilities,
} from "./userServiceAccountControls";

interface IUserServiceAccountsProps {
  user: string;
  hasPolicy: boolean;
}

const UserServiceAccountsPanel = ({
  user,
  hasPolicy,
}: IUserServiceAccountsProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const t = useT();
  const {
    canCreate: canCreateServiceAccount,
    canList: canListServiceAccounts,
    canRemove: canRemoveServiceAccount,
    canUpdate: canUpdateServiceAccount,
  } = getUserServiceAccountCapabilities((scope) =>
    hasPermission(CONSOLE_UI_RESOURCE, [scope]),
  );

  const [records, setRecords] = useState<ServiceAccounts>([]);
  const [loading, setLoading] = useState<boolean>(canListServiceAccounts);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [selectedServiceAccount, setSelectedServiceAccount] = useState<
    string | null
  >(null);
  const [showNewCredentials, setShowNewCredentials] = useState<boolean>(false);
  const [newServiceAccount, setNewServiceAccount] =
    useState<NewServiceAccount | null>(null);
  const [selectedSAs, setSelectedSAs] = useState<string[]>([]);
  const [deleteMultipleOpen, setDeleteMultipleOpen] = useState<boolean>(false);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [serviceAccountReadOnly, setServiceAccountReadOnly] =
    useState<boolean>(false);

  useEffect(() => {
    setLoading(canListServiceAccounts);
  }, [canListServiceAccounts]);

  useEffect(() => {
    if (loading && canListServiceAccounts) {
      api
        .invoke(
          "GET",
          `/api/v1/user/${encodeURIComponent(user)}/service-accounts`,
        )
        .then((res: ServiceAccounts) => {
          setLoading(false);
          const sortedRows = res.sort(usersSort);
          setRecords(sortedRows);
        })
        .catch((err: ErrorResponseHandler) => {
          dispatch(setErrorSnackMessage(err));
          setLoading(false);
        });
    }
  }, [loading, setLoading, setRecords, user, dispatch, canListServiceAccounts]);

  const fetchRecords = () => {
    setLoading(true);
  };

  const closeDeleteModalAndRefresh = (refresh: boolean) => {
    setDeleteOpen(false);

    if (refresh) {
      fetchRecords();
    }
  };

  const closeDeleteMultipleModalAndRefresh = (refresh: boolean) => {
    setDeleteMultipleOpen(false);
    if (refresh) {
      dispatch(setSnackBarMessage(t("Access Keys deleted successfully.")));
      setSelectedSAs([]);
      setLoading(true);
    }
  };

  const closeCredentialsModal = () => {
    setShowNewCredentials(false);
    setNewServiceAccount(null);
  };

  const serviceAccountModalOpen = (
    selectedServiceAccount: string,
    readOnly: boolean,
  ) => {
    setSelectedServiceAccount(selectedServiceAccount);
    setServiceAccountReadOnly(readOnly);
    setEditOpen(true);
  };

  const confirmDeleteServiceAccount = (selectedServiceAccount: string) => {
    setSelectedServiceAccount(selectedServiceAccount);
    setDeleteOpen(true);
  };

  const closePolicyModal = () => {
    setEditOpen(false);
    setServiceAccountReadOnly(false);
    setLoading(true);
  };

  const tableActions = buildUserServiceAccountTableActions({
    canRemove: canRemoveServiceAccount,
    canUpdate: canUpdateServiceAccount,
    confirmDelete: confirmDeleteServiceAccount,
    openDetails: serviceAccountModalOpen,
  });

  useEffect(() => {
    dispatch(setHelpName("user_details_accounts"));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Fragment>
      <ModalPresence open={Boolean(deleteOpen)}>
        {deleteOpen && (
          <DeleteServiceAccount
            deleteOpen={deleteOpen}
            selectedServiceAccount={selectedServiceAccount}
            closeDeleteModalAndRefresh={(refresh: boolean) => {
              closeDeleteModalAndRefresh(refresh);
            }}
          />
        )}
      </ModalPresence>
      <ModalPresence open={Boolean(deleteMultipleOpen)}>
        {deleteMultipleOpen && (
          <DeleteMultipleServiceAccounts
            deleteOpen={deleteMultipleOpen}
            selectedSAs={selectedSAs}
            closeDeleteModalAndRefresh={closeDeleteMultipleModalAndRefresh}
          />
        )}
      </ModalPresence>
      <ModalPresence open={Boolean(showNewCredentials)}>
        {showNewCredentials && (
          <CredentialsPrompt
            newServiceAccount={newServiceAccount}
            open={showNewCredentials}
            closeModal={() => {
              closeCredentialsModal();
            }}
            entity={t("Access Key")}
          />
        )}
      </ModalPresence>
      <ModalPresence open={Boolean(editOpen)}>
        {editOpen && (
          <EditServiceAccount
            open={editOpen}
            selectedAccessKey={selectedServiceAccount}
            closeModalAndRefresh={closePolicyModal}
            readOnly={serviceAccountReadOnly}
          />
        )}
      </ModalPresence>

      <SectionTitle
        headingLevel={2}
        separator
        sx={{ marginBottom: 15 }}
        actions={
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <TooltipWrapper tooltip={t("Delete Selected")}>
              <Button
                id={"delete-selected"}
                onClick={() => {
                  setDeleteMultipleOpen(true);
                }}
                label={t("Delete Selected")}
                icon={<DeleteIcon />}
                disabled={selectedSAs.length === 0 || !canRemoveServiceAccount}
                variant={"danger"}
              />
            </TooltipWrapper>
            <TooltipWrapper tooltip={t("Create Access Key")}>
              <Button
                id={"create-service-account"}
                label={t("Create Access Key")}
                variant="callAction"
                icon={<AddIcon />}
                onClick={() => {
                  navigate(
                    `/identity/users/new-user-sa/${encodeURIComponent(user)}`,
                  );
                }}
                disabled={!hasPolicy || !canCreateServiceAccount}
              />
            </TooltipWrapper>
          </Box>
        }
      >
        {t("Access Keys")}
      </SectionTitle>

      <DataTable
        itemActions={tableActions.filter((action) => action.type === "view")}
        entityName={t("Access Keys")}
        loadingState={<SkeletonRows rows={5} columns={4} />}
        emptyState={
          <EmptyState
            icon={<AccountIcon />}
            title={t("No access keys yet")}
            description={t(
              "Access keys let applications connect with the permissions assigned to this user.",
            )}
            action={
              hasPolicy &&
              canCreateServiceAccount && (
                <Button
                  id="empty-list-action"
                  variant="callAction"
                  label={t("Create Access Key")}
                  onClick={() =>
                    navigate(
                      `/identity/users/new-user-sa/${encodeURIComponent(user)}`,
                    )
                  }
                />
              )
            }
          />
        }
        columns={[
          ...accountTableColumns(t),
          {
            label: t("Actions"),
            elementKey: "actions",
            priority: "high",
            width: 48,
            globalClass: "mds-row-actions",
            renderFullObject: true,
            renderFunction: (record: ServiceAccounts[number]) => (
              <AccessKeyRowMenu record={record} actions={tableActions} />
            ),
          },
        ]}
        onSelect={
          canRemoveServiceAccount
            ? (e) => selectSAs(e, setSelectedSAs, selectedSAs)
            : undefined
        }
        onSelectAll={
          canRemoveServiceAccount
            ? () => {
                const visible = records.map((r) => `${r.accessKey}`);
                const allVisible =
                  visible.length > 0 &&
                  visible.every((v) => selectedSAs.includes(v));
                setSelectedSAs(
                  allVisible
                    ? selectedSAs.filter((v) => !visible.includes(v))
                    : Array.from(new Set([...selectedSAs, ...visible])),
                );
              }
            : undefined
        }
        selectedItems={canRemoveServiceAccount ? selectedSAs : []}
        isLoading={loading}
        records={records}
        idField="accessKey"
      />
    </Fragment>
  );
};

export default UserServiceAccountsPanel;
