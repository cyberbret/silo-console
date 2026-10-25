// This file is part of MinIO Console Server
// Copyright (c) 2021 MinIO, Inc.
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

import React, { Fragment } from "react";
import { DropdownSelector, SelectorType } from "mds";
import styled from "styled-components";
import { type } from "../../../../../common/ui/typography";

interface IInputUnitBox {
  id: string;
  unitSelected: string;
  unitsList: SelectorType[];
  disabled?: boolean;
  onUnitChange?: (newValue: string) => void;
}

const UnitMenuButton = styled.button`
  ${type("caption")}
  border: 0;
  border-radius: 6px;
  padding: 4px 8px;
  background: var(--tint);
  color: var(--foreground);
  cursor: pointer;
  &:hover:not(:disabled) {
    background: var(--tint-hover);
  }
  &:disabled {
    color: var(--muted-foreground);
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }
`;

const InputUnitMenu = ({
  id,
  unitSelected,
  unitsList,
  disabled = false,
  onUnitChange,
}: IInputUnitBox) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = (newUnit: string) => {
    setAnchorEl(null);
    if (newUnit !== "" && onUnitChange) {
      onUnitChange(newUnit);
    }
  };

  return (
    <Fragment>
      <UnitMenuButton
        id={`${id}-button`}
        aria-controls={`${id}-menu`}
        aria-haspopup="listbox"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        disabled={disabled}
        type={"button"}
      >
        {unitsList.find((unit) => unit.value === unitSelected)?.label ??
          unitSelected}
      </UnitMenuButton>
      <DropdownSelector
        id={`${id}-menu`}
        options={unitsList}
        selectedOption={unitSelected}
        onSelect={(value) => handleClose(value)}
        hideTriggerAction={() => {
          handleClose("");
        }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={"end"}
      />
    </Fragment>
  );
};

export default InputUnitMenu;
