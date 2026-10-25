// This file is part of MinIO Design System
// Copyright (c) 2023 MinIO, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import React, {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { DropdownSelectorProps } from "./DropdownSelector.types";
import { useModalPresence } from "../../global/ModalState";

// Closed selectors do not need geometry, observers or popup styles on login.
// Once opened, retain the popup component so it can finish its exit transition.
const Popup = lazy(() => import("./DropdownSelectorPopup"));
function PendingPopup({
  open,
  anchorEl,
  hideTriggerAction,
}: DropdownSelectorProps) {
  useLayoutEffect(() => {
    if (!open || !anchorEl) return;
    const down = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
      if (event.key === "Tab") hideTriggerAction();
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        hideTriggerAction();
      }
    };
    anchorEl.addEventListener("keydown", down);
    anchorEl.addEventListener("keyup", up);
    return () => {
      anchorEl.removeEventListener("keydown", down);
      anchorEl.removeEventListener("keyup", up);
    };
  }, [open, anchorEl, hideTriggerAction]);
  return null;
}
export default function DropdownSelector(props: DropdownSelectorProps) {
  const visible = useModalPresence();
  const open = props.open && visible;
  const [opened, setOpened] = useState(open);
  useEffect(() => {
    if (open) setOpened(true);
  }, [open]);
  return open || opened ? (
    <Suspense fallback={<PendingPopup {...props} open={open} />}>
      <Popup {...props} open={open} />
    </Suspense>
  ) : null;
}
