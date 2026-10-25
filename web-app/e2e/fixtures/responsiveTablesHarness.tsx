// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DataTable, DensityProvider, ThemeHandler } from "mds";
import type { IColumns } from "mds";
import { lightTheme } from "../../packages/mds/src/global/themes";

const records = Array.from({ length: 200 }, (_, index) => ({
  name: `record-${String(index).padStart(3, "0")}`,
  status: "Enabled",
  policies: "readwrite",
  groups: "analysts",
}));

function Harness() {
  const list = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(records[0].name);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectionCalls, setSelectionCalls] = useState(0);
  const [navigationCalls, setNavigationCalls] = useState(0);
  const [actionCalls, setActionCalls] = useState(0);
  const [compact, setCompact] = useState(false);
  const [owned, setOwned] = useState(true);
  const [phase, setPhase] = useState("rows");
  const toggle = (name: string) => {
    setSelectionCalls((value) => value + 1);
    setSelected((values) =>
      values.includes(name)
        ? values.filter((value) => value !== name)
        : [...values, name],
    );
  };
  const columns: IColumns[] = [
    { label: "Name", elementKey: "name", priority: "high" },
    { label: "Status", elementKey: "status", priority: "high", width: 100 },
    {
      label: "Policies",
      elementKey: "policies",
      priority: "medium",
      width: 150,
    },
    { label: "Groups", elementKey: "groups", priority: "low", width: 200 },
    {
      label: "Actions",
      priority: "high",
      width: 48,
      globalClass: "mds-row-actions",
      renderFullObject: true,
      renderFunction: (row: (typeof records)[number]) => (
        <span onClick={(event) => event.stopPropagation()}>
          <button
            aria-label={`Actions for ${row.name}`}
            tabIndex={owned ? -1 : undefined}
            style={{ width: 40, height: "100%", minHeight: 28, border: 0 }}
            onClick={() => setActionCalls((value) => value + 1)}
          >
            …
          </button>
        </span>
      ),
    },
  ];
  return (
    <ThemeHandler customTheme={lightTheme}>
      <button id="density" onClick={() => setCompact(!compact)}>
        Toggle density
      </button>
      <button id="ownership" onClick={() => setOwned(!owned)}>
        Toggle interaction
      </button>
      <select
        id="table-phase"
        aria-label="Table content"
        value={phase}
        onChange={(event) => setPhase(event.target.value)}
      >
        <option value="rows">Rows</option>
        <option value="loading">Loading</option>
        <option value="empty">Empty</option>
      </select>
      <output id="selection-calls">{selectionCalls}</output>
      <output id="navigation-calls">{navigationCalls}</output>
      <output id="action-calls">{actionCalls}</output>
      <button id="before">Before table</button>
      <DensityProvider density={compact ? "compact" : "default"}>
        <DataTable
          columns={columns}
          records={phase === "empty" ? [] : records}
          isLoading={phase === "loading"}
          loadingState={<p>Loading records</p>}
          emptyState={<p>No records</p>}
          entityName="Records"
          idField="name"
          customPaperHeight="360px"
          selectedItems={selected}
          onSelect={(event) => toggle(event.target.value)}
          onSelectAll={() => {
            setSelectionCalls((value) => value + 1);
            setSelected((values) =>
              values.length === records.length
                ? []
                : records.map((row) => row.name),
            );
          }}
          itemActions={[
            {
              type: "view",
              onClick: () => setNavigationCalls((value) => value + 1),
            },
          ]}
          interaction={
            owned
              ? {
                  activeId: active,
                  focusRequest: 0,
                  listRef: list,
                  onActiveChange: setActive,
                  rowLabel: (row) => row.name,
                  onKeyDown: () => {},
                  onClick: (_event, row, checkbox) => {
                    if (checkbox) toggle(row.name);
                    else setNavigationCalls((value) => value + 1);
                  },
                  onContextMenu: () => {},
                }
              : undefined
          }
        />
      </DensityProvider>
      <button id="after">After table</button>
    </ThemeHandler>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
