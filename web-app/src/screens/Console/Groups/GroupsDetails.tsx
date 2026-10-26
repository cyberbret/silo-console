// This file is part of MinIO Console Server
// Copyright (c) 2023 MinIO, Inc.
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

import { SkeletonRows } from "common/ui";
import { FilteredEmptyState } from "common/ui/FilteredEmptyState";
import { UsersIcon } from "mds";
import { EmptyState } from "common/ui/EmptyState";
import { nonEmptyNames } from "../Users/userList";
import { ModalPresence } from "common/ui/ModalPresence";
import React, { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AddIcon,
  BackLink,
  Box,
  Button,
  DataTable,
  Grid,
  GroupsIcon,
  IAMPoliciesIcon,
  PageLayout,
  ScreenTitle,
  SectionTitle,
  Switch,
  Tabs,
  TrashIcon,
  useAvailableWidth,
} from "mds";
import { api } from "api";
import { errorToHandler } from "api/errors";
import { Group } from "api/consoleApi";
import {
  addUserToGroupPermissions,
  CONSOLE_UI_RESOURCE,
  createGroupPermissions,
  editGroupMembersPermissions,
  enableDisableGroupPermissions,
  getGroupPermissions,
  IAM_PAGES,
  listUsersPermissions,
  permissionTooltipHelper,
  setGroupPoliciesPermissions,
  viewPolicyPermissions,
  viewUserPermissions,
} from "../../../common/SecureComponent/permissions";
import {
  hasPermission,
  SecureComponent,
} from "../../../common/SecureComponent";
import { setHelpName, setModalErrorSnackMessage } from "../../../systemSlice";
import { useAppDispatch } from "../../../store";
import { setSelectedPolicies } from "../Users/AddUsersSlice";
import SetPolicy from "../Policies/SetPolicy";
import AddGroupMember from "./AddGroupMember";
import DeleteGroup from "./DeleteGroup";
import SearchBox from "../Common/SearchBox";
import TooltipWrapper from "../Common/TooltipWrapper/TooltipWrapper";
import PageHeaderWrapper from "../Common/PageHeaderWrapper/PageHeaderWrapper";
import { i18nKey, useT } from "i18n";

// A route change owns a fresh set of reads, mutations and dialogs. In particular,
// an A -> B -> A navigation cannot revive a response from the first A instance.
const GroupsDetails = () => {
  const { groupName = "" } = useParams();
  return <GroupDetailsContent key={groupName} groupName={groupName} />;
};

const GroupDetailsContent = ({ groupName }: { groupName: string }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const statusPending = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [groupDetails, setGroupDetails] = useState<Group>({});
  const [policyOpen, setPolicyOpen] = useState<boolean>(false);
  const [usersOpen, setUsersOpen] = useState<boolean>(false);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [memberFilter, setMemberFilter] = useState<string>("");
  const [currentTab, setCurrentTab] = useState<string>("members");
  const { elementRef: tabsRef, width: availableWidth } = useAvailableWidth();
  const horizontalTabs = availableWidth < 760;
  const sectionTitleSx = {
    marginBottom: 16,
    ...(horizontalTabs && {
      flexDirection: "column" as const,
      alignItems: "stretch",
      "& > div": { flex: "0 0 auto", width: "100%", minWidth: 0 },
      "& > div:last-child": { paddingBottom: 16 },
    }),
  };

  const { policy = "", status: groupEnabled } = groupDetails;
  const members = groupDetails.members ?? [];
  const statusKnown = groupEnabled === "enabled" || groupEnabled === "disabled";
  const groupReady = !loading && !loadFailed && statusKnown;
  const canChangeGroup = groupReady && !statusUpdating;

  const filteredMembers = members.filter((elementItem) =>
    elementItem.includes(memberFilter.trim()),
  );

  const viewUser = hasPermission(
    CONSOLE_UI_RESOURCE,
    viewUserPermissions,
    true,
  );

  useEffect(() => {
    dispatch(setHelpName("group_details"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupPolicies = nonEmptyNames(policy.split(","));
  const isGroupEnabled = groupEnabled === "enabled";
  const memberActionText =
    members.length > 0 ? t("Edit Members") : t("Add Members");

  const getGroupDetails = hasPermission(
    CONSOLE_UI_RESOURCE,
    getGroupPermissions,
  );

  const canEditGroupMembers = hasPermission(
    CONSOLE_UI_RESOURCE,
    editGroupMembersPermissions,
    true,
  );

  const canSetPolicies = hasPermission(
    CONSOLE_UI_RESOURCE,
    setGroupPoliciesPermissions,
    true,
  );

  const canViewPolicy = hasPermission(
    CONSOLE_UI_RESOURCE,
    viewPolicyPermissions,
    true,
  );

  const canChangeStatus = hasPermission(
    CONSOLE_UI_RESOURCE,
    enableDisableGroupPermissions,
    true,
  );

  function fetchGroupInfo() {
    if (!alive.current) return;
    setLoading(true);
    setRevision((value) => value + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadFailed(false);
    if (!getGroupDetails || !groupName) {
      setGroupDetails({});
      setLoading(false);
      return () => controller.abort();
    }
    api.group
      .groupInfo(groupName, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setGroupDetails(data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        dispatch(setModalErrorSnackMessage(errorToHandler(err.error)));
        setGroupDetails({});
        setLoadFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [groupName, getGroupDetails, revision, dispatch]);

  function toggleGroupStatus(nextStatus: boolean) {
    if (
      statusPending.current ||
      !groupReady ||
      !canChangeStatus ||
      usersOpen ||
      policyOpen ||
      deleteOpen
    )
      return;
    statusPending.current = true;
    setStatusUpdating(true);
    return api.group
      .updateGroup(groupName, {
        status: nextStatus ? "enabled" : "disabled",
      })
      .then(({ data }) => {
        if (alive.current) setGroupDetails(data);
      })
      .catch((err) => {
        if (!alive.current) return;
        dispatch(setModalErrorSnackMessage(errorToHandler(err.error)));
        // A failed response may follow an applied write. Re-read before enabling
        // another status change; never turn a failed read into an empty edit.
        fetchGroupInfo();
      })
      .finally(() => {
        if (!alive.current) return;
        statusPending.current = false;
        setStatusUpdating(false);
      });
  }

  const groupReadFailure = (
    <EmptyState
      title={t("Error")}
      description={t("Refresh to try again.")}
      action={
        <Button id="retry-group" label={t("Retry")} onClick={fetchGroupInfo} />
      }
    />
  );

  const groupsTabContent = (
    <Box
      onMouseMove={() => {
        dispatch(setHelpName("groups_members"));
      }}
    >
      <SectionTitle
        headingLevel={2}
        separator
        sx={sectionTitleSx}
        actions={
          <Box
            sx={{
              display: "flex",
              gap: 8,
              minWidth: 0,
              width: "100%",
            }}
          >
            <SearchBox
              placeholder={t("Search members")}
              onChange={(searchText) => {
                setMemberFilter(searchText);
              }}
              value={memberFilter}
              sx={{
                flex: "1 1 auto",
                minWidth: 0,
                maxWidth: horizontalTabs ? "none" : 280,
              }}
            />
            <SecureComponent
              resource={CONSOLE_UI_RESOURCE}
              scopes={addUserToGroupPermissions}
              errorProps={{ disabled: true }}
            >
              <TooltipWrapper
                tooltip={
                  canEditGroupMembers
                    ? memberActionText
                    : permissionTooltipHelper(
                        createGroupPermissions,
                        i18nKey("edit Group membership"),
                      )
                }
              >
                <Button
                  id={"add-user-group"}
                  label={memberActionText}
                  variant="callAction"
                  icon={<AddIcon />}
                  onClick={() => {
                    setUsersOpen(true);
                  }}
                  disabled={!canEditGroupMembers || !canChangeGroup}
                />
              </TooltipWrapper>
            </SecureComponent>
          </Box>
        }
      >
        {t("Members")}
      </SectionTitle>
      <Grid item xs={12}>
        <SecureComponent
          resource={CONSOLE_UI_RESOURCE}
          scopes={listUsersPermissions}
          errorProps={{ disabled: true }}
        >
          <TooltipWrapper
            tooltip={
              viewUser
                ? ""
                : permissionTooltipHelper(
                    viewUserPermissions,
                    i18nKey("view User details"),
                  )
            }
          >
            <DataTable
              itemActions={[
                {
                  type: "view",
                  onClick: (userName) => {
                    navigate(
                      `${IAM_PAGES.USERS}/${encodeURIComponent(userName)}`,
                    );
                  },
                  isDisabled: !viewUser,
                },
              ]}
              columns={[{ label: t("Access Key") }]}
              selectedItems={[]}
              isLoading={loading}
              records={filteredMembers}
              entityName={t("Users")}
              loadingState={<SkeletonRows rows={5} columns={1} />}
              emptyState={
                loadFailed ? (
                  groupReadFailure
                ) : (
                  <FilteredEmptyState
                    filtered={Boolean(memberFilter.trim())}
                    onClear={() => setMemberFilter("")}
                    icon={<UsersIcon />}
                    title={t("No members yet")}
                    description={t(
                      "Add users to this group so they inherit its policies.",
                    )}
                    action={
                      canEditGroupMembers &&
                      canChangeGroup &&
                      hasPermission(
                        CONSOLE_UI_RESOURCE,
                        addUserToGroupPermissions,
                      ) && (
                        <Button
                          id="empty-list-action"
                          variant="callAction"
                          label={t("Add Members")}
                          onClick={() => setUsersOpen(true)}
                        />
                      )
                    }
                  />
                )
              }
            />
          </TooltipWrapper>
        </SecureComponent>
      </Grid>
    </Box>
  );

  const policiesTabContent = (
    <Fragment>
      <Box
        onMouseMove={() => {
          dispatch(setHelpName("groups_policies"));
        }}
      >
        <SectionTitle
          headingLevel={2}
          separator
          sx={sectionTitleSx}
          actions={
            <TooltipWrapper
              tooltip={
                canSetPolicies
                  ? t("Set Policies")
                  : permissionTooltipHelper(
                      setGroupPoliciesPermissions,
                      i18nKey("assign Policies"),
                    )
              }
            >
              <Button
                id={"set-policies"}
                label={t("Set Policies")}
                variant="callAction"
                icon={<IAMPoliciesIcon />}
                onClick={() => {
                  setPolicyOpen(true);
                }}
                disabled={!canSetPolicies || !canChangeGroup}
              />
            </TooltipWrapper>
          }
        >
          {t("Policies")}
        </SectionTitle>
      </Box>
      <Grid item xs={12}>
        <TooltipWrapper
          tooltip={
            canViewPolicy
              ? ""
              : permissionTooltipHelper(
                  viewPolicyPermissions,
                  i18nKey("view Policy details"),
                )
          }
        >
          <DataTable
            itemActions={[
              {
                type: "view",
                onClick: (policy) => {
                  navigate(
                    `${IAM_PAGES.POLICIES}/${encodeURIComponent(policy)}`,
                  );
                },
                isDisabled: !canViewPolicy,
              },
            ]}
            columns={[{ label: t("Policy") }]}
            isLoading={loading}
            records={groupPolicies}
            entityName={t("Policies")}
            loadingState={<SkeletonRows rows={5} columns={1} />}
            emptyState={
              loadFailed ? (
                groupReadFailure
              ) : (
                <EmptyState
                  icon={<IAMPoliciesIcon />}
                  title={t("No policies assigned")}
                  description={t(
                    "Policies attached to this group apply to all its members.",
                  )}
                  action={
                    canSetPolicies &&
                    canChangeGroup && (
                      <Button
                        id="empty-list-action"
                        variant="callAction"
                        label={t("Set Policies")}
                        onClick={() => setPolicyOpen(true)}
                      />
                    )
                  }
                />
              )
            }
          />
        </TooltipWrapper>
      </Grid>
    </Fragment>
  );

  return (
    <Fragment>
      <ModalPresence open={Boolean(policyOpen)}>
        {policyOpen ? (
          <SetPolicy
            open={policyOpen}
            selectedGroups={[groupName]}
            selectedUser={null}
            closeModalAndRefresh={() => {
              setPolicyOpen(false);
              fetchGroupInfo();
              dispatch(setSelectedPolicies([]));
            }}
          />
        ) : null}
      </ModalPresence>

      <ModalPresence open={Boolean(usersOpen)}>
        {usersOpen ? (
          <AddGroupMember
            selectedGroup={groupName}
            onSaveClick={() => {}}
            title={memberActionText}
            groupStatus={isGroupEnabled ? "enabled" : "disabled"}
            preSelectedUsers={members}
            open={usersOpen}
            onClose={() => {
              setUsersOpen(false);
              fetchGroupInfo();
            }}
          />
        ) : null}
      </ModalPresence>

      <ModalPresence open={Boolean(deleteOpen)}>
        {deleteOpen && (
          <DeleteGroup
            deleteOpen={deleteOpen}
            selectedGroups={[groupName]}
            closeDeleteModalAndRefresh={(isDelSuccess: boolean) => {
              setDeleteOpen(false);
              if (isDelSuccess) {
                navigate(IAM_PAGES.GROUPS);
              }
            }}
          />
        )}
      </ModalPresence>
      <PageHeaderWrapper
        label={
          <Fragment>
            <BackLink
              label={t("Groups")}
              onClick={() => navigate(IAM_PAGES.GROUPS)}
            />
          </Fragment>
        }
        help
      />
      <PageLayout>
        <Grid item xs={12}>
          <ScreenTitle
            icon={
              <Fragment>
                <GroupsIcon width={40} />
              </Fragment>
            }
            title={groupName}
            subTitle={null}
            bottomBorder
            actions={
              <Box
                sx={{
                  display: "flex",
                  fontSize: 14,
                  alignItems: "center",
                  gap: 15,
                }}
              >
                <span>{t("Group Status:")}</span>
                <span id="group-status-label" style={{ fontWeight: "bold" }}>
                  {!statusKnown
                    ? t("Unknown")
                    : isGroupEnabled
                      ? t("Enabled")
                      : t("Disabled")}
                </span>
                <TooltipWrapper
                  tooltip={
                    hasPermission(
                      CONSOLE_UI_RESOURCE,
                      enableDisableGroupPermissions,
                      true,
                    )
                      ? ""
                      : permissionTooltipHelper(
                          enableDisableGroupPermissions,
                          i18nKey("enable or disable Groups"),
                        )
                  }
                >
                  <SecureComponent
                    resource={CONSOLE_UI_RESOURCE}
                    scopes={enableDisableGroupPermissions}
                    errorProps={{ disabled: true }}
                    matchAll
                  >
                    <Switch
                      aria-label={t("Status")}
                      indicatorLabels={[t("Enabled"), t("Disabled")]}
                      disabled={
                        !canChangeGroup || usersOpen || policyOpen || deleteOpen
                      }
                      checked={isGroupEnabled}
                      value={"group_enabled"}
                      id="group-status"
                      name="group-status"
                      onChange={() => {
                        toggleGroupStatus(!isGroupEnabled);
                      }}
                      switchOnly
                    />
                  </SecureComponent>
                </TooltipWrapper>

                <TooltipWrapper tooltip={t("Delete Group")}>
                  <Button
                    aria-label={t("Delete group")}
                    disabled={statusUpdating}
                    id={"delete-user-group"}
                    variant="danger"
                    icon={<TrashIcon />}
                    onClick={() => {
                      setDeleteOpen(true);
                    }}
                  />
                </TooltipWrapper>
              </Box>
            }
            sx={{ marginBottom: 15 }}
          />
        </Grid>

        <Box elementRef={tabsRef} sx={{ minWidth: 0 }}>
          <Tabs
            horizontal={horizontalTabs}
            options={[
              {
                tabConfig: { id: "members", label: t("Members") },
                content: groupsTabContent,
              },
              {
                tabConfig: { id: "policies", label: t("Policies") },
                content: policiesTabContent,
              },
            ]}
            currentTabOrPath={currentTab}
            onTabClick={setCurrentTab}
          />
        </Box>
      </PageLayout>
    </Fragment>
  );
};

export default GroupsDetails;
