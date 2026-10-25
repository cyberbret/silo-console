// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Test-only source manifest. Expand these explicit JSON paths at test time so
// help edits never require copying English prose into a second list. A "*"
// matches one object key or array index; null headers are ignored.
// HelpMenu translates docs/video headers; HelpItem translates titles/bodies.
// Blog content comes from RSS, not this JSON's unused blog sections.
export const indirectKeySources = [
  {
    file: "screens/Console/helpTopics.json",
    paths: [
      ["*", "docs", "header"],
      ["*", "docs", "links", "*", "title"],
      ["*", "docs", "links", "*", "body"],
      ["*", "video", "header"],
      ["*", "video", "links", "*", "title"],
      ["*", "video", "links", "*", "body"],
    ],
  },
] as const;
