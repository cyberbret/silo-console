// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { RefObject, useEffect, useLayoutEffect, useMemo } from "react";
import { createFluidHover, FluidHoverOptions } from "./fluidHover.controller";

/** Register clickable rows with data-fluid-index; their React tree never subscribes. */
export function useFluidHover<T extends HTMLElement>(
  container: RefObject<T>,
  options: FluidHoverOptions = {},
) {
  const hover = useMemo(createFluidHover, []);
  useLayoutEffect(() => {
    hover.connect(container.current, options);
  });
  useEffect(() => () => hover.disconnect(), [hover]);
  return hover;
}
