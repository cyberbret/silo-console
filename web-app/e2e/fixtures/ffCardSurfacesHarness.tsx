// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "styled-components";
import {
  DataTable,
  DensityProvider,
  Elevated,
  Select,
  useDensity,
  useSurfaceLevel,
} from "../../packages/mds/src";
import { EmptyState } from "../../src/common/ui/EmptyState";
import { StatCard } from "../../src/common/ui/StatCard";
import { darkTokens, tokenCssVariables } from "../../src/common/ui/tokens";
import { siloDarkThemeOverrides } from "../../src/common/siloTheme";

for (const [name, value] of Object.entries(tokenCssVariables(darkTokens))) {
  document.documentElement.style.setProperty(name, value);
}
const store = configureStore({
  reducer: () => ({ system: { language: "en" } }),
});

const Content = ({ id }: { id: string }) => {
  const level = useSurfaceLevel();
  const { density, controlHeight } = useDensity();
  return (
    <>
      <output id={`${id}-context`}>{level}</output>
      <output id={`${id}-density`}>
        {density}:{controlHeight}
      </output>
      <span id={`${id}-muted`} style={{ color: "var(--silo-text-secondary)" }}>
        Secondary card text
      </span>
      <Select
        id={`${id}-select`}
        value="one"
        options={[
          { label: "One", value: "one" },
          { label: "Two", value: "two" },
        ]}
        onChange={() => {}}
      />
    </>
  );
};

const Cards = ({ prefix }: { prefix: string }) => (
  <>
    {[false, true].map((transparent) => {
      const id = `${prefix}-table-${transparent ? "clear" : "opaque"}`;
      return (
        <section key={id} id={id}>
          <DataTable
            parentClassName="fixture-table"
            columns={[{ label: "Name", elementKey: "name" }]}
            records={[]}
            noBackground={transparent}
            isLoading
            loadingMessage={<Content id={id} />}
            customPaperHeight="240px"
          />
        </section>
      );
    })}
    {[false, true].map((framed) => {
      const id = `${prefix}-empty-${framed ? "opaque" : "clear"}`;
      return (
        <section key={id} id={id}>
          <EmptyState
            title={id}
            framed={framed}
            compact
            action={<Content id={id} />}
          />
        </section>
      );
    })}
    <section id={`${prefix}-stat`}>
      <StatCard
        label="Statistics"
        value="1"
        footer={<Content id={`${prefix}-stat`} />}
      />
    </section>
  </>
);

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <ThemeProvider theme={siloDarkThemeOverrides}>
      <DensityProvider density="compact">
        <Cards prefix="floor" />
        <Elevated offset={6} id="high-substrate">
          <Cards prefix="high" />
        </Elevated>
      </DensityProvider>
    </ThemeProvider>
  </Provider>,
);
