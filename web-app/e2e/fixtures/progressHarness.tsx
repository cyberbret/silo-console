// Copyright (c) 2026 Pigsty
// SPDX-License-Identifier: AGPL-3.0-or-later

import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { ProgressBar } from "mds";
import { store } from "../../src/store";
import StyleHandler from "../../src/StyleHandler";
import { saveSessionResponse } from "../../src/screens/Console/consoleSlice";
import { globalSetDistributedSetup } from "../../src/systemSlice";
import Speedtest from "../../src/screens/Console/Speedtest/Speedtest";
import ProgressBarWrapper from "../../src/screens/Console/Common/ProgressBarWrapper/ProgressBarWrapper";
import { EmptyState } from "../../src/common/ui/EmptyState";

store.dispatch(globalSetDistributedSetup(true));
store.dispatch(
  saveSessionResponse({ permissions: { "arn:aws:s3:::*": ["admin:*"] } }),
);
const params = new URLSearchParams(location.search);
const screen = params.get("screen");
createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <StyleHandler>
      <MemoryRouter>
        <main>
          {screen === "speedtest" ? (
            <Speedtest />
          ) : screen === "headings" ? (
            <>
              <h1>Page</h1>
              <EmptyState title="Page empty" headingLevel={2} />
              <h2>Section</h2>
              <EmptyState title="Section empty" />
              <h3>Subsection</h3>
              <EmptyState title="Subsection empty" headingLevel={4} />
            </>
          ) : (
            <>
              <h1>Progress</h1>
              <ProgressBar
                value={Number(params.get("value"))}
                maxValue={Number(params.get("max"))}
                variant={
                  params.has("indeterminate") ? "indeterminate" : "determinate"
                }
                notificationLabel="Transfer"
                progressLabel
              />
              <ProgressBarWrapper
                value={25}
                ready={false}
                cancelled
                notificationLabel="Cancelled transfer"
              />
            </>
          )}
        </main>
      </MemoryRouter>
    </StyleHandler>
  </Provider>,
);
