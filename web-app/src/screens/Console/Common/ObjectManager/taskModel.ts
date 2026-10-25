// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { IFileItem } from "../../ObjectBrowser/types";

export type TaskStatus = "queued" | "running" | "done" | "failed" | "cancelled";
export type TaskKind = "upload" | "download" | "zip" | "delete" | "restore";

// A target is a selected API operation, not a claim about unseen children in
// a recursive/non-current deletion. Literal version "null" remains explicit.
export interface TaskTarget {
  bucket: string;
  key: string;
  versionId?: string;
  recursive?: boolean;
  allVersions?: boolean;
  nonCurrent?: boolean;
  bypass?: boolean;
  status: TaskStatus;
  error?: string;
  retryable?: boolean;
  uncertain?: boolean;
}

export const taskStatus = (item: IFileItem): TaskStatus =>
  item.status ??
  (item.cancelled
    ? "cancelled"
    : item.failed
      ? "failed"
      : item.done
        ? "done"
        : "queued");

export const activeTask = (item: IFileItem): boolean =>
  taskStatus(item) === "queued" || taskStatus(item) === "running";

export const targetIdentity = (target: TaskTarget): string =>
  JSON.stringify([
    target.bucket,
    target.key,
    target.versionId ?? null,
    !!target.recursive,
    !!target.allVersions,
    !!target.nonCurrent,
    !!target.bypass,
  ]);

export const retrySubset = (targets: readonly TaskTarget[]): TaskTarget[] =>
  targets.filter(
    (target) =>
      target.status === "failed" && target.retryable && !target.uncertain,
  );

export const taskCounts = (item: IFileItem) => {
  const targets = item.targets ?? [];
  return {
    total: targets.length,
    done: targets.filter((target) => target.status === "done").length,
    failed: targets.filter((target) => target.status === "failed").length,
    cancelled: targets.filter((target) => target.status === "cancelled").length,
    processed: targets.filter(
      (target) => !["queued", "running"].includes(target.status),
    ).length,
  };
};

export const syncTargetProgress = (item: IFileItem, now: number): void => {
  const counts = taskCounts(item);
  item.percentage = counts.total
    ? Math.floor((100 * counts.processed) / counts.total)
    : 0;
  item.done = counts.total > 0 && counts.processed === counts.total;
  item.waitingForFile = false;
  if (item.done) {
    item.failed = counts.failed > 0;
    item.cancelled = counts.cancelled > 0;
    item.status = item.failed
      ? "failed"
      : item.cancelled
        ? "cancelled"
        : "done";
    item.finishedAt = now;
  } else {
    item.status = item.targets?.some((target) => target.status === "running")
      ? "running"
      : "queued";
  }
};

export const targetConflicts = (a: TaskTarget, b: TaskTarget): boolean =>
  a.bucket === b.bucket &&
  (a.key === b.key ||
    (!!a.recursive && b.key.startsWith(a.key)) ||
    (!!b.recursive && a.key.startsWith(b.key)));

export const taskFolder = (item: IFileItem): string => {
  if (item.openPrefix !== undefined) return item.openPrefix;
  return item.prefix.endsWith("/")
    ? item.prefix
    : item.prefix.slice(0, item.prefix.lastIndexOf("/") + 1);
};
