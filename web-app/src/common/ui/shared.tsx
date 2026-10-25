// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { AriaAttributes, ComponentProps, ReactElement } from "react";
import { IconButton, Tooltip } from "mds";
import styled from "styled-components";

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`;

export const ActionIcon = styled(IconButton)`
  && {
    width: var(--control-height, 36px);
    height: var(--control-height, 36px);
    flex-shrink: 0;
    border-radius: var(--silo-radius-button);
    color: var(--silo-text-secondary);
    background: transparent;
    transition: background-color var(--silo-motion-hover);
  }
  @media (pointer: coarse) {
    && {
      width: 40px;
      height: 40px;
    }
  }
  && svg {
    width: var(--icon-size, 16px);
    height: var(--icon-size, 16px);
    margin: 0;
    fill: currentColor;
  }
`;

// MDS now owns pointer/focus timing, positioning, and the accessible description.
export const Hint = ({
  children,
  text,
  placement,
}: {
  children: ReactElement<AriaAttributes>;
  text: string;
  placement?: ComponentProps<typeof Tooltip>["placement"];
}) => (
  <Tooltip tooltip={text} placement={placement}>
    {children}
  </Tooltip>
);
