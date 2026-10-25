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

import React, { FC, useEffect, useRef, useState } from "react";
import { useControlLabels } from "../../global/ControlLabels";
import styled from "styled-components";
import { createPortal } from "react-dom";
import { SnackbarProps } from "./Snackbar.types";
import { useDensity } from "../../global/Density";
import { useModalPresence } from "../../global/ModalState";
import { type } from "../../global/typography";
import AlertCloseIcon from "../Icons/AlertCloseIcon";
const Notice = styled.div<{
  $compact: boolean;
  $inline: boolean;
  $shown: boolean;
  $condensed: boolean;
  $sx: SnackbarProps["sx"];
}>`
  ${({ $condensed, $compact }) =>
    type($condensed ? "caption" : "body", { compact: $compact })}
  position: ${({ $inline }) => ($inline ? "relative" : "fixed")};
  z-index: 10000;
  ${({ $inline }) => !$inline && "top: 16px; left: 50%; translate: -50% 0;"}
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  max-width: min(540px, calc(100vw - 32px));
  padding: ${({ $condensed }) => ($condensed ? "4px 12px" : "12px 16px")};
  border-radius: 8px;
  background: var(--foreground);
  color: var(--surface-1);
  box-shadow: var(--shadow-3);
  opacity: ${({ $shown }) => ($shown ? 1 : 0)};
  transform: ${({ $shown }) => ($shown ? "translateY(0)" : "translateY(-4px)")};
  transition:
    opacity
      ${({ $shown }) =>
        $shown
          ? "var(--dur-fast,80ms) var(--ease-fast,ease-out)"
          : "60ms var(--ease-exit,ease-in)"},
    transform
      ${({ $shown }) =>
        $shown
          ? "var(--dur-fast,80ms) var(--ease-fast,ease-out)"
          : "60ms var(--ease-exit,ease-in)"};
  button {
    display: flex;
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    flex-shrink: 0;
    padding: 6px;
  }
  button:hover {
    background: var(--tint);
  }
  button:focus-visible {
    outline: 2px solid var(--focus-ring);
  }
  svg {
    width: 12px;
    height: 12px;
    fill: currentColor;
  }
  @media (prefers-reduced-motion: reduce) {
    transform: none;
    transition-property: opacity;
  }
  ${({ $sx }) => $sx}
`;
const Snackbar: FC<SnackbarProps> = ({
  autoHideDuration = 5,
  message = "",
  open: requestedOpen,
  onClose,
  variant = "default",
  condensed = false,
  closeButton,
  sx,
  mode = "portal",
}) => {
  const visible = useModalPresence();
  const open = requestedOpen && visible;
  const { compact } = useDensity();
  const labels = useControlLabels();
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  useEffect(() => {
    if (open && mounted) {
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const exit = setTimeout(() => setMounted(false), 60);
    return () => clearTimeout(exit);
  }, [open, mounted]);
  useEffect(() => {
    if (!open || paused || autoHideDuration <= 0) return;
    const timer = setTimeout(() => close.current(), autoHideDuration * 1000);
    return () => clearTimeout(timer);
  }, [open, paused, autoHideDuration]);
  if (!mounted || !message) return null;
  const notice = (
    <Notice
      $compact={compact}
      aria-hidden={!open || undefined}
      style={{ pointerEvents: open ? undefined : "none" }}
      $condensed={condensed}
      $inline={mode === "inline"}
      $shown={shown}
      $sx={sx}
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span>{message}</span>
      {closeButton && (
        <button
          type="button"
          disabled={!open}
          aria-label={labels.close}
          onClick={onClose}
        >
          <AlertCloseIcon />
        </button>
      )}
    </Notice>
  );
  return mode === "portal" ? createPortal(notice, document.body) : notice;
};
export default Snackbar;
