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
import { DocItem } from "./HelpMenu.types";
import { useLocalizedLink, useT } from "i18n";

interface IHelpItemProps {
  item: DocItem;
}

const HelpItemContainer = styled.a({
  display: "block",
  padding: "12px 16px",
  borderRadius: "var(--radius-control)",
  color: "var(--foreground)",
  textDecoration: "none",
  overflowWrap: "anywhere",
  transition: "background var(--dur-fast) var(--ease-fast)",
  "&:hover, &:focus-visible": {
    background: "var(--hover)",
  },
  "&:focus-visible": {
    outline: "2px solid var(--focus-ring)",
    outlineOffset: -2,
  },
});

const HelpTitle = styled.span({
  display: "block",
  font: "var(--fw-semibold) var(--fs-subtitle)/var(--lh-subtitle) var(--font-sans)",
  marginBottom: 4,
});

const HelpDescription = styled.span({
  display: "block",
  color: "var(--muted-foreground)",
  font: "var(--fw-normal) var(--fs-body)/var(--lh-body) var(--font-sans)",
});

const HelpItem = ({ item }: IHelpItemProps) => {
  // Every help entry (helpTopics.json, RSS items, fallbacks) renders through
  // here, so translation and URL localization apply in one place. Untranslated
  // titles/bodies (e.g. live feed content) pass through unchanged.
  const t = useT();
  const localize = useLocalizedLink();

  return (
    <HelpItemContainer
      href={localize(item.url)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <HelpTitle>{t(item.title)}</HelpTitle>
      <HelpDescription>{t(item.body)}</HelpDescription>
    </HelpItemContainer>
  );
};

export default HelpItem;
