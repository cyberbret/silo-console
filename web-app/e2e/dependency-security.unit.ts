// Copyright (c) 2026 PGSTY
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createRequire } from "node:module";
import { expect, test } from "@playwright/test";

const require = createRequire(import.meta.url);

function dependencyFrom(chain: string[]) {
  let consumerRequire = require;
  let resolved = "";
  for (const dependency of chain) {
    resolved = consumerRequire.resolve(dependency);
    consumerRequire = createRequire(resolved);
  }
  return require(resolved);
}

// Resolve from its actual consumer instead of relying on transitive hoisting.
const braces = dependencyFrom([
  "vite-plugin-static-copy",
  "chokidar",
  "braces",
]);
const nestingError = /Input nesting exceeds max depth \(100\)/;

test("braces rejects deep strings in every public entrypoint before stack exhaustion", () => {
  const inputs = [
    "{".repeat(4999) + "x" + "}".repeat(4999),
    "(".repeat(4999) + "x" + ")".repeat(4999),
    "{(".repeat(2499) + "x" + ")}".repeat(2499),
    "{".repeat(9999),
    "(".repeat(9999),
    "${" + "{".repeat(4997) + "x" + "}".repeat(4998),
  ];
  const entrypoints = [
    braces,
    (input: string) => braces(input, { expand: true }),
    braces.create,
    braces.parse,
    braces.compile,
    braces.expand,
    braces.stringify,
  ];
  for (const input of inputs) {
    expect(input.length).toBeLessThanOrEqual(10000);
    for (const run of entrypoints) {
      // RangeError: Maximum call stack size exceeded must not satisfy this.
      expect(() => run(input)).toThrow(nestingError);
    }
  }
});

interface AstNode {
  type: string;
  nodes?: AstNode[];
  parent?: AstNode;
  value?: string;
  dollar?: boolean;
  invalid?: boolean;
  ranges?: number;
}

function nestedAst(depth: number): AstNode {
  const root: AstNode = { type: "root", nodes: [] };
  let parent = root;
  for (let i = 0; i < depth; i++) {
    const child: AstNode = { type: "paren", nodes: [], parent };
    parent.nodes!.push(child);
    parent = child;
  }
  parent.nodes!.push({ type: "text", value: "x", parent });
  return root;
}

test("prebuilt ASTs cannot bypass the braces nesting guard", () => {
  for (const depth of [101, 4999]) {
    for (const run of [braces.compile, braces.expand, braces.stringify]) {
      expect(() => run(nestedAst(depth))).toThrow(nestingError);
    }
  }
});

test("delegated stringify preserves the accumulated AST nesting depth", () => {
  for (const kind of ["dollar", "invalid", "range"] as const) {
    for (const delegatedAt of [1, 75]) {
      for (const depth of [100, 101, 150]) {
        const ast = nestedAst(depth);
        let delegated = ast;
        for (let i = 0; i < delegatedAt; i++) {
          delegated = delegated.nodes![0];
        }
        if (kind === "range") delegated.ranges = 1;
        else delegated[kind] = true;
        // Each branch calls stringify from expand, and must not reset depth.
        if (depth === 100) expect(braces.expand(ast)).toEqual(["x"]);
        else expect(() => braces.expand(ast)).toThrow(nestingError);
      }
    }
  }
});

test("braces accepts the full supported nesting depth, including mixed blocks", () => {
  for (const [open, close, count] of [
    ["{", "}", 100],
    ["(", ")", 100],
    ["{(", ")}", 50],
  ] as const) {
    const input = open.repeat(count) + "x" + close.repeat(count);
    expect(braces.compile(input)).toBe(input);
    expect(braces.expand(input)).toEqual([input]);
    expect(braces.stringify(braces.parse(input))).toBe(input);
  }
  for (const run of [braces.compile, braces.stringify]) {
    expect(run(nestedAst(100))).toBe("x");
  }
  expect(braces.expand(nestedAst(100))).toEqual(["x"]);
});

test("literal braces in escaped, quoted and bracket expressions do not consume nesting", () => {
  const literal = "{".repeat(2000);
  for (const input of [literal.replaceAll("{", "\\{"), `"${literal}"`]) {
    expect(braces.compile(input)).toBe(literal);
    expect(braces.expand(input)).toEqual([literal]);
  }
  const bracket = `[${literal}]`;
  expect(braces.compile(bracket)).toBe(bracket);
  expect(braces.expand(bracket)).toEqual([bracket]);
});

for (const [input, compiled, expanded] of [
  ["a/{b,c}/d", "a/(b|c)/d", ["a/b/d", "a/c/d"]],
  ["src/**/*.{ts,tsx}", "src/**/*.(ts|tsx)", ["src/**/*.ts", "src/**/*.tsx"]],
  ["a/{01..03}/b", "a/(0[1-3])/b", ["a/01/b", "a/02/b", "a/03/b"]],
  ["{2..6..2}", "(2|4|6)", ["2", "4", "6"]],
  ["a{b,c,/{x,y}}/e", "a(b|c|/(x|y))/e", ["ab/e", "ac/e", "a/x/e", "a/y/e"]],
  ["{a,b", "{a,b", ["{a,b"]],
  ["${a,b}", "${a,b}", ["${a,b}"]],
] as const) {
  test(`braces preserves normal pattern ${input}`, () => {
    expect(braces(input)).toEqual([compiled]);
    expect(braces.compile(input)).toBe(compiled);
    expect(braces(input, { expand: true })).toEqual(expanded);
    expect(braces.expand(input)).toEqual(expanded);
    expect(braces.stringify(braces.parse(input))).toBe(input);
  });
}

test("both remaining build/test dependency chains load the guarded braces package", () => {
  for (const chain of [
    ["vite-plugin-static-copy", "chokidar", "braces"],
    ["testcafe", "globby", "fast-glob", "micromatch", "braces"],
  ]) {
    const consumerBraces = dependencyFrom(chain);
    expect(() =>
      consumerBraces("{".repeat(101) + "x" + "}".repeat(101)),
    ).toThrow(nestingError);
    expect(consumerBraces("*.{ts,tsx}")).toEqual(["*.(ts|tsx)"]);
  }
});
