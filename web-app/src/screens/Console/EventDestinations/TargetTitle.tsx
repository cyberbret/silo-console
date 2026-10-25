// This file is part of MinIO Console Server
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

import React from "react";
import styled from "styled-components";
import { Box, type } from "mds";
import { useT } from "i18n";

interface ITargetTitle {
  logoSrc: string;
  title: string;
}

const TargetBase = styled.div({
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-card,12px)",
  minHeight: 80,
  display: "flex",
  alignItems: "center",
  justifyContent: "start",
  marginBottom: 16,
  padding: 0,
  overflow: "hidden",
  "& .logoButton": {
    display: "block",
  },
  "& .imageContainer": {
    // Original multicolor logos contain dark strokes. A contained paper inset
    // preserves their colors in both themes without a halo or image filter.
    backgroundColor: "#fafafa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: 80,
    flexShrink: 0,

    "& img": {
      maxWidth: 46,
      maxHeight: 46,
    },
  },
});

const TargetHeading = styled.h2`
  ${type("title")}
  color: var(--foreground);
  margin: 0;
  padding: 16px;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const TargetTitle = ({ logoSrc, title }: ITargetTitle) => {
  const t = useT();
  return (
    <TargetBase>
      <Box className={"imageContainer"}>
        <img src={logoSrc} className={"logoButton"} alt={title} />
      </Box>

      <TargetHeading>
        {t("{target} Event Destination").replace("{target}", () => title)}
      </TargetHeading>
    </TargetBase>
  );
};

export default TargetTitle;
