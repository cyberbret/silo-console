// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "../../src/store";
import PreviewText from "../../src/screens/Console/Buckets/ListBuckets/Objects/Preview/PreviewText";
import ObjectActionTooltip from "../../src/screens/Console/Buckets/ListBuckets/Objects/ObjectActionTooltip";
import { objectActionState } from "../../src/screens/Console/Buckets/ListBuckets/Objects/objectActionState";

const format = new URLSearchParams(window.location.search).get("format");
const kind = format === "markdown" || format === "csv" ? format : "text";
const state = objectActionState({ action: "legalHold", locking: false });
const root = document.getElementById("root");
if (!root) throw new Error("Missing test root");
createRoot(root).render(
  <Provider store={store}>
    <ObjectActionTooltip state={state} label="Legal Hold">
      <button id="disabled-action" disabled={state.disabled}>
        Legal Hold
      </button>
    </ObjectActionTooltip>
    <PreviewText
      bucketName="demo"
      actualInfo={{
        name: `sample.${kind === "markdown" ? "md" : kind === "csv" ? "csv" : "log"}`,
      }}
      kind={kind}
    />
  </Provider>,
);
