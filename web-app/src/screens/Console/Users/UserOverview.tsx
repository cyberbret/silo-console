// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { type } from "mds";
import { SkeletonRows, StatusBadge } from "common/ui";
import { api } from "../../../api";
import { useT } from "i18n";
import {
  CONSOLE_UI_RESOURCE,
  getGroupPermissions,
  IAM_PAGES,
  viewPolicyPermissions,
} from "../../../common/SecureComponent/permissions";
import { hasPermission } from "../../../common/SecureComponent";
import { getUserServiceAccountCapabilities } from "./userServiceAccountControls";
import {
  GroupPolicyResult,
  inheritedPolicies,
  loadGroupPolicies,
} from "./inheritedPolicies";
import { nonEmptyNames } from "./userList";

const Overview = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;
const Section = styled.section`
  min-width: 0;
  padding: 16px;
  border-radius: var(--radius-card);
  background: var(--surface-3);
  box-shadow: var(--shadow-2);
  h2 {
    ${type("title")} margin: 0 0 12px;
  }
  p {
    ${type("body")} margin: 8px 0;
  }
  a {
    color: var(--foreground);
    text-underline-offset: 3px;
    overflow-wrap: anywhere;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li + li {
    border-top: 1px solid var(--border);
    margin-top: 8px;
    padding-top: 8px;
  }
  && li::before {
    content: none;
  }
`;
const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  a {
    border-radius: var(--radius-control);
    text-decoration: none;
  }
  a:hover span {
    border-color: var(--foreground);
  }
`;

interface Props {
  user: string;
  policies: string[];
  groups: string[];
  statusControl: ReactNode;
}

const UserOverview = ({ user, policies, groups, statusControl }: Props) => {
  const t = useT();
  const canGetGroup = hasPermission(CONSOLE_UI_RESOURCE, getGroupPermissions);
  const canViewPolicy = hasPermission(
    CONSOLE_UI_RESOURCE,
    viewPolicyPermissions,
  );
  const canListKeys = getUserServiceAccountCapabilities((scope) =>
    hasPermission(CONSOLE_UI_RESOURCE, [scope]),
  ).canList;
  const [results, setResults] = useState<GroupPolicyResult[] | null>(null);
  const [keyCount, setKeyCount] = useState<number | undefined>();
  const [keysLoading, setKeysLoading] = useState(true);
  const groupKey = JSON.stringify(nonEmptyNames(groups));
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    const names: string[] = JSON.parse(groupKey);
    setResults(null);
    setKeyCount(undefined);
    setKeysLoading(canListKeys);
    if (canGetGroup)
      loadGroupPolicies(names, controller.signal, async (name, signal) => {
        const { data } = await api.group.groupInfo(name, { signal });
        if (!data || data.name !== name)
          throw new Error("Group identity mismatch");
        return data;
      }).then((data) => {
        if (current && !controller.signal.aborted) setResults(data);
      });
    else setResults([]);
    if (canListKeys)
      api.user
        .listAUserServiceAccounts(user, { signal: controller.signal })
        .then(({ data }) => {
          if (current && Array.isArray(data)) setKeyCount(data.length);
        })
        .catch(() => {
          /* An unavailable count stays unknown. */
        })
        .finally(() => {
          if (current) setKeysLoading(false);
        });
    return () => {
      current = false;
      controller.abort();
    };
  }, [user, groupKey, canGetGroup, canListKeys]);

  const direct = nonEmptyNames(policies);
  const names = nonEmptyNames(groups);
  const inherited = inheritedPolicies(results ?? [], direct);
  const incomplete = (results ?? []).filter(
    (result) =>
      result.state === "error" ||
      (result.state === "ready" && result.group.status !== "enabled"),
  );
  const policyChip = (name: string) =>
    canViewPolicy ? (
      <Link to={`${IAM_PAGES.POLICIES}/${encodeURIComponent(name)}`}>
        <StatusBadge tone="neutral" dot={false} label={name} />
      </Link>
    ) : (
      <StatusBadge tone="neutral" dot={false} label={name} />
    );
  const groupChip = (name: string) =>
    canGetGroup ? (
      <Link to={`${IAM_PAGES.GROUPS}/${encodeURIComponent(name)}`}>
        <StatusBadge tone="neutral" dot={false} label={name} />
      </Link>
    ) : (
      <StatusBadge tone="neutral" dot={false} label={name} />
    );
  const groupLink = (name: string) =>
    canGetGroup ? (
      <Link to={`${IAM_PAGES.GROUPS}/${encodeURIComponent(name)}`}>{name}</Link>
    ) : (
      name
    );
  return (
    <Overview>
      <Section>
        <h2>{t("Status")}</h2>
        <Chips>{statusControl}</Chips>
      </Section>
      <Section>
        <h2>{t("Access Keys")}</h2>
        {keysLoading ? (
          <SkeletonRows rows={1} columns={1} />
        ) : (
          <>
            <p
              style={{ fontVariantNumeric: "tabular-nums" }}
              data-testid="user-key-count"
            >
              {keyCount ?? "—"}
            </p>
            {keyCount === undefined && (
              <p>{t("Access-key count is unavailable.")}</p>
            )}
          </>
        )}
      </Section>
      <Section>
        <h2>{t("Direct policies")}</h2>
        <Chips>
          {direct.length ? (
            direct.map((name) => <span key={name}>{policyChip(name)}</span>)
          ) : (
            <p>{t("No policies assigned")}</p>
          )}
        </Chips>
      </Section>
      <Section>
        <h2>{t("Groups")}</h2>
        <Chips>
          {names.length ? (
            names.map((name) => <span key={name}>{groupChip(name)}</span>)
          ) : (
            <p>{t("No groups assigned")}</p>
          )}
        </Chips>
      </Section>
      <Section style={{ gridColumn: "1 / -1" }}>
        <h2>{t("Policies inherited through groups")}</h2>
        {results === null ? (
          <SkeletonRows rows={3} columns={2} />
        ) : (
          <>
            {!canGetGroup && names.length > 0 && (
              <p>{t("Group policy information is unavailable.")}</p>
            )}
            <ul>
              {inherited.map((policy) => (
                <li key={policy.name}>
                  <Chips>
                    {policyChip(policy.name)}
                    {policy.direct && (
                      <StatusBadge
                        tone="neutral"
                        dot={false}
                        label={t("Also assigned directly")}
                      />
                    )}
                  </Chips>
                  <p>
                    {t("From groups:")}{" "}
                    {policy.groups.map((name, index) => (
                      <React.Fragment key={name}>
                        {index > 0 && ", "}
                        {groupLink(name)}
                      </React.Fragment>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
            {incomplete.map((result) => (
              <p
                key={result.name}
                role={result.state === "error" ? "status" : undefined}
              >
                {groupLink(result.name)}:{" "}
                {result.state === "error"
                  ? t("Group policies could not be loaded.")
                  : result.group.status === "disabled"
                    ? t("Group is disabled; its policies are not inherited.")
                    : t(
                        "Group status is unavailable; inherited permissions are unknown.",
                      )}
              </p>
            ))}
            {!inherited.length &&
              !incomplete.length &&
              (canGetGroup || !names.length) && (
                <p>{t("No inherited group policies")}</p>
              )}
            {incomplete.some((result) => result.state === "error") && (
              <p>
                {t(
                  "Some group policies are unavailable. Refresh to try again.",
                )}
              </p>
            )}
          </>
        )}
      </Section>
    </Overview>
  );
};

export default UserOverview;
