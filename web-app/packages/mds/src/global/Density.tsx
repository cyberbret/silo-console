// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { createContext, ReactNode, useContext } from "react";
import styled from "styled-components";
import { densitySizes, typeRoles } from "./designScale";
import { type } from "./typography";

type Density = keyof typeof densitySizes;
const DensityContext = createContext<Density>("default");

// The provider scopes ordinary descendants; Elevated applies the same map to
// portalled roots because CSS inheritance, unlike React context, stops there.
export const densityCssVariables = (
  density: Density,
): Record<string, string> => {
  const variables: Record<string, string> = {};
  for (const [name, value] of Object.entries(densitySizes[density])) {
    const key = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    variables[`--${key}`] = `${value}px`;
  }
  for (const [role, value] of Object.entries(typeRoles)) {
    variables[`--fs-${role}`] =
      `${density === "compact" ? value.compactSize : value.size}px`;
    variables[`--lh-${role}`] =
      `${density === "compact" ? value.compactLine : value.line}px`;
  }
  return variables;
};
const Scope = styled.div<{ $density: Density }>`
  display: contents;
  ${({ $density }) => densityCssVariables($density)}
`;

export const DensityProvider = ({
  density = "default",
  children,
}: {
  density?: Density;
  children: ReactNode;
}) => (
  <DensityContext.Provider value={density}>
    <Scope $density={density} data-density={density}>
      {children}
    </Scope>
  </DensityContext.Provider>
);

export const useDensity = () => {
  const density = useContext(DensityContext);
  const compact = density === "compact";
  return {
    density,
    compact,
    ...densitySizes[density],
    type: Object.fromEntries(
      Object.keys(typeRoles).map((role) => [
        role,
        type(role as keyof typeof typeRoles, { compact }),
      ]),
    ) as Record<keyof typeof typeRoles, ReturnType<typeof type>>,
  };
};
