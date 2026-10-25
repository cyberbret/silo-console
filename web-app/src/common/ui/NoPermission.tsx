// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { ReactNode } from "react";
import { LockIcon } from "mds";
import styled from "styled-components";
import { useT } from "i18n";
import { EmptyState } from "./EmptyState";
import { typography } from "./typography";

const Actions = styled.ul`
  list-style: none;
  padding: 0;
  li::before {
    content: none !important;
  }
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--silo-space-8);
  margin-top: var(--silo-space-12);
  code {
    ${typography.small}
    font-family: var(--font-mono);
    padding: var(--silo-space-4) var(--silo-space-8);
    border: 1px solid var(--silo-border);
    border-radius: var(--silo-radius-badge);
    background: var(--silo-surface);
    overflow-wrap: anywhere;
    max-width: 100%;
  }
`;

export const NoPermission = ({
  required,
  title,
  description,
  action,
  docsUrl,
  docsLabel,
  framed,
  headingLevel,
}: {
  required: string[];
  title?: string;
  description?: string;
  action?: ReactNode;
  docsUrl?: string;
  docsLabel?: string;
  framed?: boolean;
  headingLevel?: 2 | 3 | 4;
}) => {
  const t = useT();
  return (
    <EmptyState
      headingLevel={headingLevel}
      icon={<LockIcon />}
      title={title ?? t("Permission required")}
      action={action}
      docsUrl={docsUrl}
      docsLabel={docsLabel}
      framed={framed}
      description={
        <>
          {description ??
            t("Ask your administrator to grant the following IAM actions.")}
          <Actions aria-label={t("Required IAM actions")}>
            {Array.from(new Set(required)).map((action) => (
              <li key={action}>
                <code>{action}</code>
              </li>
            ))}
          </Actions>
        </>
      }
    />
  );
};
