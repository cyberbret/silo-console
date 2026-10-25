// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  DataTable,
  IconButton,
  Menu,
  PageHeader,
  ThemeHandler,
  ControlledSortConfig,
  IColumns,
  ITableSortInfo,
} from "mds";
import { lightTheme } from "../../packages/mds/src/global/themes";

const columns: IColumns[] = [
  { label: "Name", elementKey: "name", priority: "high" },
  { label: "Size", elementKey: "size", priority: "medium" },
  {
    label: "Created",
    elementKey: "created",
    priority: "low",
    enableSort: false,
  },
];
const records = [
  { name: "bravo", size: 20, created: "2026-10-23" },
  { name: "alpha", size: 10, created: "2026-10-22" },
];

function Harness() {
  const [expanded, setExpanded] = useState(true);
  const [longNames, setLongNames] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [path, setPath] = useState("/buckets");
  const [sort, setSort] = useState<ControlledSortConfig>({
    field: "name",
    direction: "ASC",
  });
  const [requestedSort, setRequestedSort] = useState(sort);
  const [sortCalls, setSortCalls] = useState(0);
  const [legacySort, setLegacySort] = useState<ITableSortInfo>({
    sortBy: "name",
    sortDirection: "ASC",
  });
  const [manualSort, setManualSort] = useState(legacySort);
  const [disabledClicks, setDisabledClicks] = useState(0);
  const [indicator, setIndicator] = useState(false);
  const [stableBrand, setStableBrand] = useState(false);

  return (
    <ThemeHandler
      customTheme={{
        ...lightTheme,
        menu: {
          ...lightTheme.menu,
          vertical: {
            ...lightTheme.menu!.vertical!,
            activeIndicatorColor: indicator ? "#E0A35C" : undefined,
          },
        },
      }}
    >
      <PageHeader
        label="Components"
        menuToggle={
          <button id="drawer-trigger" onClick={() => setMobileOpen(true)}>
            Open menu
          </button>
        }
      />
      <div style={{ display: "flex", gap: 16 }}>
        <Menu
          logo={
            <span style={{ display: "block", height: stableBrand ? 20 : 48 }}>
              SILO
            </span>
          }
          brandMark={
            stableBrand ? (
              <span
                style={{
                  display: "block",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "currentColor",
                }}
              />
            ) : undefined
          }
          collapsedLogo={<span>S</span>}
          isOpen={expanded}
          collapseAction={() => setExpanded(!expanded)}
          mobileMode="auto"
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
          callPathAction={setPath}
          currentPath={path}
          signOutAction={() => setPath("/logout")}
          signOutLabel="Leave console"
          endComponent={
            <Button
              id="drawer-disabled"
              disabled
              disabledReason="Select a bucket first"
            >
              Unavailable action
            </Button>
          }
          options={[
            {
              name: "Buckets",
              path: "/buckets",
              icon: <span>B</span>,
              inlineChildren: true,
              children: longNames
                ? [
                    {
                      name: "very-long-production-archive-bucket-with-63-characters-12345678901",
                      path: "/browser/long-bucket",
                      icon: <span>B</span>,
                      visibleTooltip: true,
                    },
                    ...["logs", "backups", "demo-data", "team-06"].map(
                      (name) => ({
                        name,
                        path: `/browser/${name}`,
                        icon: <span>B</span>,
                        visibleTooltip: true,
                      }),
                    ),
                  ]
                : undefined,
            },
            { name: "Users", path: "/users", icon: <span>U</span> },
            {
              name: "Custom navigation",
              path: "/custom",
              icon: <span>C</span>,
              onClick: setPath,
            },
          ]}
        />
        <main style={{ minWidth: 0, flex: 1 }}>
          <button id="stable-brand" onClick={() => setStableBrand(true)}>
            Use stable brand
          </button>
          <button id="indicator" onClick={() => setIndicator(!indicator)}>
            Toggle indicator
          </button>
          <button id="long-names" onClick={() => setLongNames(true)}>
            Long bucket names
          </button>
          <output id="path">{path}</output>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              margin: "16px 0",
            }}
          >
            <Button
              id="disabled-action"
              disabled
              disabledReason="Select a bucket first"
              onClick={() => setDisabledClicks(disabledClicks + 1)}
            >
              Delete bucket
            </Button>
            <IconButton
              disabled
              disabledReason="Refresh is unavailable"
              aria-label="Refresh"
              onClick={() => setDisabledClicks(disabledClicks + 1)}
            >
              <span>↻</span>
            </IconButton>
            <Button id="plain-disabled" disabled>
              Disabled
            </Button>
            <Button id="enabled-action" disabledReason="Ignored while enabled">
              Enabled
            </Button>
            <output id="disabled-clicks">{disabledClicks}</output>
          </div>
          <div data-testid="controlled">
            <DataTable
              columns={columns}
              records={records}
              customPaperHeight="180px"
              sortConfig={sort}
              onSortChange={(field, direction) => {
                setRequestedSort({ field, direction });
                setSortCalls(sortCalls + 1);
              }}
            />
            <output id="requested-sort">
              {requestedSort.field}:{requestedSort.direction}:{sortCalls}
            </output>
            <button id="apply-sort" onClick={() => setSort(requestedSort)}>
              Apply sort
            </button>
          </div>
          <div data-testid="legacy">
            <DataTable
              columns={columns}
              records={[...records]}
              customPaperHeight="180px"
              sortEnabled={["name"]}
              sortCallBack={setLegacySort}
            />
            <output id="legacy-sort">
              {legacySort.sortBy}:{legacySort.sortDirection}
            </output>
          </div>
          <div data-testid="manual">
            <DataTable
              columns={columns}
              records={records}
              customPaperHeight="180px"
              sortEnabled={{
                currentSort: manualSort.sortBy,
                currentDirection: manualSort.sortDirection,
                onSortClick: setManualSort,
              }}
            />
            <output id="manual-sort">
              {manualSort.sortBy}:{manualSort.sortDirection}
            </output>
          </div>
          <DataTable
            columns={columns}
            records={[]}
            customPaperHeight="100px"
            customEmptyMessage="Legacy empty message"
            emptyState={<p>No records. Create a bucket to begin.</p>}
          />
        </main>
      </div>
    </ThemeHandler>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
