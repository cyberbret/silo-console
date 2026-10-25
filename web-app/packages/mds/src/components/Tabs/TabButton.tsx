// This file is part of MinIO Design System
// Copyright (c) 2023 MinIO, Inc.
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

import React, { FC } from "react";
import styled from "styled-components";
import { TabButtonProps } from "./Tabs.types";
import { type } from "../../global/typography";

const TabButtonBase = styled.button`
  ${type("body")}
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: var(--gap, 8px);
  cursor: pointer;
  height: calc(var(--control-height, 36px) - var(--segment-pad, 4px) * 2);
  padding: 0 var(--control-padding, 12px);
  @media (pointer: coarse) { min-height: 40px; }
  border: 0;
  border-radius: var(--radius-control, 8px);
  background: transparent;
  color: var(--muted-foreground, #737373);
  &[aria-selected="true"],
  &[data-fluid-hover] {
    color: var(--foreground, #171717);
  }
  &[aria-selected="true"] {
    font-weight: var(--fw-semibold, 550);
  }
  &:disabled {
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid var(--focus-ring, #6b97ff);
    outline-offset: 1px;
  }
  svg {
    width: var(--icon-size, 16px);
    height: var(--icon-size, 16px);
  }
  .label {
    display: grid;
  }
  .label > span {
    grid-area: 1 / 1;
  }
  .measure {
    visibility: hidden;
    font-weight: var(--fw-semibold, 550);
  }
`;
const TabButton: FC<TabButtonProps> = ({
  id,
  panelId,
  index,
  tabIndex,
  onClick,
  label,
  disabled,
  icon,
  selected,
}) => (
  <TabButtonBase
    id={id}
    type="button"
    role="tab"
    aria-selected={!!selected}
    aria-controls={panelId}
    tabIndex={tabIndex}
    disabled={disabled}
    data-fluid-index={index}
    data-fluid-key={id}
    data-fluid-selected={selected}
    onClick={onClick}
  >
    {icon}
    <span className="label">
      <span className="measure" aria-hidden="true">
        {label}
      </span>
      <span>{label}</span>
    </span>
  </TabButtonBase>
);
export default TabButton;
