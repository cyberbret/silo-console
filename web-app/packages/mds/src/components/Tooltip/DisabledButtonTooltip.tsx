// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { cloneElement, useId } from "react";
import Tooltip from "./Tooltip";

const DisabledButtonTooltip = ({
  children,
  reason,
  fullWidth,
}: {
  children: React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>;
  reason: string;
  fullWidth?: boolean;
}) => {
  const descriptionId = useId();
  return (
    <Tooltip
      tooltip={reason}
      wrapperProps={{
        tabIndex: 0,
        role: "group",
        "aria-label": children.props["aria-label"],
        "aria-describedby": descriptionId,
        style: {
          width: fullWidth ? "100%" : undefined,
          cursor: "not-allowed",
          pointerEvents: "auto",
        },
      }}
    >
      <>
        {cloneElement(children, {
          style: { ...children.props.style, pointerEvents: "none" },
        })}
        <span id={descriptionId} hidden>
          {reason}
        </span>
      </>
    </Tooltip>
  );
};

export default DisabledButtonTooltip;
