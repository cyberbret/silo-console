// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useLayoutEffect, useSyncExternalStore } from "react";

// Ownership begins when an overlay is requested, before its lazy content mounts.
type OverlayKind = "modal" | "command";
const owners = new Map<symbol, OverlayKind>();
const listeners = new Set<() => void>();
export function useOverlayIntent(open: boolean, kind: OverlayKind = "modal") {
  useLayoutEffect(() => {
    if (!open) return;
    const owner = Symbol();
    owners.set(owner, kind);
    listeners.forEach((notify) => notify());
    return () => {
      owners.delete(owner);
      listeners.forEach((notify) => notify());
    };
  }, [open, kind]);
}
export const useOverlayPending = (exclude?: OverlayKind) =>
  useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    () => [...owners.values()].some((kind) => kind !== exclude),
    () => false,
  );
