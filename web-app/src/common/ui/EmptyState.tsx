// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { ReactNode } from "react";
import { Box } from "mds";
import styled from "styled-components";
import { useLocalizedLink, useT } from "i18n";
import { typography } from "./typography";

const Container = styled(Box)<{ $compact: boolean; $framed: boolean }>`
  background: ${({ $framed }) =>
    $framed ? "var(--surface-3)" : "transparent"};
  box-shadow: ${({ $framed }) => ($framed ? "var(--shadow-2)" : "none")};
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-height: ${({ $compact }) => ($compact ? "160px" : "240px")};
  padding: var(--silo-space-24) var(--silo-space-16);
  gap: var(--silo-space-12);
  color: var(--silo-text);
`;
const Icon = styled.div`
  color: var(--silo-text-muted);
  line-height: 0;
  svg {
    width: 40px;
    height: 40px;
    fill: currentColor;
  }
`;
const Title = styled.h3`
  ${typography.section} margin: 0;
`;
const Description = styled.div`
  ${typography.body}
  color: var(--silo-text-secondary);
  max-width: 480px;
  overflow-wrap: anywhere;
`;
const DocsLink = styled.a`
  ${typography.body}
  color: var(--silo-primary);
  text-underline-offset: 3px;
  &:hover {
    color: var(--silo-primary-hover);
  }
`;

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  docsUrl,
  compact = false,
  framed = false,
  headingLevel = 3,
  docsLabel,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  docsUrl?: string;
  compact?: boolean;
  framed?: boolean;
  headingLevel?: 2 | 3 | 4;
  docsLabel?: string;
  children?: ReactNode;
}) => {
  const t = useT();
  const localize = useLocalizedLink();
  return (
    <Container
      useBackground={framed}
      $compact={compact}
      $framed={framed}
      role="region"
      aria-label={title}
    >
      {icon && <Icon aria-hidden="true">{icon}</Icon>}
      <Title as={`h${headingLevel}` as "h2" | "h3" | "h4"}>{title}</Title>
      {description && <Description>{description}</Description>}
      {children}
      {action}
      {docsUrl && (
        <DocsLink href={localize(docsUrl)} target="_blank" rel="noreferrer">
          {docsLabel ?? t("Learn more")}
        </DocsLink>
      )}
    </Container>
  );
};
