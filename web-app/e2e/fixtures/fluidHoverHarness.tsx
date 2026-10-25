// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { OverflowMenu } from "../../src/common/ui/OverflowMenu";
import {
  DataTable,
  DensityProvider,
  DropdownSelector,
  Tabs,
  useFluidHover,
  FluidHoverHighlight,
} from "../../packages/mds/src";
import { lightTokens, tokenCssVariables } from "../../src/common/ui/tokens";
import { siloLightThemeOverrides } from "../../src/common/siloTheme";

for (const [name, value] of Object.entries(tokenCssVariables(lightTokens)))
  document.documentElement.style.setProperty(name, value);
const store = configureStore({
  reducer: () => ({ system: { language: "en" } }),
});
const baseOptions = Array.from({ length: 32 }, (_, index) => ({
  value: String(index),
  label: `Option ${index}`,
  disabled: index === 0 || index === 5,
}));
const records = Array.from({ length: 100 }, (_, index) => ({
  name: `Row ${index}`,
}));
const counts = { rows: 0, clicked: "", gap: 0, control: 0 };
Object.assign(window, { fluidCounts: counts });
function Harness() {
  const anchor = useRef<HTMLButtonElement>(null);
  const inputAnchor = useRef<HTMLInputElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("normal");
  const [optionChange, setOptionChange] = useState("");
  const [keepInputFocus, setKeepInputFocus] = useState(false);
  const options = baseOptions
    .filter(
      (option) =>
        (optionChange !== "remove" || option.value !== "31") &&
        (optionChange !== "remove-first" || option.value !== "0"),
    )
    .map((option) => ({
      ...option,
      disabled:
        option.disabled ||
        (optionChange === "disable" && option.value === "31"),
    }));
  const [tab, setTab] = useState("tab-0");
  const [disabledTab, setDisabledTab] = useState("");
  const [rows, setRows] = useState(records);
  const [shortTable, setShortTable] = useState(false);
  const [columnsShown, setColumnsShown] = useState(["c0"]);
  const [removed, setRemoved] = useState(false);
  const hover = useFluidHover(grid, {
    axis: "xy",
    gapClick: { maxDistance: 16 },
  });
  return (
    <ThemeProvider theme={siloLightThemeOverrides}>
      {["Disabled", "Empty"].map((kind) => (
        <div key={kind}>
          <button id={`${kind}-before`}>Before {kind}</button>
          <OverflowMenu
            label={`${kind} actions`}
            items={
              kind === "Empty"
                ? []
                : [
                    {
                      label: "Unavailable",
                      disabled: true,
                      onClick: () => counts.control++,
                    },
                  ]
            }
          />
          <button id={`${kind}-after`}>After {kind}</button>
        </div>
      ))}
      <button id="before">Before</button>
      <button
        id="trigger"
        ref={anchor}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Open choices
      </button>
      <button id="after">After</button>
      <button id="empty" onClick={() => setMode("empty")}>
        Empty choices
      </button>
      <button id="disabled" onClick={() => setMode("disabled")}>
        Disabled choices
      </button>
      <button id="remove-option" onClick={() => setOptionChange("remove")}>
        Remove last option
      </button>
      <button
        id="remove-first-option"
        onClick={() => setOptionChange("remove-first")}
      >
        Remove first option
      </button>
      <button id="disable-option" onClick={() => setOptionChange("disable")}>
        Disable last option
      </button>
      <button id="input-mode" onClick={() => setKeepInputFocus(true)}>
        Keep input focus
      </button>
      {keepInputFocus && (
        <input
          id="combo-trigger"
          ref={inputAnchor}
          role="combobox"
          aria-controls="choices"
          aria-expanded={open}
          aria-label="Search choices"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && !open) setOpen(true);
          }}
        />
      )}
      <DropdownSelector
        id="choices"
        ariaLabel="Choices"
        open={open}
        anchorEl={keepInputFocus ? inputAnchor.current : anchor.current}
        autoFocus={!keepInputFocus}
        hideTriggerAction={() => setOpen(false)}
        options={
          mode === "empty" ? [] : mode === "disabled" ? [options[0]] : options
        }
        onSelect={(value) => {
          counts.clicked = String(value);
        }}
      />
      <button id="disable-tab" onClick={() => setDisabledTab(tab)}>
        Disable selected tab
      </button>
      <div id="tabs" style={{ width: 300, height: 150 }}>
        <Tabs
          horizontal
          currentTabOrPath={tab}
          onTabClick={setTab}
          options={Array.from({ length: 8 }, (_, index) => ({
            tabConfig: {
              id: `tab-${index}`,
              label: `Tab ${index}`,
              disabled: index === 2 || disabledTab === `tab-${index}`,
            },
            content: `Panel ${index}`,
          }))}
        />
      </div>
      <div id="vertical" style={{ height: 150, width: 500 }}>
        <Tabs
          useRouteTabs
          currentTabOrPath={tab}
          onTabClick={setTab}
          routes={<div>Route {tab}</div>}
          options={Array.from({ length: 20 }, (_, index) => ({
            tabConfig: {
              id: `route-${index}`,
              to: `tab-${index}`,
              label: `Route ${index}`,
            },
          }))}
          sx={{
            ".optionsContainer": { maxHeight: "100%" },
            ".optionsList": { maxHeight: "150px" },
          }}
        />
      </div>
      <div
        id="grid"
        ref={grid}
        style={{
          position: "relative",
          isolation: "isolate",
          display: "grid",
          gridTemplateColumns: "80px 80px",
          gap: 12,
          width: 220,
          padding: 8,
        }}
      >
        <FluidHoverHighlight hover={hover} style={{ zIndex: -1 }} />
        {!removed && (
          <button
            data-fluid-index="0"
            data-fluid-key="a"
            onClick={() => counts.gap++}
            style={{ height: 36 }}
          >
            A
          </button>
        )}
        <button
          data-fluid-index="1"
          data-fluid-key="b"
          style={{ height: 36 }}
          onClick={() => counts.gap++}
        >
          B
        </button>
        <button data-fluid-index="2" data-fluid-key="disabled" disabled>
          Disabled
        </button>
        <button id="embedded" onClick={() => counts.control++}>
          Control
        </button>
      </div>
      <button id="remove" onClick={() => setRemoved((value) => !value)}>
        Remove A
      </button>
      <button id="remove-rows" onClick={() => setRows([])}>
        Remove rows
      </button>
      <div id="long-columns" style={{ width: 600 }}>
        <DataTable
          records={records.slice(0, 2)}
          columns={Array.from({ length: 32 }, (_, index) => ({
            label: `Column ${index}`,
            elementKey: `c${index}`,
          }))}
          columnsSelector
          columnsShown={columnsShown}
          onColumnChange={(key) =>
            setColumnsShown((current) =>
              current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key],
            )
          }
          customPaperHeight="220px"
        />
      </div>
      <DensityProvider density="compact">
        <div id="compact-table">
          <DataTable
            records={records.slice(0, 2)}
            columns={[{ label: "Name", elementKey: "name" }]}
            customPaperHeight="200px"
          />
        </div>
      </DensityProvider>
      <button id="virtualize" onClick={() => setShortTable(true)}>
        Short table
      </button>
      <div id="table">
        <DataTable
          records={rows}
          idField="name"
          entityName="One hundred rows"
          customPaperHeight={shortTable ? "220px" : "3800px"}
          columns={[
            {
              label: "Name",
              elementKey: "name",
              renderFunction: (name) => {
                counts.rows++;
                return name;
              },
            },
          ]}
          itemActions={[
            {
              type: "view",
              onClick: (value) => {
                counts.clicked = value;
              },
            },
          ]}
        />
      </div>
    </ThemeProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <Harness />
  </Provider>,
);
