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

import { createUserCommands } from "common/mcli/commands";
import { FormCliEquivalent } from "common/mcli/FormCliEquivalent";
import React, { Fragment, useEffect } from "react";
import {
  BackLink,
  Button,
  CreateUserIcon,
  FormLayout,
  Grid,
  PageLayout,
  ProgressBar,
} from "mds";
import { createUserAsync, resetFormAsync } from "./thunk/AddUsersThunk";
import { modalStyleUtils } from "../Common/FormComponents/common/styleLibrary";

import { IAM_PAGES } from "../../../common/SecureComponent/permissions";
import { useNavigate } from "react-router-dom";
import { setErrorSnackMessage, setHelpName } from "../../../systemSlice";
import { AppState, useAppDispatch } from "../../../store";
import { useSelector } from "react-redux";
import {
  setAddLoading,
  setSelectedGroups,
  setSendEnabled,
} from "./AddUsersSlice";
import AddUserHelpBox from "./AddUserHelpBox";
import PageHeaderWrapper from "../Common/PageHeaderWrapper/PageHeaderWrapper";
import PolicySelectors from "../Policies/PolicySelectors";
import UserSelector from "./UserSelector";
import PasswordSelector from "./PasswordSelector";
import GroupsSelectors from "./GroupsSelectors";
import { useT } from "i18n";

const AddUser = () => {
  const dispatch = useAppDispatch();
  const t = useT();
  const userName = useSelector((state: AppState) => state.createUser.userName);
  const selectedPolicies = useSelector(
    (state: AppState) => state.createUser.selectedPolicies,
  );
  const selectedGroups = useSelector(
    (state: AppState) => state.createUser.selectedGroups,
  );
  const addLoading = useSelector(
    (state: AppState) => state.createUser.addLoading,
  );
  const sendEnabled = useSelector(
    (state: AppState) => state.createUser.sendEnabled,
  );
  const secretKeylength = useSelector(
    (state: AppState) => state.createUser.secretKeylength,
  );
  const navigate = useNavigate();
  dispatch(setSendEnabled());

  const saveRecord = (event: React.FormEvent) => {
    event.preventDefault();
    if (secretKeylength < 8) {
      dispatch(
        setErrorSnackMessage({
          errorMessage: t("Passwords must be at least 8 characters long"),
          detailedError: "",
        }),
      );
      dispatch(setAddLoading(false));
      return;
    }
    if (addLoading) {
      return;
    }
    dispatch(setAddLoading(true));
    dispatch(createUserAsync())
      .unwrap() // <-- async Thunk returns a promise, that can be 'unwrapped')
      .then(() => navigate(`${IAM_PAGES.USERS}`));
  };

  useEffect(() => {
    dispatch(setHelpName("add_user"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <Grid item xs={12}>
        <PageHeaderWrapper
          titleElement="h1"
          label={
            <BackLink
              label={t("Users")}
              onClick={() => navigate(IAM_PAGES.USERS)}
            />
          }
          help
        />
        <PageLayout>
          <FormLayout
            title={t("Create User")}
            icon={<CreateUserIcon />}
            helpBox={<AddUserHelpBox />}
          >
            <form
              noValidate
              autoComplete="off"
              onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                saveRecord(e);
              }}
            >
              <UserSelector />
              <PasswordSelector />
              <PolicySelectors selectedPolicy={selectedPolicies} />
              <GroupsSelectors
                selectedGroups={selectedGroups}
                setSelectedGroups={(elements: string[]) => {
                  dispatch(setSelectedGroups(elements));
                }}
              />
              {addLoading && (
                <Grid item xs={12}>
                  <ProgressBar />
                </Grid>
              )}

              <Grid item xs={12} sx={modalStyleUtils.modalButtonBar}>
                <Button
                  id={"clear-add-user"}
                  type="button"
                  variant="regular"
                  onClick={(e) => {
                    dispatch(resetFormAsync());
                  }}
                  label={t("Clear")}
                />

                <Button
                  id={"save-user"}
                  type="submit"
                  variant="callAction"
                  color="primary"
                  disabled={addLoading || !sendEnabled}
                  label={t("Save")}
                />
              </Grid>
              <FormCliEquivalent
                commands={createUserCommands({
                  accessKey: userName,
                  policies: selectedPolicies,
                  groups: selectedGroups,
                })}
                notes={[
                  t(
                    "Replace <SECRET> with your secret key. Secrets are never included in this preview.",
                  ),
                ]}
              />
            </form>
          </FormLayout>
        </PageLayout>
      </Grid>
    </Fragment>
  );
};

export default AddUser;
