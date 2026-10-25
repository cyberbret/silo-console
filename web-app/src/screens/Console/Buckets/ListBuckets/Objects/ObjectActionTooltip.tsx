// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { cloneElement, useId } from "react";
import styled from "styled-components";
import get from "lodash/get";
import { Tooltip } from "common/Tooltip";
import { useT } from "i18n";
import { ObjectActionState } from "./objectActionState";

const FocusTarget = styled.span(({ theme }) => ({
  display: "inline-flex",
  maxWidth: "100%",
  "&:focus-visible": {
    outline: `2px solid var(--silo-primary, ${get(theme, "linkColor", "#1D588C")})`,
    outlineOffset: 2,
  },
  "& > :disabled": { pointerEvents: "none" },
}));

const ObjectActionTooltip = ({
  state,
  label,
  tooltip = label,
  children,
}: {
  state: ObjectActionState;
  label: string;
  tooltip?: string;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}) => {
  const t = useT();
  const id = useId();
  const reason = state.reason ? t(state.reason) : undefined;
  if (!state.disabled) return <Tooltip tooltip={tooltip}>{children}</Tooltip>;
  return (
    <>
      <Tooltip tooltip={reason}>
        <FocusTarget
          tabIndex={0}
          role="group"
          aria-label={label}
          aria-disabled="true"
          onClick={(event) => event.stopPropagation()}
        >
          {cloneElement(children, { "aria-describedby": id })}
        </FocusTarget>
      </Tooltip>
      <span id={id} hidden>
        {reason}
      </span>
    </>
  );
};
export default ObjectActionTooltip;
