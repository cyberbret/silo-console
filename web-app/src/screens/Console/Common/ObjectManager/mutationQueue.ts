// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { targetConflicts, TaskTarget } from "./taskModel";

export type MutationResult = Pick<
  TaskTarget,
  "status" | "error" | "retryable" | "uncertain"
>;
interface Job {
  target: TaskTarget;
  signal: AbortSignal;
  start: () => void;
  perform: () => Promise<MutationResult>;
  finish: (result: MutationResult) => void;
  unlisten: () => void;
}

// One queue shared by all mutation tasks, not four workers per dialog. A
// recursive parent and its children (or versions of one key) never race.
export const createMutationQueue = (limit = 4) => {
  const pending: Job[] = [];
  const active = new Set<Job>();
  const pump = () => {
    for (let index = pending.length - 1; index >= 0; index--) {
      const job = pending[index];
      if (!job.signal.aborted) continue;
      pending.splice(index, 1);
      job.unlisten();
      job.finish({ status: "cancelled", uncertain: false });
    }
    for (let index = 0; index < pending.length && active.size < limit;) {
      const job = pending[index];
      if (job.signal.aborted) {
        pending.splice(index, 1);
        job.unlisten();
        job.finish({ status: "cancelled", uncertain: false });
      } else if (
        [...active].some((running) =>
          targetConflicts(running.target, job.target),
        ) ||
        pending
          .slice(0, index)
          .some((earlier) => targetConflicts(earlier.target, job.target))
      ) {
        index++;
      } else {
        pending.splice(index, 1);
        active.add(job);
        job.start();
        void job
          .perform()
          .catch((): MutationResult => ({ status: "failed", uncertain: true }))
          .then((result) => {
            // A response that succeeded after cancellation still succeeded. An
            // abort cannot roll back a server-side delete or copy.
            job.unlisten();
            active.delete(job);
            job.finish(result);
            pump();
          });
      }
    }
  };
  return (
    target: TaskTarget,
    signal: AbortSignal,
    start: () => void,
    perform: () => Promise<MutationResult>,
  ): Promise<MutationResult> =>
    new Promise((finish) => {
      const onAbort = () => pump();
      const job: Job = {
        target,
        signal,
        start,
        perform,
        finish,
        unlisten: () => signal.removeEventListener("abort", onAbort),
      };
      signal.addEventListener("abort", onAbort, { once: true });
      pending.push(job);
      pump();
    });
};

// Immutable version DELETE is idempotent; literal "null" is reusable. A
// latest-version DELETE/restore can
// create a new version even if the response was lost. Recursive operations
// expose no failed child subset. Only definite rejected individual requests
// may be retried in place; all uncertain writes require a fresh inspection.
export const retryableMutationFailure = (
  kind: "delete" | "restore",
  target: TaskTarget,
  status: number,
  aborted: boolean,
): boolean =>
  !aborted &&
  kind === "delete" &&
  !target.recursive &&
  !target.allVersions &&
  !target.nonCurrent &&
  ((status >= 400 && status < 500 && ![408, 401].includes(status)) ||
    (!!target.versionId && target.versionId !== "null" && status >= 500));
