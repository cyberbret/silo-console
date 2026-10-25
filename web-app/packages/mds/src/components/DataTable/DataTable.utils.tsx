// This file is part of MinIO Design System
// Copyright (c) 2023 MinIO, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import React, { Fragment } from "react";
import get from "lodash/get";
import isString from "lodash/isString";
import isPlainObject from "lodash/isPlainObject";
import { Column, SortDirectionType } from "react-virtualized";
import {
  IColumns,
  ISortConfig,
  ItemActions,
  ITableSortInfo,
} from "./DataTable.types";
import { calculateColumnRest, nextSortDirection } from "./DataTable.logic";
import ArrowDropUpIcon from "../Icons/ArrowDropUp";
import ArrowDropDownIcon from "../Icons/ArrowDropDown";
import Loader from "../Loader/Loader";
import TableActionButton from "./TableActionButton";

export const selectWidth = 45;

// Function to render elements in table
const subRenderFunction = (
  rowData: any,
  column: IColumns,
  isSelected: boolean,
) => {
  const itemElement = isString(rowData)
    ? rowData
    : get(rowData, column.elementKey || "", null); // If the element is just a string, we render it as it is
  const renderConst = column.renderFullObject ? rowData : itemElement;

  const renderElement = column.renderFunction
    ? column.renderFunction(renderConst)
    : renderConst; // If render function is set, we send the value to the function.

  return (
    <Fragment>
      <span className={isSelected ? "selected" : ""}>{renderElement}</span>
    </Fragment>
  );
};

// Function that renders Columns in table
export const generateColumnsMap = (
  columns: IColumns[],
  containerWidth: number,
  actionsWidth: number,
  hasSelect: boolean,
  hasActions: boolean,
  selectedItems: string[],
  idField: string,
  columnsSelector: boolean,
  columnsShown: string[],
  sortColumns: boolean | string[] | ISortConfig,
  currentSortColumn: string | undefined,
  currentSortDirection: "ASC" | "DESC" | undefined,
  onSort?: (sort: ITableSortInfo) => void,
  viewportWidth = Infinity,
) => {
  const manualSortEnabled =
    sortColumns &&
    typeof sortColumns === "object" &&
    !Array.isArray(sortColumns);

  const commonRestWidth = calculateColumnRest(
    columnsSelector
      ? columns.filter((column) => columnsShown.includes(column.elementKey!))
      : columns,
    containerWidth -
      (hasSelect ? selectWidth : 0) -
      (hasActions ? actionsWidth : 0),
    viewportWidth,
  );
  const responsive = columns.some((column) => column.priority);
  return columns.map((column: IColumns, index: number) => {
    if (columnsSelector && !columnsShown.includes(column.elementKey!)) {
      return null;
    }

    // Manual Column Sort state, Enabled by default.
    const manualColumnSortEnabled =
      column.enableSort !== undefined ? column.enableSort : true;

    const disableSort =
      !sortColumns ||
      (manualSortEnabled && !manualColumnSortEnabled) ||
      (Array.isArray(sortColumns) &&
        !sortColumns.includes(column?.elementKey || ""));

    const field = column.elementKey || `column-${index}`;
    const priorityClass = column.priority
      ? `mds-priority-${column.priority}`
      : "";
    const headerContent = (
      <>
        <span className="sortLabel">{column.label}</span>
        {!disableSort &&
          currentSortColumn === field &&
          (currentSortDirection === "ASC" ? (
            <ArrowDropUpIcon />
          ) : (
            <ArrowDropDownIcon />
          ))}
      </>
    );

    return (
      // @ts-ignore
      <Column
        key={`col-tb-${index.toString()}`}
        dataKey={field}
        label={column.label}
        headerClassName={`titleHeader ${priorityClass} ${column.globalClass || ""} ${
          column.headerTextAlign ? `text-${column.headerTextAlign}` : ""
        }`}
        headerRenderer={() =>
          !disableSort ? (
            <button
              type="button"
              className="sortHeader"
              onClick={() =>
                onSort?.({
                  sortBy: field,
                  sortDirection: nextSortDirection(
                    field,
                    currentSortColumn,
                    currentSortDirection,
                  ),
                })
              }
            >
              {headerContent}
            </button>
          ) : (
            <span className="sortHeader">{headerContent}</span>
          )
        }
        className={`${priorityClass} ${column.globalClass || ""} ${column.rowClass || ""} ${column.contentTextAlign ? `text-${column.contentTextAlign}` : ""}`}
        cellRenderer={({ rowData }) => {
          const isSelected = selectedItems
            ? selectedItems.includes(
                isString(rowData) ? rowData : `${rowData[idField]}`,
              )
            : false;
          return subRenderFunction(rowData, column, isSelected);
        }}
        width={column.width || commonRestWidth}
        flexGrow={0}
        flexShrink={responsive ? 0 : 1}
        // The native header button owns activation. The Table still sets
        // aria-sort on the active columnheader from sortBy/sortDirection.
        disableSort
        defaultSortDirection={"ASC"}
      />
    );
  });
};

// Function to render the action buttons
export const elementActions = (
  actions: ItemActions[],
  valueToSend: any,
  selected: boolean,
  idField: string,
) => {
  return actions.map((action: ItemActions, index: number) => {
    if (action.type === "view") {
      return null;
    }

    let disabled = false;

    if (!!action.isDisabled) {
      if (typeof action.isDisabled === "boolean") {
        disabled = action.isDisabled;
      } else {
        disabled = action.isDisabled(valueToSend);
      }
    }

    if (!!action.showLoader) {
      if (
        (typeof action.showLoader === "boolean" && action.showLoader) ||
        action.showLoader(valueToSend)
      ) {
        return (
          <div className={"progress-enabled"}>
            <Loader
              style={{ width: 18, height: 18 }}
              key={`actions-loader-${action.type}-${index.toString()}`}
            />
          </div>
        );
      }
    }

    return (
      <TableActionButton
        tooltip={action.tooltip}
        type={action.type}
        onClick={action.onClick}
        valueToSend={valueToSend}
        selected={selected}
        key={`actions-${action.type}-${index.toString()}`}
        idField={idField}
        sendOnlyId={!!action.sendOnlyId}
        disabled={disabled}
      />
    );
  });
};

// Function to calculate the options column width according elements inside
export const calculateOptionsSize = (
  containerWidth: number,
  totalOptions: number,
) => {
  const minContainerSize = 36;
  const sizeOptions = totalOptions * 36;

  if (sizeOptions < minContainerSize) {
    return minContainerSize;
  }

  if (sizeOptions > containerWidth) {
    return containerWidth;
  }

  return sizeOptions;
};

// Function to sort records in the list
export const sortRecords = (
  records: any[],
  sortColumn: string | undefined,
  sortDirection: SortDirectionType,
) => {
  const sortedRecords = records;

  if (records.length === 0) {
    return records;
  }

  // Records are objects
  if (isPlainObject(records[0]) && sortColumn !== undefined) {
    switch (sortDirection) {
      case "ASC":
        sortedRecords.sort((a, b) => {
          if (a[sortColumn] > b[sortColumn]) {
            return 1;
          }
          if (a[sortColumn] < b[sortColumn]) {
            return -1;
          }
          // a must be equal to b
          return 0;
        });
        break;
      case "DESC":
        sortedRecords.sort((a, b) => {
          if (a[sortColumn] < b[sortColumn]) {
            return 1;
          }
          if (a[sortColumn] > b[sortColumn]) {
            return -1;
          }
          // a must be equal to b
          return 0;
        });
        break;
    }
  } else {
    // Record is plain array
    switch (sortDirection) {
      case "ASC":
        sortedRecords.sort((a, b) => {
          if (a > b) {
            return 1;
          }
          if (a < b) {
            return -1;
          }
          // a must be equal to b
          return 0;
        });
        break;
      case "DESC":
        sortedRecords.sort((a, b) => {
          if (a < b) {
            return 1;
          }
          if (a > b) {
            return -1;
          }
          // a must be equal to b
          return 0;
        });
        break;
    }
  }

  return sortedRecords;
};
