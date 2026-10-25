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

import React, { FC, HTMLAttributes } from "react";
import styled from "styled-components";
import get from "lodash/get";
import { SurfaceLevelProvider } from "../../global/SurfaceLevel";
import { surfaceTextCssVariables } from "../../global/SurfaceLevel.logic";
import { BoxProps } from "./Box.types";

const BoxParent = styled.div<HTMLAttributes<HTMLDivElement> & BoxProps>(
  ({ theme, sx, withBorders, customBorderPadding, useBackground }) => {
    let extraBorders = {};

    if (withBorders) {
      extraBorders = {
        border: 0,
        borderRadius: "var(--radius-card, 12px)",
        boxShadow: "var(--shadow-2, none)",
        backgroundColor: get(theme, "boxBackground", "#fff"),
        padding: customBorderPadding || 15,
      };
    }

    return {
      ...(withBorders || useBackground ? surfaceTextCssVariables(3) : {}),
      backgroundColor: useBackground
        ? get(theme, "boxBackground", "#FBFAFA")
        : "transparent",
      ...extraBorders,
      ...sx,
    };
  },
);

const Box: FC<HTMLAttributes<HTMLDivElement> & BoxProps> = ({
  sx,
  children,
  customBorderPadding,
  elementRef,
  ...props
}) => {
  const content = (
    <BoxParent ref={elementRef} {...props} sx={sx} customBorderPadding={customBorderPadding}>
      {children}
    </BoxParent>
  );
  return props.withBorders || props.useBackground ? (
    <SurfaceLevelProvider level={3}>{content}</SurfaceLevelProvider>
  ) : (
    content
  );
};

export default Box;
