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

import React, { FC, useState } from "react";
import styled from "styled-components";
import { fieldChrome, fieldLayout } from "../../global/controlStyles";
import get from "lodash/get";
import {
  ExtraCommentProps,
  CommentBoxProps,
  CommentContainerProps,
} from "./CommentBox.types";
import FieldHelp from "../InputLabel/FieldHelp";
import InputLabel from "../InputLabel/InputLabel";
import Box from "../Box/Box";

const TextAreaBase = styled.textarea<CommentBoxProps & ExtraCommentProps>`
  ${fieldChrome}
  height: auto;
  min-height: calc(var(--field-height, var(--control-height, 36px)) * 2);
  resize: vertical;
  padding: 12px;
`;

const BoxContainer = styled.div<CommentContainerProps>(({ theme, sx }) => ({
  ...fieldLayout,
  "& .errorText": {
    fontSize: "var(--fs-caption,12px)",
    lineHeight: "var(--lh-caption,16px)",
    color: "var(--destructive-text)",
    marginTop: 3,
  },
  "& .textBoxContainer": {
    width: "100%",
    flexGrow: 1,
    position: "relative",
    minWidth: 0,
  },
  ...sx,
}));

const InputBox: FC<CommentBoxProps> = ({
  id,
  tooltip = "",
  index,
  noLabelMinWidth,
  label = "",
  required,
  className,
  error,
  sx,
  helpTip,
  helpTipPlacement,
  ...props
}) => {
  return (
    <BoxContainer
      error={!!error && error !== ""}
      sx={sx}
      className={`inputItem ${className}`}
    >
      {label !== "" && (
        <InputLabel
          htmlFor={id}
          noMinWidth={noLabelMinWidth}
          className={"inputLabel"}
          helpTip={helpTip}
          helpTipPlacement={helpTipPlacement}
        >
          {label}
          {required ? "*" : ""}
          {tooltip !== "" && <FieldHelp text={tooltip} />}
        </InputLabel>
      )}

      <Box className={"textBoxContainer"}>
        <TextAreaBase
          id={id}
          fullWidth
          error={error}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : props["aria-describedby"]}
          className={"inputRebase"}
          data-index={index}
          rows={5}
          {...props}
        />
        {error && (
          <Box id={`${id}-error`} className={"errorText"}>
            {error}
          </Box>
        )}
      </Box>
    </BoxContainer>
  );
};

export default InputBox;
