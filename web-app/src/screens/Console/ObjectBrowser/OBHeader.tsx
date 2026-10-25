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

import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { SecureComponent } from "../../../common/SecureComponent";
import { IAM_SCOPES } from "../../../common/SecureComponent/permissions";
import { AppState, useAppDispatch } from "../../../store";
import { setHelpName } from "../../../systemSlice";
import SearchBox from "../Common/SearchBox";
import { setSearchVersions } from "./objectBrowserSlice";
import FilterObjectsSB from "./FilterObjectsSB";
import { formatText, useT } from "i18n";

// Object-only toolbar content; the common bucket shell owns page navigation.
const OBHeader = ({
  bucketName,
  inputRef,
}: {
  bucketName: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) => {
  const dispatch = useAppDispatch();
  const t = useT();
  const versionsMode = useSelector(
    (state: AppState) => state.objectBrowser.versionsMode,
  );
  const versionedFile = useSelector(
    (state: AppState) => state.objectBrowser.versionedFile,
  );
  const searchVersions = useSelector(
    (state: AppState) => state.objectBrowser.searchVersions,
  );
  useEffect(() => {
    dispatch(setHelpName("object_browser"));
  }, [dispatch]);
  return !versionsMode ? (
    <SecureComponent
      scopes={[IAM_SCOPES.S3_LIST_BUCKET, IAM_SCOPES.S3_ALL_LIST_BUCKET]}
      resource={bucketName}
      errorProps={{ disabled: true }}
    >
      <FilterObjectsSB inputRef={inputRef} />
    </SecureComponent>
  ) : (
    <SearchBox
      inputRef={inputRef}
      placeholder={formatText(t("Start typing to filter versions of {file}"), {
        file: versionedFile,
      })}
      onChange={(value) => dispatch(setSearchVersions(value))}
      value={searchVersions}
    />
  );
};
export default OBHeader;
