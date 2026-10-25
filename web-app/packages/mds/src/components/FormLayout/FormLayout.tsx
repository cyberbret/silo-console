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
import Box from "../Box/Box";
import SectionTitle from "../SectionTitle/SectionTitle";
import { FormLayoutProps } from "./FormLayout.types";
import { useAvailableWidth } from "../../global/useAvailableWidth";

const FormLayout: FC<FormLayoutProps> = ({
  children,
  title = "",
  helpBox,
  icon,
  sx,
  containerPadding = true,
  withBorders = true,
}) => {
  const { elementRef, width } = useAvailableWidth();
  return (
    <Box
      withBorders={withBorders}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        minWidth: 0,
        padding: containerPadding ? 24 : 0,
        gap: "24px",
        "& > *": { minWidth: 0 },
        "& .inputItem:not(:last-of-type)": {
          marginBottom: 12,
        },
        "@media (max-width: 767.98px)": {
          padding: containerPadding ? 16 : 0,
          gap: 16,
        },
        ...sx,
      }}
    >
      <Box
        elementRef={elementRef}
        data-field-layout={width < 480 ? "stacked" : undefined}
        sx={{
          minWidth: 0,
          flex: helpBox ? "2 1 440px" : "1 1 100%",
        }}
      >
        {title !== "" && (
          <SectionTitle headingLevel={2} icon={icon} sx={{ marginBottom: 16 }}>
            {title}
          </SectionTitle>
        )}
        {children}
      </Box>
      {helpBox && (
        <Box sx={{ minWidth: 0, flex: "1.2 1 280px" }}>{helpBox}</Box>
      )}
    </Box>
  );
};

export default FormLayout;
