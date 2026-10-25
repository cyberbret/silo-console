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

import { setPoliciesCommands } from "common/mcli/commands";
import { FormCliEquivalent } from "common/mcli/FormCliEquivalent";
import React, { Fragment, useEffect, useState } from "react";
import get from "lodash/get";
import { useSelector } from "react-redux";
import { Button, FormLayout, ReadBox, Grid, ProgressBar } from "mds";

import { ErrorResponseHandler } from "../../../common/types";
import { setModalErrorSnackMessage } from "../../../systemSlice";
import { AppState, useAppDispatch } from "../../../store";
import { modalStyleUtils } from "../Common/FormComponents/common/styleLibrary";
import { User } from "../Users/types";
import { setSelectedPolicies } from "../Users/AddUsersSlice";
import ModalWrapper from "../Common/ModalWrapper/ModalWrapper";
import PolicySelectors from "./PolicySelectors";
import api from "../../../common/api";
import { useT } from "i18n";

interface ISetPolicyProps {
  closeModalAndRefresh: () => void;
  selectedUser: User | null;
  selectedGroups: string[] | null;
  open: boolean;
}

type GroupPolicyBaseline = {
  group: string;
  status: "loading" | "ready" | "error";
  policies: string[];
};

const SetPolicy = ({
  closeModalAndRefresh,
  selectedUser,
  selectedGroups,
  open,
}: ISetPolicyProps) => {
  const dispatch = useAppDispatch();
  const t = useT();
  //Local States
  const [loading, setLoading] = useState<boolean>(false);
  const [actualPolicy, setActualPolicy] = useState<string[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<string[]>([]);
  const [groupBaseline, setGroupBaseline] =
    useState<GroupPolicyBaseline | null>(null);
  const singleGroup = selectedGroups?.length === 1 ? selectedGroups[0] : null;
  const groupReady =
    singleGroup === null ||
    (open &&
      groupBaseline?.group === singleGroup &&
      groupBaseline.status === "ready");
  const groupStatusMessage =
    groupBaseline?.group === singleGroup && groupBaseline?.status === "error"
      ? t("Could not load current group policies. Reopen the dialog to retry.")
      : t("Loading current group policies…");
  const currentPolicies = useSelector(
    (state: AppState) => state.createUser.selectedPolicies,
  );
  const setPolicyAction = () => {
    if (!groupReady) return;
    let users = null;
    let groups = null;
    if (selectedGroups !== null) {
      groups = selectedGroups;
    } else {
      users = [" "];

      if (selectedUser !== null) {
        users = [selectedUser.accessKey];
      }
    }

    setLoading(true);

    api
      .invoke("PUT", `/api/v1/set-policy-multi`, {
        name: currentPolicies,
        groups: groups,
        users: users,
      })
      .then(() => {
        setLoading(false);
        closeModalAndRefresh();
      })
      .catch((err: ErrorResponseHandler) => {
        setLoading(false);
        dispatch(setModalErrorSnackMessage(err));
      });
  };

  const resetSelection = () => {
    setSelectedPolicy(actualPolicy);
    dispatch(setSelectedPolicies(actualPolicy));
  };

  useEffect(() => {
    let active = true;
    setGroupBaseline(null);
    if (!open) return;
    if (singleGroup !== null) {
      setGroupBaseline({ group: singleGroup, status: "loading", policies: [] });
      setActualPolicy([]);
      setSelectedPolicy([]);
      dispatch(setSelectedPolicies([]));
      api
        .invoke("GET", `/api/v1/group/${encodeURIComponent(singleGroup)}`)
        .then((res: { policy?: string }) => {
          if (!active) return;
          const policies = (res.policy || "").split(",").filter(Boolean);
          setGroupBaseline({ group: singleGroup, status: "ready", policies });
          setActualPolicy(policies);
          setSelectedPolicy(policies);
          dispatch(setSelectedPolicies(policies));
        })
        .catch((err: ErrorResponseHandler) => {
          if (!active) return;
          setGroupBaseline({
            group: singleGroup,
            status: "error",
            policies: [],
          });
          dispatch(setModalErrorSnackMessage(err));
        });
    } else {
      const policies: string[] = get(selectedUser, "policy", []);
      setActualPolicy(policies);
      setSelectedPolicy(policies);
      dispatch(setSelectedPolicies(policies));
    }
    return () => {
      active = false;
    };
  }, [open, singleGroup, selectedUser, dispatch]);

  const userName = get(selectedUser, "accessKey", "");

  return (
    <ModalWrapper
      onClose={() => {
        closeModalAndRefresh();
      }}
      modalOpen={open}
      title={t("Set Policies")}
    >
      <FormLayout withBorders={false} containerPadding={false}>
        {(selectedGroups?.length === 1 || selectedUser != null) && (
          <Fragment>
            <ReadBox
              label={
                selectedGroups !== null
                  ? t("Selected Group")
                  : t("Selected User")
              }
              sx={{ width: "100%" }}
            >
              {selectedGroups !== null ? selectedGroups[0] : userName}
            </ReadBox>
            <ReadBox label={t("Current Policy")} sx={{ width: "100%" }}>
              {groupReady ? actualPolicy.join(", ") : groupStatusMessage}
            </ReadBox>
          </Fragment>
        )}
        {selectedGroups && selectedGroups?.length > 1 && (
          <ReadBox label={t("Selected Groups")} sx={{ width: "100%" }}>
            {selectedGroups.join(", ")}
          </ReadBox>
        )}
        <Grid item xs={12}>
          <PolicySelectors selectedPolicy={selectedPolicy} />
        </Grid>
      </FormLayout>
      <Grid item xs={12} sx={modalStyleUtils.modalButtonBar}>
        <Button
          id={"reset"}
          type="button"
          variant="regular"
          onClick={resetSelection}
          disabled={!groupReady}
          label={t("Reset")}
        />
        <Button
          id={"save"}
          type="button"
          variant="callAction"
          color="primary"
          disabled={loading || !groupReady}
          onClick={setPolicyAction}
          label={t("Save")}
        />
      </Grid>
      <FormCliEquivalent
        commands={
          !groupReady
            ? []
            : selectedGroups !== null
              ? selectedGroups.flatMap((name) =>
                  setPoliciesCommands({
                    entity: "group",
                    name,
                    policies: currentPolicies,
                    currentPolicies:
                      singleGroup !== null ? groupBaseline!.policies : [],
                  }),
                )
              : setPoliciesCommands({
                  entity: "user",
                  name: userName,
                  policies: currentPolicies,
                  currentPolicies: actualPolicy,
                })
        }
        emptyMessage={groupReady ? t("No policy changes.") : groupStatusMessage}
      />
      {loading && (
        <Grid item xs={12}>
          <ProgressBar />
        </Grid>
      )}
    </ModalWrapper>
  );
};

export default SetPolicy;
