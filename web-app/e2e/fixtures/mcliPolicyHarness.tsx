// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { ThemeHandler } from "mds";
import { lightTheme } from "../../packages/mds/src/global/themes";
import { store } from "../../src/store";
import SetPolicy from "../../src/screens/Console/Policies/SetPolicy";
import { setSelectedPolicies } from "../../src/screens/Console/Users/AddUsersSlice";

// Deliberately carry selection from a prior form into the dialog.
store.dispatch(setSelectedPolicies(["writeonly"]));

function Harness() {
  const [groups, setGroups] = useState(["t19-group-a"]);
  const [open, setOpen] = useState(true);
  return (
    <Provider store={store}>
      <ThemeHandler customTheme={lightTheme}>
        <div style={{ position: "fixed", zIndex: 2000, top: 0 }}>
          <button onClick={() => setGroups(["t19-group-a"])}>Group A</button>
          <button onClick={() => setGroups(["t19-group-b"])}>Group B</button>
          <button onClick={() => setGroups(["t19-group-a", "t19-group-b"])}>
            Both groups
          </button>
          <button onClick={() => setOpen(true)}>Reopen</button>
        </div>
        <SetPolicy
          selectedGroups={groups}
          selectedUser={null}
          open={open}
          closeModalAndRefresh={() => setOpen(false)}
        />
      </ThemeHandler>
    </Provider>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
