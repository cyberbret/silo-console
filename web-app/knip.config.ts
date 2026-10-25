import type { KnipConfig } from "knip";

export default {
  workspaces: {
    ".": {
      // GUI fixtures use the separately installed SILO client, not an npm binary.
      ignoreBinaries: ["mcli"],
      entry: [
        "src/**/{index,main}.{ts,tsx}",
        "e2e/**/*.{ts,tsx}",
        "tests/**/*.ts",
      ],
      project: [
        "src/**/*.{ts,tsx}",
        "!src/api/**/*",
        "e2e/**/*.{ts,tsx}",
        "tests/**/*.ts",
      ],
    },
    "packages/mds": {
      // Preserve upstream library modules, including those Console does not use.
      // Keep dependency and import checks, without pruning the library's API.
      entry: ["src/**/*.{ts,tsx}"],
      project: ["src/**/*.{ts,tsx}"],
    },
  },
  // Upstream exposes these through both named and default exports.
  ignoreIssues: {
    "packages/mds/src/components/HelpTip/HelpTip.tsx": ["duplicates"],
    "packages/mds/src/global/FieldContainer.tsx": ["duplicates"],
  },
  rules: {
    binaries: "error",
    dependencies: "error",
    devDependencies: "off",
    duplicates: "error",
    files: "error",
    nsExports: "error",
    nsTypes: "error",
    unlisted: "error",
    unresolved: "error",
    types: "error",
    exports: "error",
    enumMembers: "off",
  },
} satisfies KnipConfig;
