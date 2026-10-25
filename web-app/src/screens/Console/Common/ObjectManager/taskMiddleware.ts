// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { Middleware } from "@reduxjs/toolkit";
import type { AppState } from "store";
import { setErrorSnackMessage, setSnackBarMessage } from "systemSlice";
import { translate, formatText } from "i18n/lang";
import {
  cancelTransfer,
  removeTrace,
  resetTaskRuntime,
} from "../../ObjectBrowser/transferManager";
import {
  cleanList,
  deleteFromList,
  resetTasks,
} from "../../ObjectBrowser/objectBrowserSlice";
import { activeTask, taskStatus } from "./taskModel";

export const taskMiddleware: Middleware<{}, AppState> =
  ({ getState, dispatch }) =>
  (next) =>
  (action) => {
    if (
      action.type === "console/resetSession" ||
      action.type === "system/resetSystem"
    ) {
      resetTaskRuntime();
      dispatch(resetTasks());
    }
    const before = getState().objectBrowser.objectManager.objectsToManage;
    if (deleteFromList.match(action) || cleanList.match(action)) {
      before
        .filter(
          (item) =>
            !activeTask(item) &&
            (cleanList.match(action) || item.instanceID === action.payload),
        )
        .forEach((item) => {
          cancelTransfer(item.ID);
          removeTrace(item.ID);
        });
    }
    const result = next(action);
    if (action.type.startsWith("objectBrowser/")) {
      const state = getState();
      const language = state.system.language;
      for (const item of state.objectBrowser.objectManager.objectsToManage) {
        const previous = before.find(
          (old) => old.instanceID === item.instanceID,
        );
        if (
          !item.done ||
          !previous ||
          (previous.done && taskStatus(previous) === taskStatus(item))
        )
          continue;
        if (item.failed) {
          dispatch(
            setErrorSnackMessage({
              errorMessage: formatText(
                translate(language, "Task failed: {name}"),
                { name: item.prefix },
              ),
              detailedError:
                item.errorMessage ||
                translate(language, "Open Tasks to inspect the results."),
            }),
          );
        } else if (
          !item.cancelled &&
          !item.browserManaged &&
          // Completion is also visible in Tasks. Do not replace a current
          // advisory or error with a lower-priority success notification.
          !getState().system.snackBar.message
        ) {
          dispatch(
            setSnackBarMessage(
              formatText(translate(language, "Task completed: {name}"), {
                name: item.prefix,
              }),
            ),
          );
        }
      }
    }
    return result;
  };
