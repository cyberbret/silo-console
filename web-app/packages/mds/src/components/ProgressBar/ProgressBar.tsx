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
import { useControlLabels } from "../../global/ControlLabels";
import styled, { keyframes } from "styled-components";
import get from "lodash/get";
import { CommonProgressBar, ProgressBarProps } from "./ProgressBar.types";
import { lightColors } from "../../global/themes";
import Box from "../Box/Box";

const colorItems = {
  blue: "main",
  red: "danger",
  green: "good",
  orange: "warning",
  grey: "disabled",
};

const ProgressBase = styled.div<CommonProgressBar>(
  ({ theme, sx, color, barHeight, transparentBG }) => ({
    "& .progBlock": {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    "& .progressContainer": {
      position: "relative",
      width: "100%",
      height: barHeight,
      backgroundColor: transparentBG ? "transparent" : "var(--muted)",
      borderRadius: barHeight,
      overflow: "hidden",
    },
    "& .notificationLabel": {
      fontSize: "var(--fs-caption,12px)",
      lineHeight: "var(--lh-caption,16px)",
      color: "var(--foreground)",
    },
    "& .percentageBar": {
      display: "block",
      height: barHeight,
      backgroundColor:
        color === "blue"
          ? "var(--foreground)"
          : get(
              theme,
              `signalColors.${colorItems[color || "blue"]}`,
              lightColors.mainBlue,
            ),
      width: "100%",
      transformOrigin: "left",
      transition:
        "transform var(--dur-moderate,160ms) var(--ease-moderate,ease-out)",
      borderRadius: barHeight,
    },
    "@media (prefers-reduced-motion: reduce)": {
      "& .percentageBar": { transition: "none" },
    },
    ...sx,
  }),
);

export const innerAnimation = keyframes`from { transform: translateX(-100%); } to { transform: translateX(400%); }`;

const IndeterminateItem = styled.div<CommonProgressBar>`
  width: 25%;
  height: ${(props) => get(props, "barHeight", 8)}px;
  display: block;
  position: absolute;
  border-radius: ${(props) => get(props, "barHeight", 8)}px;
  animation: ${innerAnimation} 1000ms linear infinite normal forwards;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: translateX(150%);
  }
  background-color: ${(props) =>
    (props.color || "blue") === "blue"
      ? "var(--foreground)"
      : get(
          props.theme,
          `signalColors.${colorItems[props.color || "blue"]}`,
          lightColors.mainBlue,
        )};
`;

const ProgressBar: FC<ProgressBarProps> = ({
  progressLabel = false,
  sx,
  value = 0,
  maxValue = 100,
  variant = "indeterminate",
  notificationLabel = "",
  color = "blue",
  barHeight = 6,
  transparentBG = false,
}) => {
  const labels = useControlLabels();
  const calcPerc =
    Number.isFinite(value) && Number.isFinite(maxValue) && maxValue > 0
      ? Math.max(0, Math.min(100, (value / maxValue) * 100))
      : 0;

  return (
    <ProgressBase
      color={color}
      sx={sx}
      barHeight={barHeight}
      transparentBG={transparentBG}
    >
      <Box className={"progBlock"}>
        <Box
          className={"progressContainer"}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={variant === "determinate" ? calcPerc : undefined}
          aria-label={notificationLabel || labels.progress}
        >
          {variant === "indeterminate" ? (
            <IndeterminateItem color={color} barHeight={barHeight} />
          ) : (
            <Box
              className={"percentageBar"}
              style={{ transform: `scaleX(${calcPerc / 100})` }}
            />
          )}
        </Box>
        {progressLabel && variant !== "indeterminate" && (
          <span className={"progressPercentage"}>{Math.floor(calcPerc)}%</span>
        )}
      </Box>
      {notificationLabel !== "" && (
        <span className={"notificationLabel"}>{notificationLabel}</span>
      )}
    </ProgressBase>
  );
};

export default ProgressBar;
