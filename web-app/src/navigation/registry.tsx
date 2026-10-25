// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import type { PageDef } from "./resolveRoute";
import {
  adminUserPermissions,
  CONSOLE_UI_RESOURCE,
  IAM_PAGES,
  IAM_PAGES_PERMISSIONS,
  IAM_SCOPES,
  S3_ALL_RESOURCES,
} from "../common/SecureComponent/permissions";
import { i18nKey } from "../i18n/lang";

import AccessMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/AccessMenuIcon";
import AccountsMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/AccountsMenuIcon";
import AllBucketsIcon from "../../packages/mds/src/components/Icons/AllBucketsIcon";
import AuditLogsMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/AuditLogsMenuIcon";
import GroupsMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/GroupsMenuIcon";
import HealthMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/HealthMenuIcon";
import IdentityMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/IdentityMenuIcon";
import InspectMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/InspectMenuIcon";
import LambdaIcon from "../../packages/mds/src/components/Icons/LambdaIcon";
import LockOpenIcon from "../../packages/mds/src/components/Icons/LockOpenIcon";
import LoginIcon from "../../packages/mds/src/components/Icons/LoginIcon";
import LogsMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/LogsMenuIcon";
import MetricsMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/MetricsMenuIcon";
import MonitoringMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/MonitoringMenuIcon";
import PerformanceMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/PerformanceMenuIcon";
import ProfileMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/ProfileMenuIcon";
import RecoverIcon from "../../packages/mds/src/components/Icons/RecoverIcon";
import SettingsIcon from "../../packages/mds/src/components/Icons/SettingsIcon";
import TiersIcon from "../../packages/mds/src/components/Icons/TiersIcon";
import ToolsIcon from "../../packages/mds/src/components/Icons/ToolsIcon";
import TraceMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/TraceMenuIcon";
import UsersMenuIcon from "../../packages/mds/src/components/Icons/SidebarMenus/UsersMenuIcon";
import WatchIcon from "../../packages/mds/src/components/Icons/WatchIcon";
import EncryptionIcon from "../icons/SidebarMenus/EncryptionIcon";

export const menuSections = [
  { id: "identity", title: i18nKey("Identity"), icon: <IdentityMenuIcon /> },
  {
    id: "monitoring",
    title: i18nKey("Monitoring"),
    icon: <MonitoringMenuIcon />,
  },
  { id: "settings", title: i18nKey("Settings"), icon: <SettingsIcon /> },
  { id: "tools", title: i18nKey("Tools"), icon: <ToolsIcon /> },
] as const;

const Overview = React.lazy(
  () => import("../screens/Console/Overview/Overview"),
);
const Trace = React.lazy(() => import("../screens/Console/Trace/Trace"));
const Watch = React.lazy(() => import("../screens/Console/Watch/Watch"));
const HealthInfo = React.lazy(
  () => import("../screens/Console/HealthInfo/HealthInfo"),
);

const EventDestinations = React.lazy(
  () => import("../screens/Console/EventDestinations/EventDestinations"),
);
const AddEventDestination = React.lazy(
  () => import("../screens/Console/EventDestinations/AddEventDestination"),
);
const EventTypeSelector = React.lazy(
  () => import("../screens/Console/EventDestinations/EventTypeSelector"),
);

const ListTiersConfiguration = React.lazy(
  () =>
    import("../screens/Console/Configurations/TiersConfiguration/ListTiersConfiguration"),
);
const TierTypeSelector = React.lazy(
  () =>
    import("../screens/Console/Configurations/TiersConfiguration/TierTypeSelector"),
);
const AddTierConfiguration = React.lazy(
  () =>
    import("../screens/Console/Configurations/TiersConfiguration/AddTierConfiguration"),
);

const ErrorLogs = React.lazy(
  () => import("../screens/Console/Logs/ErrorLogs/ErrorLogs"),
);
const LogsSearchMain = React.lazy(
  () => import("../screens/Console/Logs/LogSearch/LogsSearchMain"),
);
const GroupsDetails = React.lazy(
  () => import("../screens/Console/Groups/GroupsDetails"),
);

const Tools = React.lazy(() => import("../screens/Console/Tools/Tools"));
const IconsScreen = React.lazy(
  () => import("../screens/Console/Common/IconsScreen"),
);

const Speedtest = React.lazy(
  () => import("../screens/Console/Speedtest/Speedtest"),
);

const ObjectBrowser = React.lazy(
  () => import("../screens/Console/ObjectBrowser/ObjectBrowser"),
);

const Buckets = React.lazy(() => import("../screens/Console/Buckets/Buckets"));

const EditBucketReplication = React.lazy(
  () =>
    import("../screens/Console/Buckets/BucketDetails/EditBucketReplication"),
);
const AddBucketReplication = React.lazy(
  () => import("../screens/Console/Buckets/BucketDetails/AddBucketReplication"),
);
const Policies = React.lazy(
  () => import("../screens/Console/Policies/Policies"),
);

const AddPolicyScreen = React.lazy(
  () => import("../screens/Console/Policies/AddPolicyScreen"),
);
const Dashboard = React.lazy(
  () => import("../screens/Console/Dashboard/Dashboard"),
);

const Account = React.lazy(() => import("../screens/Console/Account/Account"));

const AccountCreate = React.lazy(
  () => import("../screens/Console/Account/AddServiceAccountScreen"),
);

const Users = React.lazy(() => import("../screens/Console/Users/Users"));
const Groups = React.lazy(() => import("../screens/Console/Groups/Groups"));
const IDPOpenIDConfigurations = React.lazy(
  () => import("../screens/Console/IDP/IDPOpenIDConfigurations"),
);
const AddIDPOpenIDConfiguration = React.lazy(
  () => import("../screens/Console/IDP/AddIDPOpenIDConfiguration"),
);
const IDPLDAPConfigurationDetails = React.lazy(
  () => import("../screens/Console/IDP/LDAP/IDPLDAPConfigurationDetails"),
);
const IDPOpenIDConfigurationDetails = React.lazy(
  () => import("../screens/Console/IDP/IDPOpenIDConfigurationDetails"),
);

const License = React.lazy(() => import("../screens/Console/License/License"));
const ConfigurationOptions = React.lazy(
  () =>
    import("../screens/Console/Configurations/ConfigurationPanels/ConfigurationOptions"),
);

const AddGroupScreen = React.lazy(
  () => import("../screens/Console/Groups/AddGroupScreen"),
);
const SiteReplication = React.lazy(
  () =>
    import("../screens/Console/Configurations/SiteReplication/SiteReplication"),
);
const SiteReplicationStatus = React.lazy(
  () =>
    import("../screens/Console/Configurations/SiteReplication/SiteReplicationStatus"),
);

const AddReplicationSites = React.lazy(
  () =>
    import("../screens/Console/Configurations/SiteReplication/AddReplicationSites"),
);

const KMSRoutes = React.lazy(() => import("../screens/Console/KMS/KMSRoutes"));

const ComponentsScreen = React.lazy(
  () => import("../screens/Console/Common/ComponentsScreen"),
);

// Paths describe pages; mountPath preserves the base of existing nested routers.
// More specific matches are ranked by React Router, independent of table order.
export const registry: PageDef[] = [
  {
    id: "overview",
    path: "/overview",
    title: i18nKey("Overview"),
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.DASHBOARD],
    component: Overview,
    menu: { order: 0, icon: <MetricsMenuIcon /> },
  },
  {
    id: "browser",
    path: "/browser/*",
    title: i18nKey("Object Browser"),
    component: ObjectBrowser,
  },
  {
    id: "buckets",
    menu: { order: 1, icon: <AllBucketsIcon />, forceDisplay: true },
    path: IAM_PAGES.BUCKETS,
    title: i18nKey("Buckets"),
    component: Buckets,
    mountPath: "/buckets/*",
  },
  {
    id: "metrics",
    menu: { id: "monitorMetrics", order: 0, icon: <MetricsMenuIcon /> },
    path: IAM_PAGES.DASHBOARD,
    title: i18nKey("Metrics"),
    component: Dashboard,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.DASHBOARD],
    section: "monitoring",
  },
  {
    id: "add-bucket",
    path: "/buckets/add-bucket",
    title: i18nKey("Create bucket"),
    component: Buckets,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.ADD_BUCKETS],
    mountPath: "/buckets/*",
    authorize: (ctx, _params, scopes) => ctx.hasPermission("*", scopes),
  },
  {
    id: "legacy-add-bucket",
    path: "/add-bucket",
    title: i18nKey("Create bucket"),
    component: Buckets,
    mountPath: "/add-bucket/*",
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.ADD_BUCKETS],
    authorize: (ctx, _params, scopes) => ctx.hasPermission("*", scopes),
  },
  {
    id: "add-bucket-replication",
    path: IAM_PAGES.BUCKETS_ADD_REPLICATION,
    title: i18nKey("Set replication"),
    component: AddBucketReplication,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.BUCKETS_ADD_REPLICATION],
    authorize: (ctx, _params, scopes) => ctx.hasPermission("*", scopes),
  },
  {
    id: "edit-bucket-replication",
    path: IAM_PAGES.BUCKETS_EDIT_REPLICATION,
    title: i18nKey("Edit replication"),
    component: EditBucketReplication,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.BUCKETS_EDIT_REPLICATION],
    authorize: (ctx, _params, scopes) => ctx.hasPermission("*", scopes),
  },
  {
    id: "legacy-bucket",
    path: "/buckets/:bucketName",
    title: i18nKey("Buckets"),
    component: Buckets,
    mountPath: "/buckets/*",
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.BUCKETS_ADMIN_VIEW],
    authorize: (ctx, params, scopes) =>
      ctx.hasPermission(params.bucketName, scopes),
  },
  ...[
    "",
    "/summary",
    "/events",
    "/replication",
    "/lifecycle",
    "/access",
    "/prefix",
  ].map((tab): PageDef => ({
    id: `bucket-settings${tab}`,
    path: `/buckets/:bucketName/admin${tab}`,
    title: i18nKey("Buckets"),
    component: Buckets,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.BUCKETS_ADMIN_VIEW],
    mountPath: "/buckets/*",
    authorize: (ctx, params, scopes) =>
      ctx.hasPermission(params.bucketName, scopes),
  })),

  {
    id: "watch",
    menu: { id: "monitorWatch", order: 4, icon: <WatchIcon /> },
    path: IAM_PAGES.TOOLS_WATCH,
    title: i18nKey("Watch"),
    component: Watch,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.TOOLS_WATCH],
    section: "monitoring",
  },
  {
    id: "speedtest",
    menu: { id: "performance", order: 1, icon: <PerformanceMenuIcon /> },
    path: IAM_PAGES.TOOLS_SPEEDTEST,
    title: i18nKey("Performance"),
    component: Speedtest,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.TOOLS_SPEEDTEST],
    section: "tools",
  },
  {
    id: "users",
    menu: {
      order: 0,
      icon: <UsersMenuIcon />,
      authorize: (ctx) =>
        ctx.hasPermission(CONSOLE_UI_RESOURCE, adminUserPermissions) ||
        ctx.hasPermission(S3_ALL_RESOURCES, adminUserPermissions) ||
        ctx.hasPermission(CONSOLE_UI_RESOURCE, [IAM_SCOPES.ADMIN_ALL_ACTIONS]),
    },
    path: IAM_PAGES.USERS,
    title: i18nKey("Users"),
    component: Users,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.USERS],
    mountPath: "/identity/users/*",
    feature: "local-identity",
    section: "identity",
    authorize: (ctx) =>
      ctx.hasPermission(CONSOLE_UI_RESOURCE, [IAM_SCOPES.ADMIN_LIST_USERS]) ||
      ctx.hasPermission(S3_ALL_RESOURCES, [IAM_SCOPES.ADMIN_CREATE_USER]),
  },
  {
    id: "user",
    path: IAM_PAGES.USERS_VIEW,
    title: i18nKey("Users"),
    component: Users,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.USERS_VIEW],
    mountPath: "/identity/users/*",
    feature: "local-identity",
    section: "identity",
  },
  {
    id: "add-user",
    path: IAM_PAGES.USER_ADD,
    title: i18nKey("Create User"),
    component: Users,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.USER_ADD],
    mountPath: "/identity/users/*",
    feature: "local-identity",
    section: "identity",
  },
  {
    id: "user-access-key",
    path: IAM_PAGES.USER_SA_ACCOUNT_ADD,
    title: i18nKey("Create Access Key"),
    component: Users,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.USER_SA_ACCOUNT_ADD],
    mountPath: "/identity/users/*",
    feature: "local-identity",
    section: "identity",
  },
  {
    id: "groups",
    menu: { order: 1, icon: <GroupsMenuIcon /> },
    path: IAM_PAGES.GROUPS,
    title: i18nKey("Groups"),
    component: Groups,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.GROUPS],
    feature: "local-identity",
    section: "identity",
  },
  {
    id: "add-group",
    path: IAM_PAGES.GROUPS_ADD,
    title: i18nKey("Create Group"),
    component: AddGroupScreen,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.GROUPS_ADD],
    section: "identity",
  },
  {
    id: "group",
    path: IAM_PAGES.GROUPS_VIEW,
    title: i18nKey("Groups"),
    component: GroupsDetails,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.GROUPS_VIEW],
    section: "identity",
  },
  {
    id: "add-policy",
    path: IAM_PAGES.POLICY_ADD,
    title: i18nKey("Create Policy"),
    component: AddPolicyScreen,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.POLICY_ADD],
    section: "identity",
  },
  {
    id: "policy",
    path: "/policies/:policyName",
    title: i18nKey("Policies"),
    component: Policies,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.POLICIES_VIEW],
    mountPath: "/policies/*",
    section: "identity",
  },
  {
    id: "policies",
    menu: { order: 2, icon: <AccessMenuIcon /> },
    path: IAM_PAGES.POLICIES,
    title: i18nKey("Policies"),
    component: Policies,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.POLICIES],
    mountPath: "/policies/*",
    section: "identity",
  },
  {
    id: "ldap",
    menu: { order: 4, icon: <LoginIcon /> },
    path: IAM_PAGES.IDP_LDAP_CONFIGURATIONS,
    title: i18nKey("LDAP"),
    component: IDPLDAPConfigurationDetails,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.IDP_LDAP_CONFIGURATIONS],
    section: "identity",
  },
  {
    id: "openid",
    menu: { id: "openID", order: 3, icon: <LockOpenIcon /> },
    path: IAM_PAGES.IDP_OPENID_CONFIGURATIONS,
    title: i18nKey("OpenID"),
    component: IDPOpenIDConfigurations,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.IDP_OPENID_CONFIGURATIONS],
    section: "identity",
  },
  {
    id: "add-openid",
    path: IAM_PAGES.IDP_OPENID_CONFIGURATIONS_ADD,
    title: i18nKey("OpenID"),
    component: AddIDPOpenIDConfiguration,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.IDP_OPENID_CONFIGURATIONS_ADD],
    section: "identity",
  },
  {
    id: "openid-details",
    path: IAM_PAGES.IDP_OPENID_CONFIGURATIONS_VIEW,
    title: i18nKey("OpenID"),
    component: IDPOpenIDConfigurationDetails,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.IDP_OPENID_CONFIGURATIONS_VIEW],
    section: "identity",
  },
  {
    id: "trace",
    menu: { id: "monitorTrace", order: 3, icon: <TraceMenuIcon /> },
    path: IAM_PAGES.TOOLS_TRACE,
    title: i18nKey("Trace"),
    component: Trace,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.TOOLS_TRACE],
    section: "monitoring",
  },
  {
    id: "diagnostics",
    menu: { order: 0, icon: <HealthMenuIcon /> },
    path: IAM_PAGES.TOOLS_DIAGNOSTICS,
    title: i18nKey("Health"),
    component: HealthInfo,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.TOOLS_DIAGNOSTICS],
    section: "tools",
  },
  {
    id: "logs",
    menu: { id: "monitorLogs", order: 1, icon: <LogsMenuIcon /> },
    path: IAM_PAGES.TOOLS_LOGS,
    title: i18nKey("Logs"),
    component: ErrorLogs,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.TOOLS_LOGS],
    section: "monitoring",
  },
  {
    id: "audit",
    menu: { id: "monitorAudit", order: 2, icon: <AuditLogsMenuIcon /> },
    path: IAM_PAGES.TOOLS_AUDITLOGS,
    title: i18nKey("Audit"),
    component: LogsSearchMain,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.TOOLS_AUDITLOGS],
    section: "monitoring",
  },
  {
    id: "tools",
    path: IAM_PAGES.TOOLS,
    title: i18nKey("Tools"),
    component: Tools,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.TOOLS],
    mountPath: "/support/*",
    section: "tools",
  },
  {
    id: "profile",
    menu: { order: 2, icon: <ProfileMenuIcon /> },
    path: IAM_PAGES.PROFILE,
    title: i18nKey("Profile"),
    component: Tools,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.PROFILE],
    mountPath: "/support/*",
    section: "tools",
  },
  {
    id: "inspect",
    menu: { id: "inspectObjects", order: 3, icon: <InspectMenuIcon /> },
    path: IAM_PAGES.SUPPORT_INSPECT,
    title: i18nKey("Inspect"),
    component: Tools,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.SUPPORT_INSPECT],
    mountPath: "/support/*",
    section: "tools",
  },
  {
    id: "settings",
    menu: { id: "configurations", order: 0, icon: <SettingsIcon /> },
    path: IAM_PAGES.SETTINGS,
    title: i18nKey("Configuration"),
    component: ConfigurationOptions,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.SETTINGS],
    mountPath: "/settings/configurations/*",
    section: "settings",
  },
  {
    id: "settings-option",
    path: IAM_PAGES.SETTINGS_VIEW,
    title: i18nKey("Configuration"),
    component: ConfigurationOptions,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.SETTINGS_VIEW],
    mountPath: "/settings/configurations/*",
    section: "settings",
  },
  {
    id: "add-event-service",
    path: IAM_PAGES.EVENT_DESTINATIONS_ADD_SERVICE,
    title: i18nKey("Event Destinations"),
    component: AddEventDestination,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.EVENT_DESTINATIONS_ADD_SERVICE],
    section: "settings",
  },
  {
    id: "add-event",
    path: IAM_PAGES.EVENT_DESTINATIONS_ADD,
    title: i18nKey("Event Destinations"),
    component: EventTypeSelector,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.EVENT_DESTINATIONS_ADD],
    section: "settings",
  },
  {
    id: "events",
    menu: { id: "lambda", order: 1, icon: <LambdaIcon /> },
    path: IAM_PAGES.EVENT_DESTINATIONS,
    title: i18nKey("Events"),
    component: EventDestinations,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.EVENT_DESTINATIONS],
    section: "settings",
  },
  {
    id: "add-tier-service",
    path: IAM_PAGES.TIERS_ADD_SERVICE,
    title: i18nKey("Tiers"),
    component: AddTierConfiguration,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.TIERS_ADD_SERVICE],
    feature: "distributed",
    section: "settings",
  },
  {
    id: "add-tier",
    path: IAM_PAGES.TIERS_ADD,
    title: i18nKey("Tiers"),
    component: TierTypeSelector,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.TIERS_ADD],
    feature: "distributed",
    section: "settings",
  },
  {
    id: "tiers",
    menu: { order: 2, icon: <TiersIcon /> },
    path: IAM_PAGES.TIERS,
    title: i18nKey("Tiering"),
    component: ListTiersConfiguration,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.TIERS],
    section: "settings",
  },
  {
    id: "site-replication",
    menu: { id: "sitereplication", order: 3, icon: <RecoverIcon /> },
    path: IAM_PAGES.SITE_REPLICATION,
    title: i18nKey("Site Replication"),
    component: SiteReplication,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.SITE_REPLICATION],
    section: "settings",
  },
  {
    id: "site-replication-status",
    path: IAM_PAGES.SITE_REPLICATION_STATUS,
    title: i18nKey("Site Replication"),
    component: SiteReplicationStatus,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.SITE_REPLICATION_STATUS],
    section: "settings",
  },
  {
    id: "add-site-replication",
    path: IAM_PAGES.SITE_REPLICATION_ADD,
    title: i18nKey("Site Replication"),
    component: AddReplicationSites,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.SITE_REPLICATION_ADD],
    section: "settings",
  },
  {
    id: "access-keys",
    menu: {
      id: "nav-accesskeys",
      order: 2,
      icon: <AccountsMenuIcon />,
      forceDisplay: true,
    },
    path: IAM_PAGES.ACCOUNT,
    title: i18nKey("Access Keys"),
    component: Account,
  },
  {
    id: "add-access-key",
    path: IAM_PAGES.ACCOUNT_ADD,
    title: i18nKey("Create Access Key"),
    component: AccountCreate,
  },
  {
    id: "license",
    path: IAM_PAGES.LICENSE,
    title: i18nKey("License"),
    component: License,
  },
  {
    id: "kms-status",
    path: IAM_PAGES.KMS_STATUS,
    title: i18nKey("Encryption"),
    component: KMSRoutes,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.KMS_STATUS],
    mountPath: "/kms/*",
    feature: "kms",
    section: "settings",
  },
  {
    id: "kms-keys",
    menu: { id: "encryption", order: 4, icon: <EncryptionIcon /> },
    path: IAM_PAGES.KMS_KEYS,
    title: i18nKey("Encryption"),
    component: KMSRoutes,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.KMS_KEYS],
    mountPath: "/kms/*",
    feature: "kms",
    section: "settings",
  },
  {
    id: "kms-add-key",
    path: IAM_PAGES.KMS_KEYS_ADD,
    title: i18nKey("Encryption"),
    component: KMSRoutes,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.KMS_KEYS_ADD],
    mountPath: "/kms/*",
    feature: "kms",
    section: "settings",
  },
  {
    id: "kms",
    fallback: true,
    path: "/kms/*",
    title: i18nKey("Encryption"),
    component: KMSRoutes,
    permission: IAM_PAGES_PERMISSIONS[IAM_PAGES.KMS],
    feature: "kms",
    section: "settings",
  },
  {
    id: "icons",
    path: "/icons",
    title: i18nKey("Icons"),
    component: IconsScreen,
  },
  {
    id: "components",
    path: "/components",
    title: i18nKey("Components"),
    component: ComponentsScreen,
  },
];
