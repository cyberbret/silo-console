// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import { createRoot } from "react-dom/client";
import { Provider, useSelector } from "react-redux";
import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Menu, useModalActive } from "mds";
import { store, AppState } from "../../src/store";
import { saveSessionResponse } from "../../src/screens/Console/consoleSlice";
import StyleHandler from "../../src/StyleHandler";
import {
  ResponsiveMenuProvider,
  useResponsiveMenu,
} from "../../src/screens/Console/Menu/ResponsiveMenu";
import PageHeaderWrapper from "../../src/screens/Console/Common/PageHeaderWrapper/PageHeaderWrapper";
import TaskCenterHost from "../../src/screens/Console/Common/ObjectManager/TaskCenterHost";
import BrowserBreadcrumbs from "../../src/screens/Console/ObjectBrowser/BrowserBreadcrumbs";
import TaskDepartureGuard from "../../src/screens/Console/Common/ObjectManager/TaskDepartureGuard";
import {
  setNewObject,
  completeObject,
} from "../../src/screens/Console/ObjectBrowser/objectBrowserSlice";
import { useOverlayPending } from "../../src/common/ui/overlayIntent";

store.dispatch(
  saveSessionResponse({
    permissions: { "arn:aws:s3:::*": ["s3:*", "admin:*"] },
  }),
);

function Controls() {
  const menu = useResponsiveMenu();
  const navigate = useNavigate();
  const location = useLocation();
  const active = useModalActive();
  const pending = useOverlayPending();
  const tasks = useSelector(
    (state: AppState) => state.objectBrowser.objectManager.objectsToManage,
  );
  return (
    <>
      <PageHeaderWrapper
        label="Buckets"
        primaryAction={{
          id: "create-primary",
          label: "Create bucket",
          onClick: () => {},
        }}
        secondaryActions={[
          {
            id: "denied",
            label: "Delete",
            disabled: true,
            disabledReason: "Permission required",
            onClick: () => {},
          },
        ]}
      />
      <TaskCenterHost />
      <button
        id="complete-task"
        onClick={() => store.dispatch(completeObject("held"))}
      >
        Complete task
      </button>
      <button id="open-menu" onClick={() => menu.setOpen(true)}>
        Open menu
      </button>
      <button
        id="start-task"
        onClick={() =>
          store.dispatch(
            setNewObject({
              ID: "held",
              instanceID: "held",
              type: "upload",
              bucketName: "b",
              prefix: "held",
              percentage: 0,
              done: false,
              failed: false,
              cancelled: false,
              waitingForFile: false,
              errorMessage: "",
            }),
          )
        }
      >
        Hold task
      </button>
      <output id="owners">
        {String(active)} / {String(pending)}
      </output>
      <output id="route">{location.pathname}</output>
      <output id="tasks">{tasks.length}</output>
      <Menu
        isOpen
        collapseAction={() => menu.setOpen(false)}
        mobileMode="auto"
        mobileOpen={menu.open}
        onMobileOpenChange={menu.setOpen}
        mobileLabel="Menu"
        currentPath={location.pathname}
        callPathAction={navigate}
        options={[
          { name: "Buckets", icon: <span />, path: "/buckets" },
          { name: "Users", icon: <span />, path: "/identity/users" },
        ]}
        signOutLabel="Sign Out"
        signOutAction={() => {
          menu.setOpen(false);
          navigate("/logout");
        }}
      />
      <BrowserBreadcrumbs
        bucketName="b"
        internalPaths={`docs//percent%2F/中 文?#/${"directory-".repeat(12)}/README.md`}
        hidePathButton
      />
      <TaskDepartureGuard />
    </>
  );
}
history.replaceState(null, "", "/buckets");
const router = createBrowserRouter([
  {
    path: "*",
    element: (
      <ResponsiveMenuProvider available>
        <Controls />
      </ResponsiveMenuProvider>
    ),
  },
]);
createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <StyleHandler>
      <RouterProvider router={router} />
    </StyleHandler>
  </Provider>,
);
