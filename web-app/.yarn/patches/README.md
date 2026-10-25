# Dependency patches

The MDS DropdownSelector click-index fix now lives in
`packages/mds/src/components/DropdownSelector/DropdownSelector.tsx`. Keep its
browser regression tests: they bundle the workspace source and exercise mouse,
touch, keyboard, and disabled-option selection.

## Development SDK compatibility

The `minio@8.0.7` patch lets the browser test SDK use `stream-json@3.5.0`,
which fixes [GHSA-528h-pc64-c93x](https://github.com/advisories/GHSA-528h-pc64-c93x).
The SDK's JSONL parser moved from `jsonl/Parser.js` and `.make()` to
`jsonl/parser.js` and `.asStream()`. The patch updates that import and factory
in the source, CommonJS and ESM builds. The `{ key, value }` output is unchanged.

This SDK is a development dependency and is not bundled into Console. Its
CommonJS build requires Node 22 or later to load the parser's ESM module; the
test and build environment uses Node 24. The notification compatibility tests
exercise both SDK builds with fragmented JSONL and malformed input.

Remove the patch when an upstream SDK release supports the fixed parser.

## Build/test glob nesting

The `braces@3.0.3` patch mitigates
[CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
Upstream has no fixed release. The patch bounds combined brace/parenthesis
nesting to 100 during parsing and guards the recursive compile, expand, and
stringify walkers, including callers that supply an AST directly. Deeper input
raises a predictable `SyntaxError` before exhausting the JavaScript stack.
Quoted, escaped, and character-class literals do not count toward nesting.
The upstream MIT license and attribution remain intact.

The Yarn resolution applies the patch to every `braces` consumer. The remaining
paths are TestCafe's glob matcher and the static-copy plugin's watcher; Knip no
longer requires it. `e2e/dependency-security.unit.ts` runs in the existing unit
project and checks the installed consumers, deep patterns, prebuilt ASTs,
the depth boundary, and ordinary glob output. This bounds AST recursion; it does
not make arbitrary untrusted regular expressions or huge expansions safe.

Version-only audit still reports the original advisory for patched 3.0.3. Keep
the existing single-advisory development exception linked to these tests;
production auditing remains unfiltered. Remove the patch and exception when an
upstream release provides equivalent protection and passes the regressions.
