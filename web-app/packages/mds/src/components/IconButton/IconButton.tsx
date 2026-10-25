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

import React, { forwardRef } from "react";
import styled from "styled-components";
import { IconButtonProps } from "./IconButton.types";
import Button from "../Button/Button";
import Tooltip from "../Tooltip/Tooltip";
const IconControl = styled(Button)<{ $size?: string }>`
  padding: 0;
  width: ${({ $size }) => $size || "var(--control-height,36px)"};
  height: ${({ $size }) => $size || "var(--control-height,36px)"};
  @media (pointer: coarse) { min-width: 40px; min-height: 40px; }
  .button-label {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  svg {
    width: var(--icon-size, 16px);
    height: var(--icon-size, 16px);
    margin: 0;
    fill: currentColor;
  }
`;
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, label, size, id, sx, ...props }, ref) => {
    const name = props["aria-label"] || label;
    const dimension =
      size === "small"
        ? "28px"
        : size === "medium" || size === "large"
          ? "36px"
          : size;
    const button = (
      <IconControl
        ref={ref}
        id={id || ""}
        type="button"
        {...props}
        aria-label={name}
        variant="ghost"
        collapseOnSmall={false}
        $size={dimension}
        sx={sx}
      >
        {children}
      </IconControl>
    );
    return name && !props.disabledReason && !props["aria-describedby"] ? (
      <Tooltip tooltip={name}>{button}</Tooltip>
    ) : (
      button
    );
  },
);
IconButton.displayName = "IconButton";
export default IconButton;
