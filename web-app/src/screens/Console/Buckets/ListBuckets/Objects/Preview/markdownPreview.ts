// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// These limits apply only to rendered Markdown. The bounded download remains
// available in Source, including content too complex to parse or render.
const MAX_SOURCE_CHARACTERS = 262_144;
const MAX_SYNTAX_CHARACTERS = 20_000;
const MAX_DEPTH = 32;
const MAX_NODES = 10_000;
const MAX_TABLE_COLUMNS = 100;
const MAX_TABLE_ROWS = 500;
const MAX_TABLE_CELLS = 10_000;

export class MarkdownPreviewLimitError extends Error {
  constructor() {
    super("Markdown preview exceeds its structural budget.");
    this.name = "MarkdownPreviewLimitError";
  }
}

const enforce = (withinLimit: boolean) => {
  if (!withinLimit) throw new MarkdownPreviewLimitError();
};

// A conservative, linear scan protects the parser itself. It intentionally
// counts escaped/code syntax too: a false positive still has an intact Source.
export const assertMarkdownSourceBudget = (source: string): void => {
  enforce(source.length <= MAX_SOURCE_CHARACTERS);
  let syntaxCharacters = 0;
  let brackets = 0;
  let lines = 1;
  for (const char of source) {
    if ("\r\n>*_[]!|`#~<-=+".includes(char)) syntaxCharacters += 1;
    enforce(syntaxCharacters <= MAX_SYNTAX_CHARACTERS);
    if (char === "[") brackets += 1;
    if (char === "]") brackets = Math.max(0, brackets - 1);
    enforce(brackets <= MAX_DEPTH);
    if (char === "\r" || char === "\n") {
      brackets = 0;
      lines += 1;
      enforce(lines <= MAX_NODES);
    }
  }
  for (const line of source.split(/\r\n|\r|\n/)) {
    let depth = 0;
    let indentation = 0;
    for (let index = 0; index < line.length;) {
      const char = line[index];
      if (char === " " || char === "\t") {
        indentation += char === "\t" ? 4 : 1;
        enforce(indentation <= MAX_DEPTH * 4);
        index += 1;
        continue;
      }
      if (char === ">") index += 1;
      else if ("-*+".includes(char) && /[ \t]/.test(line[index + 1] || ""))
        index += 1;
      else {
        const marker = /^\d{1,9}[.)][ \t]/.exec(line.slice(index));
        if (!marker) break;
        index += marker[0].length;
      }
      depth += 1;
      enforce(depth <= MAX_DEPTH);
    }
  }
};

// Walk iteratively before recursive mdast-to-hast conversion, then again
// before React conversion. Count padded GFM cells, not merely present cells.
export const assertMarkdownTreeBudget = (tree: unknown): void => {
  const pending = [{ node: tree, depth: 0 }];
  let nodes = 0;
  let tableCells = 0;
  while (pending.length > 0) {
    const entry = pending.pop()!;
    nodes += 1;
    enforce(nodes <= MAX_NODES && entry.depth <= MAX_DEPTH);
    if (typeof entry.node !== "object" || entry.node === null) continue;
    const node = entry.node as Record<string, unknown>;
    const children = Array.isArray(node.children) ? node.children : [];
    enforce(nodes + pending.length + children.length <= MAX_NODES);
    if (node.type === "table") {
      const columns = Array.isArray(node.align) ? node.align.length : 0;
      tableCells += columns * children.length;
      enforce(
        columns <= MAX_TABLE_COLUMNS &&
          children.length <= MAX_TABLE_ROWS &&
          tableCells <= MAX_TABLE_CELLS,
      );
    }
    for (const child of children)
      pending.push({ node: child, depth: entry.depth + 1 });
  }
};

export const markdownTreeBudget = () => assertMarkdownTreeBudget;
