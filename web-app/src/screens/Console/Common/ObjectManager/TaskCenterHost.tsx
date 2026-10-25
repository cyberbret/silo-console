// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { Suspense } from "react";
import { useSelector } from "react-redux";
import { AppState } from "store";
import { ModalPresence } from "common/ui/ModalPresence";
const ObjectManager = React.lazy(() => import("./ObjectManager"));
const TaskCenterHost = () => {
  const open = useSelector(
    (state: AppState) => state.objectBrowser.objectManager.managerOpen,
  );
  return (
    <ModalPresence open={open}>
      {open && (
        <Suspense fallback={null}>
          <ObjectManager />
        </Suspense>
      )}
    </ModalPresence>
  );
};
export default TaskCenterHost;
