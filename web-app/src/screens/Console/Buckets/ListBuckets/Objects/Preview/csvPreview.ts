// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

const MAX_CSV_PREVIEW_ROWS = 500;
const MAX_CSV_PREVIEW_COLUMNS = 100;

// RFC 4180 field quoting also applies to TSV. Retain embedded newlines and
// empty cells. A terminal record separator does not add a phantom record.
// A partial final quoted field (e.g. the 1 MiB boundary) stays readable.
export const parseDelimitedPreview = (
  source: string,
  delimiter: "," | "\t" = ",",
  limit = MAX_CSV_PREVIEW_ROWS,
): { rows: string[][]; truncated: boolean; columnsTruncated: boolean } => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let recordStart = 0;
  let columnsTruncated = false;
  // Bound columns as well as records. Padding 500 records to an attacker-
  // supplied width can otherwise turn a 1 MiB CSV into millions of DOM cells.
  const finishField = () => {
    if (row.length < MAX_CSV_PREVIEW_COLUMNS) row.push(field);
    else columnsTruncated = true;
    field = "";
  };
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' && (quoted || field.length === 0)) {
      if (quoted && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === delimiter) {
      finishField();
    } else if (!quoted && (char === "\r" || char === "\n")) {
      finishField();
      rows.push(row);
      row = [];
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      recordStart = index + 1;
      if (rows.length >= limit)
        return {
          rows,
          truncated: recordStart < source.length,
          columnsTruncated,
        };
    } else {
      field += char;
    }
  }
  if (recordStart < source.length) {
    finishField();
    rows.push(row);
  }
  return { rows, truncated: false, columnsTruncated };
};
