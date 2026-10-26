// Copyright (c) 2026 PGSTY
// SPDX-License-Identifier: AGPL-3.0-or-later

import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { ThemeHandler } from "mds";
import { lightTheme } from "../../packages/mds/src/global/themes";
import { store } from "../../src/store";
import { saveSessionResponse } from "../../src/screens/Console/consoleSlice";
import GroupsDetails from "../../src/screens/Console/Groups/GroupsDetails";
import MainError from "../../src/screens/Console/Common/MainError/MainError";

store.dispatch(
  saveSessionResponse({
    accountAccessKey: "group-test-admin",
    permissions: { "console-ui": ["admin:*"] },
    features: [],
  }),
);

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <ThemeHandler customTheme={lightTheme}>
      <BrowserRouter>
        <MainError />
        <nav>
          <Link to="/identity/groups/group-a">Group A</Link>
          <Link to="/identity/groups/group-b">Group B</Link>
        </nav>
        <Routes>
          <Route
            path="/identity/groups/:groupName"
            element={<GroupsDetails />}
          />
        </Routes>
      </BrowserRouter>
    </ThemeHandler>
  </Provider>,
);
