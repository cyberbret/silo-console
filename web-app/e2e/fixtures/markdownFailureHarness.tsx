// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import RootErrorBoundary from "../../src/common/RootErrorBoundary";
import StyleHandler from "../../src/StyleHandler";
import { store } from "../../src/store";
import PreviewFileModal from "../../src/screens/Console/Buckets/ListBuckets/Objects/Preview/PreviewFileModal";

const Harness = () => {
  const [open, setOpen] = useState(true);
  const [actions, setActions] = useState(0);
  return (
    <>
      <h1>Console shell</h1>
      <button onClick={() => setActions((value) => value + 1)}>
        Console action
      </button>
      <output aria-label="Completed actions">{actions}</output>
      <button onClick={() => setOpen(true)}>Open preview</button>
      {open && (
        <PreviewFileModal
          open
          bucketName="demo"
          actualInfo={{ name: "nested.md" }}
          onClosePreview={() => setOpen(false)}
        />
      )}
    </>
  );
};
const root = document.getElementById("root");
if (!root) throw new Error("Missing test root");
createRoot(root).render(
  <RootErrorBoundary>
    <Provider store={store}>
      <StyleHandler>
        <Harness />
      </StyleHandler>
    </Provider>
  </RootErrorBoundary>,
);
