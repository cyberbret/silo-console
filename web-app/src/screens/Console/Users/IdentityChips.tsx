// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import styled from "styled-components";
import { Tooltip } from "common/Tooltip";
import { StatusBadge } from "common/ui/StatusBadge";
import { nonEmptyNames } from "./userList";

const Chips = styled.div`
  display: flex;
  align-items: center;
  gap: var(--silo-space-4);
  min-width: 0;
  > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  > span[tabindex] {
    flex-shrink: 0;
  }
`;

const IdentityChips = ({ names }: { names?: string[] }) => {
  const values = nonEmptyNames(names);
  if (!values.length) return <>—</>;
  return (
    <Chips>
      {values.slice(0, 3).map((name) => (
        <StatusBadge key={name} tone="neutral" dot={false} label={name} />
      ))}
      {values.length > 3 && (
        <Tooltip tooltip={values.slice(3).join(", ")}>
          <span tabIndex={0} onClick={(event) => event.stopPropagation()}>
            <StatusBadge
              tone="neutral"
              dot={false}
              label={`+${values.length - 3}`}
            />
          </span>
        </Tooltip>
      )}
    </Chips>
  );
};

export default IdentityChips;
