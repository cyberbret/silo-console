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

import React, { FC, useId } from "react";
import styled from "styled-components";
import { CheckboxProps } from "./Checkbox.types";
import InputLabel from "../InputLabel/InputLabel";
import Tooltip from "../Tooltip/Tooltip";
import HelpIcon from "../Icons/HelpIcon";
import { type } from "../../global/typography";
const Control = styled.div<{ $sx: CheckboxProps["sx"] }>`
  ${type("body")}
  display: inline-flex;
  align-items: center;
  gap: var(--gap, 8px);
  min-height: var(--control-height, 36px);
  .checkbox-target {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    cursor: pointer;
  }
  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }
  .checkbox {
    pointer-events: none;
    width: 16px;
    height: 16px;
    border: 1.5px solid var(--input);
    border-radius: 5px;
    box-sizing: border-box;
    color: var(--foreground);
  }
  input:checked + .checkbox {
    border-color: transparent;
    background: var(--foreground);
    color: var(--surface-1);
  }
  input:disabled:checked + .checkbox {
    background: var(--muted);
    color: var(--muted-foreground);
  }
  input:hover:not(:checked):not(:disabled) + .checkbox {
    border-color: var(--muted-foreground);
  }
  input:focus-visible + .checkbox {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }
  input:disabled + .checkbox {
    background: var(--muted);
    color: var(--muted-foreground);
  }
  svg {
    width: 16px;
    height: 16px;
    overflow: visible;
    display: block;
    margin: -1.5px;
  }
  path {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    transition: stroke-dashoffset var(--dur-fast, 80ms) ease-out;
  }
  input:checked + .checkbox path {
    stroke-dashoffset: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    path {
      transition: none;
    }
  }
  @media (pointer: coarse) {
    min-height: 40px;
    .checkbox-target {
      width: 40px;
      height: 40px;
    }
  }
  ${({ $sx }) => $sx}
`;
const Checkbox: FC<
  CheckboxProps & React.InputHTMLAttributes<HTMLInputElement>
> = ({
  tooltip,
  label,
  id,
  overrideLabelClasses,
  sx,
  className,
  helpTip,
  helpTipPlacement,
  ...props
}) => {
  const generatedId = useId();
  const controlId = id ?? (label ? `checkbox-${generatedId}` : undefined);
  return (
    <Control
      $sx={sx}
      className={`inputItem ${className || ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      <span
        className="checkbox-target"
        onClick={(event) => event.stopPropagation()}
      >
        <input type="checkbox" id={controlId} {...props} />
        <span className="checkbox" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none">
            <path
              pathLength="1"
              d="M3 8 6.5 11.5 13 4.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
      {label && (
        <InputLabel
          htmlFor={controlId}
          noMinWidth
          className={overrideLabelClasses}
          helpTip={helpTip}
          helpTipPlacement={helpTipPlacement}
        >
          {label}
          {tooltip && (
            <Tooltip tooltip={tooltip}>
              <HelpIcon />
            </Tooltip>
          )}
        </InputLabel>
      )}
    </Control>
  );
};
export default Checkbox;
