// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { Suspense } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Button, PageLayout } from "mds";
import LandingRedirect from "./LandingRedirect";
import { useRouteContext } from "./useRouteContext";
import LoadingComponent from "../common/LoadingComponent";
import PageHeaderWrapper from "../screens/Console/Common/PageHeaderWrapper/PageHeaderWrapper";
import { i18nKey } from "../i18n/lang";
import { registry } from "./registry";
import { resolveRoute } from "./resolveRoute";
import {
  FeatureUnavailable,
  NoPermission,
  ConsoleNotFound,
} from "../common/ui";
import { useT } from "i18n";

const featureGuidance = {
  kms: {
    title: i18nKey("Encryption is not configured"),
    description: i18nKey(
      "Configure KES or KMS on the SILO server to manage encryption keys in Console.",
    ),
    docsUrl:
      "https://silo.pgsty.com/operations/server-side-encryption/configure-minio-kes/",
  },
  "local-identity": {
    title: i18nKey("Local identity management is unavailable"),
    description: i18nKey(
      "LDAP is enabled. Manage users and groups in your LDAP directory; connection settings are available on the LDAP configuration page.",
    ),
    docsUrl:
      "https://silo.pgsty.com/administration/identity-access-management/ad-ldap-access-management/",
  },
  distributed: {
    title: i18nKey("Tier creation is unavailable"),
    description: i18nKey(
      "This Console requires a distributed server setup to add a remote storage tier.",
    ),
    docsUrl:
      "https://silo.pgsty.com/administration/object-management/object-lifecycle-management/",
  },
  "full-console": {
    title: i18nKey("This page is unavailable in object browser mode"),
    description: i18nKey(
      "This Console is configured for object browsing only. Ask your administrator to enable the full Console to use this page.",
    ),
    docsUrl: "https://silo.pgsty.com/reference/minio-server/settings/console/",
  },
};

const ConsoleRoutes = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const result = resolveRoute(pathname, registry, useRouteContext());
  const def = result.kind === "not-found" ? undefined : result.def;
  const Page = def?.component;

  const fallback = (
    <>
      <PageHeaderWrapper
        titleElement="h1"
        label={def?.title ?? i18nKey("Page not found")}
      />
      <PageLayout sx={{ padding: 24 }}>
        {result.kind === "feature-off" ? (
          <FeatureUnavailable
            headingLevel={2}
            {...featureGuidance[result.feature]}
            framed
            docsLabel={t("Read the documentation")}
            action={
              <Button
                id="feature-go-to-buckets"
                variant="callAction"
                label={t("Go to Buckets")}
                onClick={() => navigate("/buckets")}
              />
            }
          />
        ) : result.kind === "forbidden" ? (
          <NoPermission
            headingLevel={2}
            required={result.def.permission ?? []}
            framed
            title={t("You do not have permission to view this page")}
            description={t(
              "Ask your administrator for access. This page checks the following IAM actions:",
            )}
            docsUrl="https://silo.pgsty.com/administration/identity-access-management/"
            docsLabel={t("Read the documentation")}
            action={
              <Button
                id="permission-go-to-buckets"
                variant="callAction"
                label={t("Go to Buckets")}
                onClick={() => navigate("/buckets")}
              />
            }
          />
        ) : (
          <ConsoleNotFound headingLevel={2} />
        )}
      </PageLayout>
    </>
  );

  return (
    <Routes>
      <Route index element={<LandingRedirect />} />
      {result.kind === "page" && def && Page && (
        <Route
          path={def.mountPath ?? def.path}
          element={
            <Suspense fallback={<LoadingComponent />}>
              <Page />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={fallback} />
    </Routes>
  );
};

export default ConsoleRoutes;
