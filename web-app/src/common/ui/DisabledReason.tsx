// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { ReactNode } from "react";
import styled from "styled-components";
import { Hint } from "./shared";

const Target = styled.span`
  display: inline-flex;
  max-width: 100%;
  cursor: not-allowed;
`;

// The child retains its own disabled semantics; the wrapper adds a focusable
// explanation for non-button controls (use MDS disabledReason once available).
export const DisabledReason = ({
  children,
  reason,
}: {
  children: ReactNode;
  reason?: string;
}) =>
  reason ? (
    <Hint text={reason}>
      <Target tabIndex={0} aria-disabled="true">
        {children}
      </Target>
    </Hint>
  ) : (
    <>{children}</>
  );
