// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import styled from "styled-components";
import { useT } from "i18n";
import { VisuallyHidden } from "./shared";

const Row = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, minmax(0, 1fr));
  gap: var(--silo-space-16);
  align-items: center;
  height: var(--control-height, 36px);
  padding: 0 var(--silo-space-16);
  border-bottom: 1px solid var(--silo-border);
  &:last-child {
    border-bottom: 0;
  }
`;
const Cell = styled.span`
  height: 12px;
  width: 70%;
  border-radius: var(--silo-radius-input);
  background: var(--silo-surface-hover);
  &:first-child {
    width: 90%;
  }
`;

// Render inside the loading/empty slot (or a single spanning td), not as tbody.
export const SkeletonRows = ({
  rows = 5,
  columns,
}: {
  rows?: number;
  columns: number;
}) => {
  const t = useT();
  return (
    <div role="status" aria-busy="true">
      <VisuallyHidden>{t("Loading…")}</VisuallyHidden>
      <div aria-hidden="true">
        {Array.from({ length: Math.max(0, rows) }, (_, row) => (
          <Row key={row} $columns={Math.max(1, columns)}>
            {Array.from({ length: Math.max(1, columns) }, (_, column) => (
              <Cell key={column} />
            ))}
          </Row>
        ))}
      </div>
    </div>
  );
};
