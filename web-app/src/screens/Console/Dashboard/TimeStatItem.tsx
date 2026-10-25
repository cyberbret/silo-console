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
import get from "lodash/get";
import { Box, Loader, SuccessIcon } from "mds";

const TimeStatBase = styled.div(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "16px minmax(0, 1fr) auto 8px",
  alignItems: "center",
  gap: 8,
  minHeight: 40,
  padding: "8px 12px",
  boxSizing: "border-box",
  borderRadius: 8,
  background: get(theme, "boxBackground", "#FAFAFA"),
  "& > .min-icon": {
    height: 16,
    width: 16,
    color: "var(--muted-foreground)",
    fill: "var(--muted-foreground)",
  },
  "& .ok-icon": {
    height: 8,
    width: 8,
    fill: get(theme, "signalColors.good", "#10B981"),
    color: get(theme, "signalColors.good", "#10B981"),
  },
  "& .timeStatLabel": {
    fontSize: "var(--fs-body)",
    fontWeight: 400,
    lineHeight: "var(--lh-body)",
    color: "var(--muted-foreground)",
  },
  "& .timeStatValue": {
    fontSize: "var(--fs-body)",
    fontWeight: 550,
    justifySelf: "end",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
    color: "var(--foreground)",
    "&.is-na": {
      fontWeight: 550,
      color: "var(--muted-foreground)",
    },
    "&.stat-warn": {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      "&::before": {
        content: '""',
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--warning)",
      },
    },
    "&.stat-danger": {
      color: "var(--destructive-text)",
    },
  },
}));

export type TimeStatStatus = "ok" | "warn" | "danger" | "muted";

const TimeStatItem = ({
  icon,
  label,
  value,
  loading = false,
  status,
}: {
  icon: any;
  label: any;
  value: string;
  loading?: boolean;
  status?: TimeStatStatus;
}) => {
  const resolved: TimeStatStatus = status ?? (value === "n/a" ? "muted" : "ok");
  return (
    <TimeStatBase className="dashboard-time-stat-item">
      {loading ? <Loader style={{ width: 12, height: 12 }} /> : icon}
      <Box className={"timeStatLabel"}>{label}</Box>
      <Box
        className={`timeStatValue ${
          resolved === "muted" ? "is-na" : ""
        } stat-${resolved}`}
      >
        {value}
      </Box>
      {resolved === "ok" ? <SuccessIcon className="ok-icon" /> : null}
    </TimeStatBase>
  );
};

export default TimeStatItem;
