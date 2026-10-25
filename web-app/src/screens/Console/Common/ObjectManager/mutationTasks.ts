// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { api } from "api";
import { store } from "store";
import {
  setNewObject,
  openList,
  retryTask,
  invalidateMutationView,
  updateTaskTarget,
} from "../../ObjectBrowser/objectBrowserSlice";
import {
  captureTaskSession,
  makeid,
  registerTaskControl,
  removeTrace,
} from "../../ObjectBrowser/transferManager";
import {
  createMutationQueue,
  MutationResult,
  retryableMutationFailure,
} from "./mutationQueue";
import { targetIdentity, TaskTarget } from "./taskModel";
import { translate } from "i18n/lang";

const enqueue = createMutationQueue(4);
const messageOf = async (error: unknown): Promise<string> => {
  const source = error as {
    error?: { detailedMessage?: string; message?: string };
    message?: string;
  };
  let message =
    source?.error?.detailedMessage || source?.error?.message || source?.message;
  // Generated void responses do not parse an error body. Read only a bounded
  // prefix, canceling the reader instead of buffering an arbitrary proxy page.
  if (!message && error instanceof Response && error.body) {
    const reader = error.body.getReader();
    let text = "";
    try {
      const decoder = new TextDecoder();
      while (text.length < 2048) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value.subarray(0, 2048), { stream: true });
      }
      try {
        const json = JSON.parse(text);
        message = json.detailedMessage || json.message;
      } catch {
        message = text;
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
  }
  return String(
    message ||
      translate(
        store.getState().system.language,
        "The request failed. Inspect the object before trying again.",
      ),
  ).slice(0, 500);
};

const runAttempt = (instanceID: string) => {
  const item = store
    .getState()
    .objectBrowser.objectManager.objectsToManage.find(
      (task) => task.instanceID === instanceID,
    );
  if (!item?.targets || item.done || !["delete", "restore"].includes(item.type))
    return;
  const kind = item.type as "delete" | "restore";
  const attempt = item.attempt ?? 1;
  const current = captureTaskSession();
  const controller = new AbortController();
  registerTaskControl(item.ID, { cancel: () => controller.abort() });
  const update = (target: TaskTarget, result: MutationResult) => {
    if (current())
      store.dispatch(
        updateTaskTarget({
          instanceID,
          attempt,
          identity: targetIdentity(target),
          result,
          now: Date.now(),
        }),
      );
  };
  const requests = item.targets
    .filter((target) => target.status === "queued")
    .map((target) =>
      enqueue(
        target,
        controller.signal,
        () => update(target, { status: "running" }),
        async () => {
          try {
            if (kind === "restore") {
              if (!target.versionId) throw new Error("Missing restore version");
              await api.buckets.putObjectRestore(
                target.bucket,
                { prefix: target.key, version_id: target.versionId },
                { signal: controller.signal },
              );
            } else {
              await api.buckets.deleteObject(
                target.bucket,
                {
                  prefix: target.key,
                  version_id: target.versionId,
                  recursive: target.recursive,
                  all_versions: target.allVersions,
                  non_current_versions: target.nonCurrent,
                  bypass: target.bypass,
                },
                { signal: controller.signal },
              );
            }
            return { status: "done" };
          } catch (error) {
            const status = error instanceof Response ? error.status : 0;
            const aborted = controller.signal.aborted;
            const retryable = retryableMutationFailure(
              kind,
              target,
              status,
              aborted,
            );
            return {
              status: aborted ? "cancelled" : "failed",
              retryable,
              uncertain:
                aborted ||
                (!retryable &&
                  (status === 0 || status === 408 || status >= 500)),
              error: await messageOf(error),
            };
          }
        },
      ).then((result) => update(target, result)),
    );
  void Promise.all(requests).then(() => {
    removeTrace(item.ID);
    if (!current()) return;
    const finished = store
      .getState()
      .objectBrowser.objectManager.objectsToManage.find(
        (task) => task.instanceID === instanceID,
      );
    if (finished?.targets) {
      store.dispatch(
        invalidateMutationView({ kind, targets: finished.targets }),
      );
    }
  });
};

export const startMutationTask = (
  kind: "delete" | "restore",
  targets: Omit<TaskTarget, "status">[],
  title: string,
) => {
  if (!targets.length) return;
  const ID = makeid(16);
  const instanceID = `task-${ID}`;
  const unique = [
    ...new Map(
      targets.map((target) => {
        const captured = { ...target, status: "queued" as const };
        return [targetIdentity(captured), captured];
      }),
    ).values(),
  ];
  const first = unique[0];
  store.dispatch(
    setNewObject({
      ID,
      instanceID,
      type: kind,
      kind,
      bucketName: first.bucket,
      prefix: title,
      openPrefix: first.key.slice(0, first.key.lastIndexOf("/") + 1),
      targets: unique,
      percentage: 0,
      waitingForFile: false,
      done: false,
      failed: false,
      cancelled: false,
      errorMessage: "",
    }),
  );
  store.dispatch(openList());
  runAttempt(instanceID);
};

export const retryFailedTask = (instanceID: string) => {
  const before = store
    .getState()
    .objectBrowser.objectManager.objectsToManage.find(
      (task) => task.instanceID === instanceID,
    )?.attempt;
  store.dispatch(retryTask({ instanceID, now: Date.now() }));
  const after = store
    .getState()
    .objectBrowser.objectManager.objectsToManage.find(
      (task) => task.instanceID === instanceID,
    )?.attempt;
  if (after !== before) runAttempt(instanceID);
};
