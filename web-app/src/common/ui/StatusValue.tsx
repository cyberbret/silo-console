// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { ReactNode } from "react";
import styled from "styled-components";
import { EditIcon } from "mds";
import { formatText, useT } from "i18n";
import { ActionIcon, Hint } from "./shared";
import { typography } from "./typography";

const Field = styled.div`
  ${typography.body}
  color: var(--silo-text);
  min-width: 0;
  overflow-wrap: anywhere;
`;
const Label = styled.div`
  ${typography.tableHeader}
  color: var(--silo-text-secondary);
  margin-bottom: var(--silo-space-4);
`;
const Value = styled.div`
  display: flex;
  align-items: center;
  gap: var(--silo-space-8);
  font-variant-numeric: tabular-nums;
`;

export const StatusValue = ({
  label,
  value,
  onEdit,
  editLabel,
}: {
  label: string;
  value: ReactNode;
  onEdit?: () => void;
  editLabel?: string;
}) => {
  const t = useT();
  const edit = editLabel || formatText(t("Edit {label}"), { label });
  return (
    <Field>
      <Label>{label}</Label>
      <Value>
        {value}
        {onEdit && (
          <Hint text={edit}>
            <ActionIcon type="button" aria-label={edit} onClick={onEdit}>
              <EditIcon aria-hidden="true" />
            </ActionIcon>
          </Hint>
        )}
      </Value>
    </Field>
  );
};
