// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, {
  createContext,
  forwardRef,
  HTMLAttributes,
  ReactNode,
  useContext,
} from "react";
import styled from "styled-components";

import { surfaceLevel, surfaceTextCssVariables } from "./SurfaceLevel.logic";
import { densityCssVariables, useDensity } from "./Density";

const SurfaceLevel = createContext(1);
export const useSurfaceLevel = () => useContext(SurfaceLevel);

export const SurfaceLevelProvider = ({
  level,
  children,
}: {
  level: number;
  children: ReactNode;
}) => (
  <SurfaceLevel.Provider value={surfaceLevel(level)}>
    {children}
  </SurfaceLevel.Provider>
);

const Surface = styled.div<{
  $level: number;
  $shadow: number;
  $inverted: boolean;
  $density: "default" | "compact";
}>`
  ${({ $density }: { $density: "default" | "compact" }) =>
    densityCssVariables($density)}
  ${({ $level, $inverted }) => surfaceTextCssVariables($level, $inverted)}
  background: ${({ $level, $inverted }) =>
    $inverted
      ? "var(--foreground, #171717)"
      : `var(--surface-${$level}, #fff)`};
  color: ${({ $inverted }) =>
    $inverted ? "var(--surface-1, #fafafa)" : "var(--foreground, #171717)"};
  box-shadow: ${({ $shadow }) => `var(--shadow-${$shadow}, none)`};
`;

// Context survives React portals, including a menu opened from inside a dialog.
export const Elevated = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    offset?: number;
    shadowLevel?: number;
    inverted?: boolean;
  }
>(({ offset = 2, shadowLevel, inverted = false, children, ...props }, ref) => {
  const level = surfaceLevel(useSurfaceLevel(), offset);
  const { density } = useDensity();
  return (
    <SurfaceLevelProvider level={level}>
      <Surface
        {...props}
        ref={ref}
        data-surface-level={level}
        $level={level}
        $shadow={surfaceLevel(shadowLevel ?? level)}
        $inverted={inverted}
        $density={density}
      >
        {children}
      </Surface>
    </SurfaceLevelProvider>
  );
});
Elevated.displayName = "Elevated";
