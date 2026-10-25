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

import React, { FC, Fragment } from "react";
import styled from "styled-components";
import { OptionsContainerProps, RadioGroupProps } from "./RadioGroup.types";
import InputLabel from "../InputLabel/InputLabel";
import { InputLabelProps } from "../InputLabel/InputLabel.types";
import FieldContainer from "../../global/FieldContainer";
import Tooltip from "../Tooltip/Tooltip";
import HelpIcon from "../Icons/HelpIcon";
import { type } from "../../global/typography";

const RadioButton = styled.label<InputLabelProps>`
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  input {
    position: absolute;
    opacity: 0;
    width: 16px;
    height: 16px;
    margin: 0;
  }
  .radio {
    position: relative;
    display: block;
    box-sizing: border-box;
    width: 16px;
    height: 16px;
    border: 1.5px solid var(--input);
    border-radius: 50%;
    pointer-events: none;
  }
  .radio::before {
    content: "";
    position: absolute;
    inset: 2.5px;
    border-radius: 50%;
    background: var(--foreground);
    opacity: 0;
    transition: opacity var(--dur-fast, 80ms) var(--ease-fast, ease-out);
  }
  input:checked + .radio {
    border-color: var(--foreground);
  }
  input:disabled:checked + .radio {
    border-color: var(--input);
  }
  input:disabled + .radio::before {
    background: var(--muted-foreground);
  }
  input:checked + .radio::before {
    opacity: 1;
  }
  input:hover:not(:checked):not(:disabled) + .radio {
    border-color: var(--muted-foreground);
  }
  input:focus-visible + .radio {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }
  input:disabled + .radio {
    background: var(--muted);
  }
  @media (prefers-reduced-motion: reduce) {
    .radio::before {
      transition: none;
    }
  }
  ${({ sx }) => sx}
`;
const OptionsContainer = styled.div<OptionsContainerProps>`
  ${type("body")}
  flex-grow: 1;
  width: 100%;
  display: flex;
  flex-direction: ${({ inColumn }) => (inColumn ? "column" : "row")};
  justify-content: flex-end;
  gap: 16px;
  .optionLabel {
    display: inline-grid;
    user-select: none;
    color: var(--foreground);
    cursor: pointer;
  }
  .optionLabel > span {
    grid-area: 1 / 1;
  }
  .optionLabel .labelSizer {
    visibility: hidden;
    font-weight: var(--fw-semibold, 550);
  }
  .optionLabel.checked {
    font-weight: var(--fw-semibold, 550);
  }
  .optionLabel.disabled {
    cursor: not-allowed;
  }
`;
const RadioContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RadioGroup: FC<RadioGroupProps> = ({
  tooltip,
  label,
  id,
  sx,
  onChange,
  className,
  name,
  selectorOptions,
  currentValue,
  disableOptions = false,
  displayInColumn = false,
  helpTip,
  helpTipPlacement,
}) => {
  return (
    <FieldContainer
      className={`inputItem ${className ? className : ""}`}
      sx={{
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        flexBasis: "initial",
        flexWrap: "nowrap",
      }}
    >
      {label !== "" && (
        <InputLabel
          htmlFor={id}
          noMinWidth
          helpTip={helpTip}
          helpTipPlacement={helpTipPlacement}
        >
          {label}
          {tooltip && tooltip !== "" && (
            <div className={"tooltipContainer"}>
              <Tooltip tooltip={tooltip} placement="top">
                <HelpIcon />
              </Tooltip>
            </div>
          )}
        </InputLabel>
      )}
      <OptionsContainer
        role="radiogroup"
        aria-label={label || name || id}
        inColumn={displayInColumn}
      >
        {selectorOptions && (
          <Fragment>
            {selectorOptions.map((selector) => (
              <RadioContainer key={`option-${id}-${selector.value}`}>
                <RadioButton htmlFor={`option-${id}-${selector.value}`} sx={sx}>
                  <input
                    type={"radio"}
                    name={name}
                    id={`option-${id}-${selector.value}`}
                    value={selector.value}
                    checked={currentValue === selector.value}
                    onChange={(event) => onChange(event, selector.extraValue)}
                    disabled={disableOptions || !!selector.disabled}
                  />
                  <span
                    className={`radio ${
                      currentValue === selector.value ? "checked" : ""
                    }`}
                  />
                </RadioButton>
                <label
                  htmlFor={`option-${id}-${selector.value}`}
                  className={`optionLabel ${
                    currentValue === selector.value ? "checked" : ""
                  } ${disableOptions || !!selector.disabled ? "disabled" : ""}`}
                >
                  <span>{selector.label}</span>
                  <span className="labelSizer" aria-hidden="true">
                    {selector.label}
                  </span>
                </label>
              </RadioContainer>
            ))}
          </Fragment>
        )}
      </OptionsContainer>
    </FieldContainer>
  );
};

export default RadioGroup;
