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

import React from "react";
import { IAM_PAGES } from "../../../common/SecureComponent/permissions";
import { LockIcon } from "mds";
import AddIDPConfiguration from "./AddIDPConfiguration";
import { openIDFormFields, openIDHelpBoxContents } from "./utils";
import AddIDPConfigurationHelpBox from "./AddIDPConfigurationHelpbox";
import { i18nKey } from "i18n/lang";

const AddIDPOpenIDConfiguration = () => {
  return (
    <AddIDPConfiguration
      icon={<LockIcon />}
      helpBox={
        <AddIDPConfigurationHelpBox
          helpText={i18nKey("Learn more about OpenID Connect Configurations")}
          contents={openIDHelpBoxContents}
          docLink={
            "https://silo.pgsty.com/operations/external-iam/#openid-connect-oidc"
          }
          docText={i18nKey("Learn more about OpenID Connect Configurations")}
        />
      }
      header={i18nKey("OpenID Configurations")}
      backLink={IAM_PAGES.IDP_OPENID_CONFIGURATIONS}
      title={i18nKey("Create OpenID Configuration")}
      formFields={openIDFormFields}
    />
  );
};

export default AddIDPOpenIDConfiguration;
