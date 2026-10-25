// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { Suspense, useSyncExternalStore } from "react";
import { ModalPresence } from "./ModalPresence";
let open = false;
const listeners = new Set<() => void>();
export const openShortcutHelp = () => {
  open = true;
  listeners.forEach((notify) => notify());
};
const close = () => {
  open = false;
  listeners.forEach((notify) => notify());
};
const Dialog = React.lazy(() => import("./ShortcutHelpDialog"));
export function ShortcutHelpHost() {
  const visible = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    () => open,
    () => false,
  );
  return (
    <ModalPresence open={visible}>
      {visible && (
        <Suspense fallback={null}>
          <Dialog onClose={close} />
        </Suspense>
      )}
    </ModalPresence>
  );
}
