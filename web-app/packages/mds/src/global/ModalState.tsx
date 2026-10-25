// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, {
  createContext,
  ReactNode,
  useContext,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
const Presence = createContext(true);
export const useModalPresence = () => useContext(Presence);
// A retained business dialog may still have its last open props. The presence
// boundary closes its visual panel without rewriting those business props.
export const ModalPresenceProvider = ({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) => {
  const parent = useModalPresence();
  return (
    <Presence.Provider value={parent && open}>{children}</Presence.Provider>
  );
};
let count = 0;
const subscribers = new Set<() => void>();
export const setOpenModalCount = (next: number) => {
  if (next === count) return;
  count = next;
  subscribers.forEach((notify) => notify());
};
const subscribe = (notify: () => void) => {
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
  };
};
const nativeOwners = new Set<symbol>();
export const useNativeModal = (open: boolean) => {
  useLayoutEffect(() => {
    if (!open) return;
    const owner = Symbol();
    nativeOwners.add(owner);
    subscribers.forEach((notify) => notify());
    return () => { nativeOwners.delete(owner); subscribers.forEach((notify) => notify()); };
  }, [open]);
};
const snapshot = () => count > 0 || nativeOwners.size > 0;
// App shortcut providers can suspend themselves without MDS knowing about them.
export const useModalActive = () =>
  useSyncExternalStore(subscribe, snapshot, () => false);
