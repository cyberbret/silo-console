// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { Suspense, useEffect, useRef } from "react";
import { useBlocker, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { AppState, useAppDispatch } from "store";
import { useT } from "i18n";
import { ModalPresence } from "common/ui/ModalPresence";
import { resetSystem } from "systemSlice";
import { resetSession } from "../../consoleSlice";
import { closeList, resetTasks } from "../../ObjectBrowser/objectBrowserSlice";
import {
  captureTaskSession,
  resetTaskRuntime,
} from "../../ObjectBrowser/transferManager";
import { activeTask } from "./taskModel";

const authRoute = (
  pathname: string,
  routes = "logout|login|sso|oauth_callback",
) => {
  try {
    return new RegExp(`^/(${routes})/*$`, "i").test(
      decodeURIComponent(pathname),
    );
  } catch {
    return false;
  }
};

const ConfirmDialog = React.lazy(() => import("../ModalWrapper/ConfirmDialog"));

// Mounted inside the public wildcard host, before any destination component
// can mount. useBlocker owns push/replace/POP restoration through supported
// router APIs; cancel/reset leaves both the location and its effects intact.
const TaskDepartureGuard = () => {
  const dispatch = useAppDispatch();
  const t = useT();
  const location = useLocation();
  const tasks = useSelector(
    (state: AppState) => state.objectBrowser.objectManager.objectsToManage,
  );
  const anonymous = useSelector(
    (state: AppState) => state.system.anonymousMode,
  );
  const hasActive = tasks.some(activeTask);
  const uploads = tasks.some(
    (task) => task.type === "upload" && activeTask(task),
  );
  const pendingSessionExit = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    // useBlocker's callback provides basename-relative locations; its
    // returned blocked location still includes the basename. Classify here.
    pendingSessionExit.current = authRoute(nextLocation.pathname);
    return (
      hasActive &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search ||
        currentLocation.hash !== nextLocation.hash)
    );
  });
  const endsSession = blocker.state === "blocked" && pendingSessionExit.current;

  useEffect(() => {
    if (!uploads) return;
    const current = captureTaskSession();
    const leave = (event: BeforeUnloadEvent) => {
      if (!current()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [uploads]);

  useEffect(() => {
    // Anonymous Login uses the same route decision, before resetting its
    // session. No account transition happens when the blocker is cancelled.
    if (authRoute(location.pathname, "login") && anonymous) {
      dispatch(resetSession());
      dispatch(resetSystem());
    }
  }, [location.pathname, anonymous, dispatch]);

  return (
    <ModalPresence open={blocker.state === "blocked"}>
      {blocker.state === "blocked" && (
        <Suspense fallback={null}>
          <ConfirmDialog
            isOpen
            title={t("Tasks are still running")}
            cancelText={t("Stay here")}
            confirmText={
              endsSession ? t("Cancel tasks and leave") : t("Leave page")
            }
            destructive={endsSession}
            onClose={() => blocker.reset()}
            onConfirm={() => {
              if (endsSession) {
                resetTaskRuntime();
                dispatch(resetTasks());
              }
              dispatch(closeList());
              blocker.proceed();
            }}
            confirmationContent={
              endsSession
                ? t(
                    "Leaving this session cancels queued and running tasks. Changes already completed on the server remain in place.",
                  )
                : t(
                    "Tasks will continue in this session. You can check their progress in Tasks on another page.",
                  )
            }
          />
        </Suspense>
      )}
    </ModalPresence>
  );
};
export default TaskDepartureGuard;
