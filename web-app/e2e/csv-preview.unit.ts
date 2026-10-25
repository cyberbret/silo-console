// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import { parseDelimitedPreview } from "../src/screens/Console/Buckets/ListBuckets/Objects/Preview/csvPreview";

test("CSV handles quotes, escaped quotes, CRLF, embedded newlines and empty fields", () => {
  expect(
    parseDelimitedPreview(
      'name,value,empty\r\n"a,b","say ""hello""",\r\n"line 1\r\nline 2",,end\r\n',
    ),
  ).toEqual({
    rows: [
      ["name", "value", "empty"],
      ["a,b", 'say "hello"', ""],
      ["line 1\r\nline 2", "", "end"],
    ],
    truncated: false,
    columnsTruncated: false,
  });
});
test("TSV uses tabs outside quoted fields", () => {
  expect(
    parseDelimitedPreview('name\tvalue\n"a\tb"\t"a""b"\n', "\t").rows,
  ).toEqual([
    ["name", "value"],
    ["a\tb", 'a"b'],
  ]);
});
test("empty inputs, empty fields and blank records stay distinct", () => {
  expect(parseDelimitedPreview("").rows).toEqual([]);
  expect(parseDelimitedPreview(",,\n\n").rows).toEqual([["", "", ""], [""]]);
  expect(parseDelimitedPreview('""').rows).toEqual([[""]]);
  expect(parseDelimitedPreview("a,b,").rows).toEqual([["a", "b", ""]]);
});
test("a truncated quoted field stays inert and readable", () => {
  expect(parseDelimitedPreview('a,"<img src=x>\npartial').rows).toEqual([
    ["a", "<img src=x>\npartial"],
  ]);
});
test("the 500 record limit counts records, not embedded lines", () => {
  const source = Array.from({ length: 500 }, (_, i) => `"row\n${i}",${i}`).join(
    "\r\n",
  );
  for (const suffix of ["", "\r\n"])
    expect(parseDelimitedPreview(source + suffix).truncated).toBe(false);
  const result = parseDelimitedPreview(source + "\r\nextra,data");
  expect(result.rows).toHaveLength(500);
  expect(result.rows[499]).toEqual(["row\n499", "499"]);
  expect(result.truncated).toBe(true);
});

test("wide CSV records cannot amplify a bounded download into millions of table cells", () => {
  const source = ",".repeat(100_000) + "\n" + "short\n".repeat(499);
  const result = parseDelimitedPreview(source);
  expect(result.rows).toHaveLength(500);
  expect(Math.max(...result.rows.map((row) => row.length))).toBe(100);
  expect(result.columnsTruncated).toBe(true);
  expect(result.truncated).toBe(false);
});

test("discarded CSV columns still honor quotes, escaped quotes and record boundaries", () => {
  const source = "cell,".repeat(100) + '"discarded,\n""quoted"""\r\nkept,value';
  const result = parseDelimitedPreview(source);
  expect(result.rows[0]).toHaveLength(100);
  expect(result.rows[1]).toEqual(["kept", "value"]);
  expect(result.columnsTruncated).toBe(true);
});
