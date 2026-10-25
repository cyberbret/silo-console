// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { css } from "styled-components";
import { fontWeights, typeRoles } from "./designScale";

type TypeRole = keyof typeof typeRoles;
export const type = (
  role: TypeRole,
  {
    compact = false,
    weight,
  }: {
    compact?: boolean;
    weight?: keyof typeof fontWeights;
  } = {},
) => {
  const value = typeRoles[role];
  const suffix = compact ? "-compact" : "";
  return css`
    font-family: var(--font-sans);
    font-size: var(
      --fs-${role}${suffix},
      ${compact ? value.compactSize : value.size}px
    );
    line-height: var(
      --lh-${role}${suffix},
      ${compact ? value.compactLine : value.line}px
    );
    font-weight: ${weight ? fontWeights[weight] : value.weight};
  `;
};
