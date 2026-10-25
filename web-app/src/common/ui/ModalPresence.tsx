// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useOverlayIntent } from "./overlayIntent";
import { ModalPresenceProvider } from "mds";
import React, {
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
// Business dialogs stay lazy: mount only after first opening, retain the closed
// child for its 160ms exit, then release its fetching/form effects completely.
export const ModalPresence = ({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) => {
  useOverlayIntent(open);
  const [present, setPresent] = useState(open);
  const [lifecycle, setLifecycle] = useState({ open, generation: 0 });
  // Reset canceled local form state before children commit on a new opening.
  // The closing generation remains painted until its exit completes.
  let generation = lifecycle.generation;
  if (open !== lifecycle.open) {
    if (open) generation += 1;
    setLifecycle({ open, generation });
  }
  const lastChild = useRef<ReactNode>(open ? children : null);
  useLayoutEffect(() => {
    if (open) lastChild.current = children;
  }, [open, children]);
  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    const timer = setTimeout(() => {
      setPresent(false);
      lastChild.current = null;
    }, 200);
    return () => clearTimeout(timer);
  }, [open]);
  // Keep captured nullable payloads valid until the visual exit has finished.
  // Ordinary boolean callers still pass their current closed props.
  const content = children || lastChild.current;
  return open || present ? (
    <ModalPresenceProvider key={generation} open={open}>
      {content}
    </ModalPresenceProvider>
  ) : null;
};
