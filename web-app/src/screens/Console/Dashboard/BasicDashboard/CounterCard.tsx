// This file is part of MinIO Console Server
// Copyright (c) 2022 MinIO, Inc.
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

import React from "react";
import styled from "styled-components";
import { Box, breakPoints } from "mds";
import { Tooltip } from "common/Tooltip";

const CounterCardMain = styled.div({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  height: "100%",
  width: "100%",
  cursor: "default",
  "& .cardHeader": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    "& .cardLabel": {
      fontSize: "var(--fs-body)",
      fontWeight: 550,
      color: "var(--muted-foreground)",
    },
    "& .min-icon": {
      width: 20,
      height: 20,
      flexShrink: 0,
      color: "var(--muted-foreground)",
      fill: "var(--muted-foreground)",
    },
  },
  "& .cardBottom": {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    minWidth: 0,
  },
  "& .cardValue": {
    fontSize: "var(--fs-display)",
    fontWeight: 700,
    lineHeight: "var(--lh-display)",
    color: "var(--foreground)",
    fontVariantNumeric: "tabular-nums",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    [`@media (max-width: ${breakPoints.sm}px)`]: {
      fontSize: "var(--fs-display-compact)",
      lineHeight: "var(--lh-display-compact)",
    },
  },
});

const CounterCard = ({
  counterValue,
  label = "",
  icon = null,
  actions = null,
}: {
  counterValue: string | number;
  label?: any;
  icon?: any;
  actions?: any;
}) => {
  return (
    <CounterCardMain>
      <Box className={"cardHeader"}>
        <Box className={"cardLabel"}>{label}</Box>
        {icon}
      </Box>
      <Box className={"cardBottom"}>
        <Tooltip tooltip={counterValue} placement="bottom">
          <Box className={"cardValue"}>{counterValue}</Box>
        </Tooltip>
        {actions ? <Box className={"cardActions"}>{actions}</Box> : null}
      </Box>
    </CounterCardMain>
  );
};

export default CounterCard;
