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
import styled from "styled-components";
import { TagProps } from "./Tag.types";
import { type } from "../../global/typography";
import { useDensity } from "../../global/Density";
import AlertCloseIcon from "../Icons/AlertCloseIcon";
const tones = {
  default: "var(--info)",
  secondary: "var(--foreground)",
  warn: "var(--warning)",
  alert: "var(--destructive)",
  ok: "var(--success)",
  grey: "var(--muted-foreground)",
};
const TagBase = styled.span<{
  $tone: string;
  $dot: boolean;
  $neutral: boolean;
  $compact: boolean;
  $sx: TagProps["sx"];
}>`
  ${({ $compact }) => type("caption", { compact: $compact })}
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  box-sizing: border-box;
  white-space: nowrap;
  height: ${({ $compact }) => ($compact ? 20 : 24)}px;
  padding: 0 ${({ $compact }) => ($compact ? 8 : 10)}px;
  gap: ${({ $compact }) => ($compact ? 4 : 6)}px;
  border-radius: 999px;
  color: var(--foreground);
  background: ${({ $dot, $neutral, $tone }) =>
    $dot
      ? "transparent"
      : $neutral
        ? "var(--accent)"
        : `color-mix(in srgb, ${$tone} 15%, var(--background))`};
  border: 1px solid ${({ $dot }) => ($dot ? "var(--border)" : "transparent")};
  .tag-dot {
    width: 6px;
    height: 6px;
    flex-shrink: 0;
    border-radius: 50%;
    background: ${({ $tone }) => $tone};
  }
  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    fill: currentColor;
  }
  .deleteTagButton {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    width: 16px;
    height: 16px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--foreground);
    cursor: pointer;
  }
  .deleteTagButton:hover {
    background: var(--hover);
  }
  .deleteTagButton:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }
  ${({ $sx }) => $sx}
`;
const Tag: FC<TagProps & React.HTMLAttributes<HTMLSpanElement>> = ({
  children,
  color = "default",
  sx,
  onDelete,
  id,
  label,
  variant = "regular",
  icon,
  square,
  deleteLabel,
  ...props
}) => {
  const labels = useControlLabels();
  const { compact } = useDensity();
  const dot = variant === "dot" || variant === "outlined";
  return (
    <TagBase
      id={id}
      $tone={tones[color]}
      $dot={dot}
      $neutral={color === "grey" || color === "secondary"}
      $compact={compact}
      $sx={sx}
      {...props}
    >
      {dot && !icon && <span className="tag-dot" aria-hidden="true" />}
      {icon}
      <span>
        {label}
        {children}
      </span>
      {onDelete && (
        <button
          type="button"
          className="deleteTagButton"
          aria-label={deleteLabel || `${labels.remove} ${label}`}
          onClick={() => onDelete(id)}
        >
          <AlertCloseIcon />
        </button>
      )}
    </TagBase>
  );
};
export default Tag;
