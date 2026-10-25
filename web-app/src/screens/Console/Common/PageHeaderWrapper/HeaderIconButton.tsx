// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import styled from "styled-components";
import { IconButton } from "mds";

// Keep MDS's native button, tooltip, focus ring and press surface. Only the
// shared header's idle color and touch target differ from the base control.
const HeaderIconButton = styled(IconButton).attrs({ size: "medium" })`
  color: var(--header-tool-color, var(--muted-foreground));
  &:hover,
  &:focus-visible,
  &[aria-expanded="true"] {
    color: var(--header-tool-active-color, var(--foreground));
  }
  &[aria-expanded="true"] .button-surface {
    background: var(--active);
  }
  @media (pointer: coarse) {
    width: 40px;
    height: 40px;
  }
`;

export default HeaderIconButton;
