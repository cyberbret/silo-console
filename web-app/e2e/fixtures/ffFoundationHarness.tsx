// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import {
  DensityProvider,
  Elevated,
  ModalBox,
  Select,
  SurfaceLevelProvider,
  useDensity,
} from "../../packages/mds/src";
import { darkTokens, tokenCssVariables } from "../../src/common/ui/tokens";
import { siloDarkThemeOverrides } from "../../src/common/siloTheme";

for (const [name, value] of Object.entries(tokenCssVariables(darkTokens))) {
  document.documentElement.style.setProperty(name, value);
}
const Reading = ({ id }: { id: string }) => {
  const { density, controlHeight } = useDensity();
  return (
    <output id={id}>
      {density}:{controlHeight}
    </output>
  );
};
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={siloDarkThemeOverrides}>
    <DensityProvider density="compact">
      <ModalBox open title="Compact dialog" onClose={() => {}}>
        <Reading id="dialog-density" />
        <Select
          id="compact-select"
          value="one"
          options={[
            { label: "One", value: "one" },
            { label: "Two", value: "two" },
            {
              label: (
                <span
                  id="menu-muted"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Secondary option text
                </span>
              ),
              value: "three",
            },
          ]}
          onChange={() => {}}
        />
        <Elevated offset={4} shadowLevel={5} id="nested-surface">
          <Reading id="nested-density" />
          <span
            id="nested-muted"
            style={{ color: "var(--silo-text-secondary)" }}
          >
            Secondary dialog text
          </span>
          <SurfaceLevelProvider level={1}>
            <Elevated id="lower-surface-reset">
              <span
                id="lower-muted"
                style={{ color: "var(--muted-foreground)" }}
              >
                Reset text
              </span>
            </Elevated>
          </SurfaceLevelProvider>
        </Elevated>
        <DensityProvider>
          <Elevated id="default-reset">
            <Reading id="default-density" />
          </Elevated>
        </DensityProvider>
      </ModalBox>
    </DensityProvider>
  </ThemeProvider>,
);
