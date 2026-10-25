// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { type } from "../../../packages/mds/src/global/typography";
export { type } from "../../../packages/mds/src/global/typography";

// T03 names remain available while screens migrate to the six role names.
export const typography = {
  caption: type("caption"),
  small: type("body"),
  body: type("body"),
  bodyStrong: type("body", { weight: "semibold" }),
  section: type("title"),
  title: type("title"),
  stat: type("display"),
  tableHeader: type("body", { weight: "semibold" }),
};
