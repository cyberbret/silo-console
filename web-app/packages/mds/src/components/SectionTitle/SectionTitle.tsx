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
import Grid from "../Grid/Grid";
import { SectionTitleProps } from "./SectionTitle.types";
import styled from "styled-components";
import get from "lodash/get";
import { type } from "../../global/typography";

const Heading = styled.h3`
  ${type("title")}
  margin: 16px 0;
`;

const hasHeadingContent = (children: React.ReactNode): boolean =>
  React.Children.toArray(children).some((child) => {
    if (typeof child === "string") return child.trim().length > 0;
    if (
      React.isValidElement<{ children?: React.ReactNode }>(child) &&
      child.type === React.Fragment
    )
      return hasHeadingContent(child.props.children);
    return true;
  });

const SectionParent = styled.div<
  HTMLAttributes<HTMLDivElement> & SectionTitleProps
>(({ theme, separator, sx }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  borderBottom: separator
    ? `1px solid ${get(theme, "borderColor", "#eaeaea")}`
    : "",
  gap: 8,
  ...sx,
}));

const SectionTitle: FC<SectionTitleProps> = ({
  separator,
  icon,
  children,
  actions,
  sx,
  headingLevel = 3,
}) => {
  return (
    <SectionParent
      className={"sectionTitle-container"}
      separator={separator}
      sx={sx}
    >
      <Grid
        item
        xs
        sx={{
          display: "flex",
          flexGrow: 1,
          justifyContent: "flex-start",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        {icon}
        {hasHeadingContent(children) && (
          <Heading as={`h${headingLevel}` as "h2" | "h3" | "h4"}>
            {children}
          </Heading>
        )}
      </Grid>
      {actions && (
        <Grid
          item
          xs
          sx={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          {" "}
          {actions}
        </Grid>
      )}
    </SectionParent>
  );
};

export default SectionTitle;
