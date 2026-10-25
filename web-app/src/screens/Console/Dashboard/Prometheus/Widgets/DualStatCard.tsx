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

const DualSTCardContent = styled.div({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: 12,
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
  "& .statRow": {
    display: "flex",
    alignItems: "flex-end",
    gap: 48,
    [`@media (max-width: ${breakPoints.lg}px)`]: {
      gap: 32,
    },
  },
  "& .stat-value": {
    fontSize: "var(--fs-display)",
    fontWeight: 700,
    lineHeight: "var(--lh-display)",
    color: "var(--foreground)",
    fontVariantNumeric: "tabular-nums",
    [`@media (max-width: ${breakPoints.sm}px)`]: {
      fontSize: "var(--fs-display-compact)",
      lineHeight: "var(--lh-display-compact)",
    },
  },
});

const DualStatCard = ({
  statItemLeft = null,
  statItemRight = null,
  icon = null,
  label = "",
}: {
  statItemLeft: any;
  statItemRight: any;
  icon: any;
  label: string;
}) => {
  return (
    <DualSTCardContent>
      <Box className={"cardHeader"}>
        <Box className={"cardLabel"}>{label}</Box>
        {icon}
      </Box>
      <Box className={"statRow"}>
        {statItemLeft}
        {statItemRight}
      </Box>
    </DualSTCardContent>
  );
};

export default DualStatCard;
