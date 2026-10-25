// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  assertMarkdownSourceBudget,
  assertMarkdownTreeBudget,
  MarkdownPreviewLimitError,
  markdownTreeBudget,
} from "../src/screens/Console/Buckets/ListBuckets/Objects/Preview/markdownPreview";

const render = (source: string) => {
  assertMarkdownSourceBudget(source);
  return renderToStaticMarkup(
    React.createElement(ReactMarkdown, {
      skipHtml: true,
      remarkPlugins: [remarkGfm, markdownTreeBudget],
      rehypePlugins: [markdownTreeBudget],
      children: source,
    }),
  );
};

test("ordinary Markdown retains headings, quotes, links, code and GFM tables", () => {
  const html = render(
    "# Heading\n\n> A quote\n\n- [link](https://example.test/)\n\n```sql\nselect 1;\n```\n\n| Name | Value |\n| --- | --- |\n| A | 1 |",
  );
  expect(html).toContain("<h1>Heading</h1>");
  expect(html).toContain("<blockquote>");
  expect(html).toContain("<table>");
  expect(html).toContain("<td>1</td>");
});

test("rejects recursive source before invoking the Markdown parser", () => {
  for (const source of [
    "> ".repeat(3000) + "text",
    "- ".repeat(1000) + "text",
    "1. ".repeat(1000) + "text",
    "[".repeat(3000) + "text" + "]".repeat(3000),
    " ".repeat(1000) + "- text",
  ])
    expect(() => assertMarkdownSourceBudget(source)).toThrow(
      MarkdownPreviewLimitError,
    );
});

test("bounds parsing work even for shallow or delimiter-heavy input", () => {
  for (const source of [
    "x".repeat(262145),
    "*x* ".repeat(10001),
    "a\n".repeat(10000),
  ])
    expect(() => assertMarkdownSourceBudget(source)).toThrow(
      MarkdownPreviewLimitError,
    );
});

test("the iterative tree guard bounds depth and node count before conversion", () => {
  let tree: unknown = { type: "text", value: "text" };
  for (let depth = 0; depth < 3000; depth++)
    tree = { type: "blockquote", children: [tree] };
  expect(() => assertMarkdownTreeBudget(tree)).toThrow(
    MarkdownPreviewLimitError,
  );
  expect(() =>
    assertMarkdownTreeBudget({
      type: "root",
      children: Array.from({ length: 10000 }, () => ({ type: "text" })),
    }),
  ).toThrow(MarkdownPreviewLimitError);
  expect(() => render("*x* ".repeat(3500))).toThrow(MarkdownPreviewLimitError);
});

const table = (columns: number, rows: number) =>
  `|${" h |".repeat(columns)}\n|${" --- |".repeat(columns)}\n` +
  "| sparse |\n".repeat(rows);

test("GFM table budgets include padded cells, total cells, rows and columns", () => {
  for (const source of [
    table(101, 1),
    table(1, 500),
    table(100, 100),
    table(100, 50) + "\n" + table(100, 50),
  ]) {
    // The source preflight allows these; the parsed table shape must stop
    // amplification before mdast-to-hast pads sparse rows to header width.
    expect(() => assertMarkdownSourceBudget(source)).not.toThrow();
    expect(() => render(source)).toThrow(MarkdownPreviewLimitError);
  }
});
