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

import { LockIcon, LoginIcon } from "mds";
import { i18nKey } from "i18n/lang";

export const ldapHelpBoxContents = [
  {
    text: i18nKey(
      "SILO supports using an Active Directory or LDAP (AD/LDAP) service for external management of user identities. Configuring an external IDentity Provider (IDP) enables Single-Sign On (SSO) workflows, where applications authenticate against the external IDP before accessing SILO.",
    ),
    icon: <LoginIcon />,
    iconDescription: i18nKey("Create Configurations"),
  },
  {
    text: i18nKey(
      "SILO queries the configured Active Directory / LDAP server to verify the credentials specified by the application and optionally return a list of groups in which the user has membership. SILO supports two modes (Lookup-Bind Mode and Username-Bind Mode) for performing these queries",
    ),
    icon: null,
    iconDescription: "",
  },
  {
    text: i18nKey(
      "SILO recommends using Lookup-Bind mode as the preferred method for verifying AD/LDAP credentials. Username-Bind mode is a legacy method retained for backwards compatibility only.",
    ),
    icon: null,
    iconDescription: "",
  },
];

export const openIDHelpBoxContents = [
  {
    text: i18nKey(
      "SILO supports using an OpenID Connect (OIDC) compatible IDentity Provider (IDP) such as Okta, KeyCloak, Dex, Google, or Facebook for external management of user identities.",
    ),
    icon: <LockIcon />,
    iconDescription: i18nKey("Create Configurations"),
  },
  {
    text: i18nKey(
      "Configuring an external IDP enables Single-Sign On workflows, where applications authenticate against the external IDP before accessing SILO.",
    ),
    icon: null,
    iconDescription: "",
  },
];

// Display copy is translated by the shared IDP forms. Protocol examples (URLs,
// DNs, scope/filter syntax) are intentionally raw, not translation keys.
export const openIDFormFields = {
  config_url: {
    required: true,
    hasError: (s: string, editMode: boolean) => {
      return !s && editMode ? i18nKey("Config URL is required") : "";
    },
    label: i18nKey("Config URL"),
    tooltip: i18nKey("Config URL for identity provider configuration"),
    placeholder:
      "https://identity-provider-url/.well-known/openid-configuration",
    type: "text",
    editOnly: false,
  },
  client_id: {
    required: true,
    hasError: (s: string, editMode: boolean) => {
      return !s && editMode ? i18nKey("Client ID is required") : "";
    },
    label: i18nKey("Client ID"),
    tooltip: i18nKey("Identity provider Client ID"),
    placeholder: i18nKey("Enter Client ID"),
    type: "text",
    editOnly: false,
  },
  client_secret: {
    required: true,
    hasError: (s: string, editMode: boolean) => {
      return !s && editMode ? i18nKey("Client Secret is required") : "";
    },
    label: i18nKey("Client Secret"),
    tooltip: i18nKey("Identity provider Client Secret"),
    placeholder: i18nKey("Enter Client Secret"),
    type: "password",
    editOnly: true,
  },
  claim_name: {
    required: false,
    label: i18nKey("Claim Name"),
    tooltip: i18nKey(
      "Claim from which SILO will read the policy or role to use",
    ),
    placeholder: i18nKey("Enter Claim Name"),
    type: "text",
    hasError: (s: string, editMode: boolean) => "",
    editOnly: false,
  },
  display_name: {
    required: false,
    label: i18nKey("Display Name"),
    tooltip: "",
    placeholder: i18nKey("Enter Display Name"),
    type: "text",
    hasError: (s: string, editMode: boolean) => "",
    editOnly: false,
  },
  claim_prefix: {
    required: false,
    label: i18nKey("Claim Prefix"),
    tooltip: "",
    placeholder: i18nKey("Enter Claim Prefix"),
    type: "text",
    hasError: (s: string, editMode: boolean) => "",
    editOnly: false,
  },
  scopes: {
    required: false,
    label: i18nKey("Scopes"),
    tooltip: "",
    placeholder: "openid,profile,email",
    type: "text",
    hasError: (s: string, editMode: boolean) => "",
    editOnly: false,
  },
  redirect_uri: {
    required: false,
    label: i18nKey("Redirect URI"),
    tooltip: "",
    placeholder: "https://console-endpoint-url/oauth_callback",
    type: "text",
    hasError: (s: string, editMode: boolean) => "",
    editOnly: false,
  },
  role_policy: {
    required: false,
    label: i18nKey("Role Policy"),
    tooltip: "",
    placeholder: "readonly",
    type: "text",
    hasError: (s: string, editMode: boolean) => "",
    editOnly: false,
  },
  claim_userinfo: {
    required: false,
    label: i18nKey("Claim User Info"),
    tooltip: "",
    placeholder: i18nKey("Claim User Info"),
    type: "toggle",
    hasError: (s: string, editMode: boolean) => "",
    editOnly: false,
  },
  redirect_uri_dynamic: {
    required: false,
    label: i18nKey("Redirect URI Dynamic"),
    tooltip: "",
    placeholder: i18nKey("Redirect URI Dynamic"),
    type: "toggle",
    hasError: (s: string, editMode: boolean) => "",
    editOnly: false,
  },
};

export const ldapFormFields = {
  server_insecure: {
    required: true,
    hasError: (s: string, editMode: boolean) => {
      return !s && editMode ? i18nKey("Server Address is required") : "";
    },
    label: i18nKey("Server Insecure"),
    tooltip: i18nKey("Disable SSL certificate verification "),
    placeholder: "myldapserver.com:636",
    type: "toggle",
    editOnly: false,
  },
  server_addr: {
    required: true,
    hasError: (s: string, editMode: boolean) => {
      return !s && editMode ? i18nKey("Server Address is required") : "";
    },
    label: i18nKey("Server Address"),
    tooltip: i18nKey('AD/LDAP server address e.g. "myldapserver.com:636"'),
    placeholder: "myldapserver.com:636",
    type: "text",
    editOnly: false,
  },
  lookup_bind_dn: {
    required: true,
    hasError: (s: string, editMode: boolean) => {
      return !s && editMode ? i18nKey("Lookup Bind DN is required") : "";
    },
    label: i18nKey("Lookup Bind DN"),
    tooltip: i18nKey(
      "DN (Distinguished Name) for LDAP read-only service account used to perform DN and group lookups",
    ),
    placeholder: "cn=admin,dc=min,dc=io",
    type: "text",
    editOnly: false,
  },
  lookup_bind_password: {
    required: true,
    hasError: (s: string, editMode: boolean) => {
      return !s && editMode ? i18nKey("Lookup Bind Password is required") : "";
    },
    label: i18nKey("Lookup Bind Password"),
    tooltip: i18nKey(
      "Password for LDAP read-only service account used to perform DN and group lookups",
    ),
    placeholder: "admin",
    type: "password",
    editOnly: true,
  },
  user_dn_search_base_dn: {
    required: true,
    hasError: (s: string, editMode: boolean) => {
      return !s && editMode
        ? i18nKey("User DN Search Base DN is required")
        : "";
    },
    label: i18nKey("User DN Search Base"),
    tooltip: "",
    placeholder: "DC=example,DC=net",
    type: "text",
    editOnly: false,
  },
  user_dn_search_filter: {
    required: true,
    hasError: (s: string, editMode: boolean) => {
      return !s && editMode ? i18nKey("User DN Search Filter is required") : "";
    },
    label: i18nKey("User DN Search Filter"),
    tooltip: "",
    placeholder: "(sAMAccountName=%s)",
    type: "text",
    editOnly: false,
  },
  group_search_base_dn: {
    required: false,
    hasError: (s: string, editMode: boolean) => "",
    label: i18nKey("Group Search Base DN"),
    tooltip: "",
    placeholder: "ou=swengg,dc=min,dc=io",
    type: "text",
    editOnly: false,
  },
  group_search_filter: {
    required: false,
    hasError: (s: string, editMode: boolean) => "",
    label: i18nKey("Group Search Filter"),
    tooltip: "",
    placeholder: "(&(objectclass=groupofnames)(member=%d))",
    type: "text",
    editOnly: false,
  },
};
