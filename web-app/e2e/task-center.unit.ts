// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import { buildHarness as build } from "./fixtures/buildHarness";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import {
  createMutationQueue,
  MutationResult,
  retryableMutationFailure,
} from "../src/screens/Console/Common/ObjectManager/mutationQueue";
import {
  retrySubset,
  targetIdentity,
  TaskTarget,
} from "../src/screens/Console/Common/ObjectManager/taskModel";
import {
  captureTaskSession,
  registerTaskControl,
  resetTaskRuntime,
  storeUploadControl,
} from "../src/screens/Console/ObjectBrowser/transferManager";

const target = (key: string, extra: Partial<TaskTarget> = {}): TaskTarget => ({
  bucket: "bucket",
  key,
  status: "queued",
  ...extra,
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
test("one queue bounds independent tasks to four and preserves success after abort", async () => {
  const enqueue = createMutationQueue(4);
  const controller = new AbortController();
  const gates = Array.from({ length: 7 }, () => deferred<MutationResult>());
  const started: number[] = [];
  const jobs = gates.map((gate, index) =>
    enqueue(
      target(String(index)),
      controller.signal,
      () => {
        started.push(index);
      },
      () => gate.promise,
    ),
  );
  expect(started).toEqual([0, 1, 2, 3]);
  gates[0].resolve({ status: "done" });
  await expect.poll(() => started.length).toBe(5);
  controller.abort();
  expect(await jobs[5]).toEqual({ status: "cancelled", uncertain: false });
  expect(await jobs[6]).toEqual({ status: "cancelled", uncertain: false });
  for (let index = 1; index <= 4; index++)
    gates[index].resolve({ status: "done" });
  expect(
    (await Promise.all(jobs)).filter((result) => result.status === "done"),
  ).toHaveLength(5);
  expect(started).toEqual([0, 1, 2, 3, 4]);
});
test("overlapping parent/child and versions serialize without blocking other keys", async () => {
  const enqueue = createMutationQueue(4);
  const signal = new AbortController().signal;
  const parent = deferred<MutationResult>();
  const started: string[] = [];
  const first = enqueue(
    target("dir/", { recursive: true }),
    signal,
    () => started.push("parent"),
    () => parent.promise,
  );
  const second = enqueue(
    target("dir/a", { versionId: "null" }),
    signal,
    () => started.push("child"),
    async () => ({ status: "done" }),
  );
  const third = enqueue(
    target("other"),
    signal,
    () => started.push("other"),
    async () => ({ status: "done" }),
  );
  expect(started).toEqual(["parent", "other"]);
  parent.resolve({ status: "done" });
  await Promise.all([first, second, third]);
  expect(started).toEqual(["parent", "other", "child"]);
});
test("retry safety rejects ambiguous writes and opaque recursive subsets", () => {
  expect(retryableMutationFailure("delete", target("a"), 0, false)).toBe(false);
  expect(retryableMutationFailure("delete", target("a"), 500, false)).toBe(
    false,
  );
  expect(retryableMutationFailure("delete", target("a"), 403, false)).toBe(
    true,
  );
  expect(
    retryableMutationFailure(
      "delete",
      target("a", { versionId: "null" }),
      500,
      false,
    ),
  ).toBe(false);
  expect(
    retryableMutationFailure(
      "delete",
      target("a", { versionId: "null" }),
      403,
      true,
    ),
  ).toBe(false);
  expect(
    retryableMutationFailure(
      "delete",
      target("a/", { recursive: true }),
      403,
      false,
    ),
  ).toBe(false);
  expect(
    retryableMutationFailure(
      "delete",
      target("a", { nonCurrent: true }),
      403,
      false,
    ),
  ).toBe(false);
  expect(
    retryableMutationFailure(
      "restore",
      target("a", { versionId: "v1" }),
      403,
      false,
    ),
  ).toBe(false);
});

test("immutable versions may retry 5xx while a reusable null selector stays uncertain", () => {
  expect(
    retryableMutationFailure(
      "delete",
      target("a", { versionId: "v-immutable" }),
      500,
      false,
    ),
  ).toBe(true);
  const reusable = target("a", {
    versionId: "null",
    status: "failed",
    retryable: retryableMutationFailure(
      "delete",
      target("a", { versionId: "null" }),
      500,
      false,
    ),
    uncertain: true,
  });
  expect(retrySubset([reusable])).toEqual([]);
  expect(reusable.versionId).toBe("null");
});

test("a queued recursive parent keeps FIFO precedence over a later child restore", async () => {
  const enqueue = createMutationQueue(4);
  const signal = new AbortController().signal;
  const child = deferred<MutationResult>();
  const parent = deferred<MutationResult>();
  const order: string[] = [];
  const jobs = [
    enqueue(
      target("dir/a"),
      signal,
      () => order.push("delete child"),
      () => child.promise,
    ),
    enqueue(
      target("dir/", { recursive: true }),
      signal,
      () => order.push("delete parent"),
      () => parent.promise,
    ),
    enqueue(
      target("dir/b", { versionId: "restore-source" }),
      signal,
      () => order.push("restore child"),
      async () => ({ status: "done" }),
    ),
    enqueue(
      target("independent"),
      signal,
      () => order.push("independent"),
      async () => ({ status: "done" }),
    ),
  ];
  expect(order).toEqual(["delete child", "independent"]);
  child.resolve({ status: "done" });
  await expect
    .poll(() => order)
    .toEqual(["delete child", "independent", "delete parent"]);
  parent.resolve({ status: "done" });
  await Promise.all(jobs);
  expect(order).toEqual([
    "delete child",
    "independent",
    "delete parent",
    "restore child",
  ]);
});
test("session cleanup invalidates callbacks before aborting every owned control", () => {
  const current = captureTaskSession();
  const called: boolean[] = [];
  storeUploadControl("upload", {
    send: () => true,
    cancel: () => {
      called.push(current());
    },
  });
  registerTaskControl("delete", {
    cancel: () => {
      called.push(current());
    },
  });
  resetTaskRuntime();
  expect(called).toEqual([false, false]);
  expect(current()).toBe(false);
  expect(captureTaskSession()()).toBe(true);
});

test.describe("canonical task reducer", () => {
  test.describe.configure({ mode: "serial" });
  let slice: any;
  test.beforeAll(async () => {
    // Bundle the reducers and middleware just as the app does. No live Vite
    // SSR server is needed to exercise state transitions and notification order.
    const slicePath = fileURLToPath(
      new URL(
        "../src/screens/Console/ObjectBrowser/objectBrowserSlice.ts",
        import.meta.url,
      ),
    );
    const testEntry = fileURLToPath(
      new URL("./task-store-test.ts", import.meta.url),
    );
    const result = await build({
      configFile: false,
      logLevel: "silent",
      resolve: { tsconfigPaths: true },
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [
        {
          name: "task-store-test",
          resolveId: (id) => (id === testEntry ? testEntry : null),
          load: (id) =>
            id === testEntry
              ? `export * from ${JSON.stringify(slicePath)};
                 export { default } from ${JSON.stringify(slicePath)};
                 export { configureStore } from "@reduxjs/toolkit";
                 export { default as systemReducer, setSnackBarMessage } from "../src/systemSlice";
                 export { taskMiddleware } from "../src/screens/Console/Common/ObjectManager/taskMiddleware";`
              : null,
        },
      ],
      build: {
        write: false,
        lib: {
          entry: testEntry,
          name: "TaskSlice",
          formats: ["iife"],
        },
      },
    });
    const output = Array.isArray(result) ? result[0] : result;
    if (!("output" in output)) throw new Error("No reducer bundle");
    const script = output.output.find((entry) => entry.type === "chunk");
    if (!script || script.type !== "chunk") throw new Error("No reducer code");
    slice = runInNewContext(script.code + ";TaskSlice;", {
      console,
      window: { matchMedia: () => ({ matches: false }) },
      localStorage: { getItem: () => null },
    });
  });

  const entry = (targets?: TaskTarget[]) => ({
    ID: "request",
    instanceID: "task",
    bucketName: "bucket",
    prefix: "name",
    type: targets ? "delete" : "download",
    percentage: 0,
    done: false,
    failed: false,
    cancelled: false,
    waitingForFile: true,
    errorMessage: "",
    targets,
  });
  test("completion preserves active advice and errors, while failures and later ordinary completion remain observable", () => {
    const store = slice.configureStore({
      reducer: { objectBrowser: slice.default, system: slice.systemReducer },
      middleware: (defaults: any) => defaults().concat(slice.taskMiddleware),
    });
    const start = (id: string) =>
      store.dispatch(
        slice.setNewObject({
          ...entry(),
          ID: id,
          instanceID: id,
          prefix: `${id}.zip`,
          kind: "zip",
        }),
      );
    const advice =
      "For selections above 5 GiB or of unknown size, MCLI is recommended. This ZIP will stream without buffering in memory.";
    start("large");
    store.dispatch(slice.setSnackBarMessage(advice));
    store.dispatch(slice.completeObject("large"));
    expect(store.getState().system.snackBar.message).toBe(advice);
    expect(
      store.getState().objectBrowser.objectManager.objectsToManage[0],
    ).toMatchObject({ status: "done", done: true, percentage: 100 });

    start("broken");
    store.dispatch(
      slice.failObject({ instanceID: "broken", msg: "Access denied" }),
    );
    expect(store.getState().system.snackBar).toMatchObject({
      type: "error",
      message: "Task failed: broken.zip",
      detailedErrorMsg: "Access denied",
    });
    const error = store.getState().system.snackBar;
    start("parallel");
    store.dispatch(slice.completeObject("parallel"));
    expect(store.getState().system.snackBar).toEqual(error);

    // The existing snackbar's close/expiry action releases the slot.
    store.dispatch(slice.setSnackBarMessage(""));
    start("ordinary");
    store.dispatch(slice.completeObject("ordinary"));
    expect(store.getState().system.snackBar).toMatchObject({
      type: "message",
      message: "Task completed: ordinary.zip",
    });
  });
  test("safe retry preserves successful/cancelled identities and options, rejects stale attempts", () => {
    const targets = [
      target("a", { versionId: "null", bypass: true }),
      target("a", { versionId: "v2" }),
      target("b"),
    ];
    let state = slice.default(undefined, slice.setNewObject(entry(targets)));
    const update = (
      index: number,
      result: Partial<TaskTarget>,
      attempt = 1,
    ) => {
      state = slice.default(
        state,
        slice.updateTaskTarget({
          instanceID: "task",
          attempt,
          identity: targetIdentity(targets[index]),
          result,
          now: 10,
        }),
      );
    };
    update(0, { status: "failed", error: "denied", retryable: true });
    update(1, { status: "done" });
    update(2, { status: "cancelled", uncertain: true });
    expect(state.objectManager.objectsToManage[0].status).toBe("failed");
    expect(
      retrySubset(state.objectManager.objectsToManage[0].targets),
    ).toHaveLength(1);
    state = slice.default(
      state,
      slice.retryTask({ instanceID: "task", now: 20 }),
    );
    const retried = state.objectManager.objectsToManage[0];
    expect(retried.attempt).toBe(2);
    expect(retried.targets.map((item: TaskTarget) => item.status)).toEqual([
      "queued",
      "done",
      "cancelled",
    ]);
    expect(retried.targets[0]).toMatchObject({
      versionId: "null",
      bypass: true,
    });
    update(0, { status: "done" });
    expect(state.objectManager.objectsToManage[0].targets[0].status).toBe(
      "queued",
    );
    update(0, { status: "done" }, 2);
    expect(state.objectManager.objectsToManage[0].status).toBe("cancelled");
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
  test("mutation invalidation preserves Versions and refreshes only the currently matching object", () => {
    let state = slice.default(undefined, { type: "init" });
    state = {
      ...state,
      selectedBucket: "bucket",
      selectedInternalPaths: "dir/a",
      versionsMode: true,
      selectedVersion: "v1",
      loadingObjectInfo: false,
      loadingVersions: false,
    };
    state = slice.default(
      state,
      slice.invalidateMutationView({
        kind: "restore",
        targets: [target("dir/a", { versionId: "v0", status: "done" })],
      }),
    );
    expect(state).toMatchObject({
      versionsMode: true,
      selectedVersion: "v1",
      loadingObjectInfo: true,
      loadingVersions: true,
      objectMutationRevision: 1,
      reloadObjectsList: true,
    });
    state = {
      ...state,
      selectedInternalPaths: "dir/b",
      loadingObjectInfo: false,
      loadingVersions: false,
      reloadObjectsList: false,
    };
    state = slice.default(
      state,
      slice.invalidateMutationView({
        kind: "delete",
        targets: [target("dir/a", { versionId: "v1", status: "done" })],
      }),
    );
    expect(state).toMatchObject({
      versionsMode: true,
      selectedVersion: "v1",
      loadingObjectInfo: false,
      loadingVersions: false,
      objectMutationRevision: 1,
      reloadObjectsList: true,
    });
    state = slice.default(
      state,
      slice.invalidateMutationView({
        kind: "delete",
        targets: [target("dir/b", { versionId: "v1", status: "done" })],
      }),
    );
    expect(state).toMatchObject({
      versionsMode: true,
      selectedVersion: "",
      loadingObjectInfo: true,
      loadingVersions: true,
      objectMutationRevision: 2,
    });
    const unchanged = slice.default(
      state,
      slice.invalidateMutationView({
        kind: "delete",
        targets: [target("dir/b", { bucket: "elsewhere", status: "done" })],
      }),
    );
    expect(unchanged).toBe(state);
  });
  test("ambiguous null failure cannot increment an attempt or enter the retry queue", () => {
    const targets = [
      target("a", {
        versionId: "null",
        status: "failed",
        retryable: false,
        uncertain: true,
      }),
    ];
    let state = slice.default(
      undefined,
      slice.setNewObject({
        ...entry(targets),
        done: true,
        failed: true,
        status: "failed",
      }),
    );
    state = slice.default(
      state,
      slice.retryTask({ instanceID: "task", now: 20 }),
    );
    expect(state.objectManager.objectsToManage[0].attempt).toBe(1);
    expect(state.objectManager.objectsToManage[0].targets[0]).toMatchObject({
      versionId: "null",
      status: "failed",
      uncertain: true,
    });
  });
  test("terminal callbacks are ignored except native handoff late errors", () => {
    let state = slice.default(undefined, slice.setNewObject(entry()));
    state = slice.default(state, slice.cancelObjectInList("task"));
    state = slice.default(state, slice.completeObject("task"));
    state = slice.default(
      state,
      slice.updateProgress({ instanceID: "task", progress: 88 }),
    );
    state = slice.default(
      state,
      slice.failObject({ instanceID: "task", msg: "late" }),
    );
    expect(state.objectManager.objectsToManage[0]).toMatchObject({
      status: "cancelled",
      percentage: 0,
      failed: false,
    });
    state = slice.default(
      undefined,
      slice.setNewObject({ ...entry(), browserManaged: true }),
    );
    state = slice.default(state, slice.completeObject("task"));
    state = slice.default(
      state,
      slice.failObject({ instanceID: "task", msg: "late native error" }),
    );
    expect(state.objectManager.objectsToManage[0]).toMatchObject({
      status: "failed",
      errorMessage: "late native error",
    });
  });
  test("clear finished removes failure and cancellation while keeping active work", () => {
    let state = slice.default(undefined, slice.setNewObject(entry()));
    state = slice.default(
      state,
      slice.failObject({ instanceID: "task", msg: "failed" }),
    );
    state = slice.default(
      state,
      slice.setNewObject({ ...entry(), ID: "next", instanceID: "next" }),
    );
    state = slice.default(state, slice.cleanList());
    expect(
      state.objectManager.objectsToManage.map((item: any) => item.instanceID),
    ).toEqual(["next"]);
    state = slice.default(state, slice.resetTasks());
    expect(state.objectManager.objectsToManage).toEqual([]);
  });
});
