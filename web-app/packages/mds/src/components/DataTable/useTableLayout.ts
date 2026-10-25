// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useSyncExternalStore } from "react";
import { useDensity } from "../../global/Density";

const subscribeViewport = (notify: () => void) => {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
};
const subscribePointer = (notify: () => void) => {
  const media = window.matchMedia("(pointer: coarse)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

export const useTableViewportWidth = () =>
  useSyncExternalStore(
    subscribeViewport,
    () => window.innerWidth,
    () => Infinity,
  );

/** Keep the virtualizer's geometry aligned with real touch targets. */
export function useTableRowHeight(requestedHeight?: number) {
  const { controlHeight } = useDensity();
  const coarse = useSyncExternalStore(
    subscribePointer,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
  const height = requestedHeight ?? controlHeight;
  return coarse ? Math.max(40, height) : height;
}
