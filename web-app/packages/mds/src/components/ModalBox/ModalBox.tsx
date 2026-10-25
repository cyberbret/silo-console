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
  FC,
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useControlLabels } from "../../global/ControlLabels";
import styled from "styled-components";
import { ModalBoxProps } from "./ModalBox.types";
import { Elevated } from "../../global/SurfaceLevel";
import {
  ModalPresenceProvider,
  setOpenModalCount,
  useModalPresence,
} from "../../global/ModalState";
import { useDensity } from "../../global/Density";
import { type } from "../../global/typography";
import IconButton from "../IconButton/IconButton";
import AlertCloseIcon from "../Icons/AlertCloseIcon";
// A document-level stack makes sibling/nested portals dismiss only the topmost dialog.
const modalStack: HTMLElement[] = [];
const ParentPanel = createContext<React.RefObject<HTMLDivElement> | null>(null);
const panelParents = new WeakMap<HTMLElement, React.RefObject<HTMLDivElement> | null>();
const descendsFrom = (node: HTMLElement, ancestor: HTMLElement): boolean => {
  let parent = panelParents.get(node)?.current;
  while (parent) {
    if (parent === ancestor) return true;
    parent = panelParents.get(parent)?.current;
  }
  return false;
};
let originalOverflow: string | null = null;
// Preserve the legacy #close hook for the top dialog without duplicate IDs.
const syncCloseIds = () =>
  modalStack.forEach((dialog, index) => {
    const root = dialog.closest<HTMLElement>(".modalBoxMain");
    if (root) root.style.zIndex = String(1200 + index * 2);
    const button = dialog.querySelector<HTMLButtonElement>(".closeModalButton");
    if (button)
      button.id =
        index === modalStack.length - 1 &&
        !dialog.querySelector("#close:not(.closeModalButton)")
          ? "close"
          : `${dialog.getAttribute("aria-labelledby")}-close`;
  });
const focusable =
  'button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
const Root = styled.div<{
  $inline: boolean;
  $shown: boolean;
  $overlay: boolean;
  $width: number | string;
  $sx: ModalBoxProps["sx"];
  $iconColor: ModalBoxProps["iconColor"];
}>`
  ${type("body")}
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: ${({ $shown }) => ($shown ? "auto" : "none")};
  background: ${({ $overlay }) =>
    $overlay ? "rgb(0 0 0 / .4)" : "transparent"};
  opacity: ${({ $shown }) => ($shown ? 1 : 0)};
  transition: opacity
    ${({ $shown }) =>
      $shown
        ? "var(--dur-slow,240ms) var(--ease-slow,ease-out)"
        : "160ms var(--ease-exit,ease-in)"};
  .modalContainer {
    ${type("body")} box-sizing: border-box;
    width: calc(100% - 32px);
    max-width: ${({ $width }) =>
      typeof $width === "number" ? `${$width}px` : $width};
    max-height: calc(100dvh - 32px);
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    outline: none;
    transform: ${({ $shown }) => ($shown ? "scale(1)" : "scale(.97)")};
    transition: transform
      ${({ $shown }) =>
        $shown
          ? "var(--dur-slow,240ms) var(--ease-slow,ease-out)"
          : "160ms var(--ease-exit,ease-in)"};
  }
  .modalTitleBar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }
  .title {
    ${type("title")} margin: 0;
    color: var(--foreground);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .titleIcon {
    display: inline-flex;
    color: ${({ $iconColor }) =>
      $iconColor === "delete"
        ? "var(--destructive)"
        : $iconColor === "accept"
          ? "var(--success)"
          : "var(--foreground)"};
  }
  .titleIcon > svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
    flex-shrink: 0;
  }
  .closeModalButton {
    @media (pointer: coarse) { width: 40px; height: 40px; }
    margin: -6px -6px -6px 0;
  }
  .dialogContent {
    min-height: 0;
    overflow: auto;
    /* Keep the 2px outline plus 1px offset inside the scroll clip without
       moving content away from the panel's logical 24px padding. */
    margin: -3px;
    padding: 3px;
  }
  @media (max-width: 575px) {
    .modalContainer { width: calc(100% - 24px); max-height: calc(100dvh - 24px); padding: 16px; }
    .title { min-width: 0; overflow-wrap: anywhere; }
  }
  @media (prefers-reduced-motion: reduce) {
    .modalContainer {
      transform: none;
      transition: none;
    }
    transition-duration: var(--dur-fast, 80ms);
  }
  ${({ $inline }) => $inline && `
    position: relative; inset: auto; z-index: auto; background: transparent;
    opacity: 1; pointer-events: auto; display: block;
    .modalContainer { width: 100%; max-width: none; max-height: none; border-radius: 0; padding: 16px; transform: none; box-shadow: none; background: transparent; }
    .modalTitleBar { margin-bottom: 12px; }
    .dialogContent { overflow: visible; }
  `}
  ${({ $sx }) => $sx}
`;
const ModalBox: FC<ModalBoxProps> = ({
  onClose,
  inline,
  restoreFocusTo,
  open: requestedOpen,
  title,
  children,
  widthLimit = true,
  titleIcon,
  backgroundOverlay = true,
  customMaxWidth,
  sx,
  size = "lg",
  closeLabel,
  iconColor = "default",
}) => {
  const visible = useModalPresence();
  const open = requestedOpen && visible;
  const inlineNow = useRef(inline);
  inlineNow.current = inline;
  const returnTarget = useRef(restoreFocusTo);
  returnTarget.current = restoreFocusTo;
  const modalOpen = open && !inline;
  const anchor = useRef<HTMLSpanElement>(null);
  const movedFocus = useRef<HTMLElement | null>(null);
  const parentPanel = useContext(ParentPanel);
  const [host] = useState(() => inline === undefined ? null : document.createElement("div"));
  useLayoutEffect(() => {
    if (!host) return;
    (inline ? anchor.current : document.body)?.appendChild(host);
    if (movedFocus.current?.isConnected) movedFocus.current.focus({ preventScroll: true });
    movedFocus.current = null;
    return () => {
      movedFocus.current = document.activeElement instanceof HTMLElement && host.contains(document.activeElement) ? document.activeElement : null;
      host.remove();
    };
  }, [host, inline]);
  const labels = useControlLabels();
  const { compact } = useDensity();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (panel.current) panelParents.set(panel.current, parentPanel); });
  const close = useRef(onClose);
  close.current = onClose;
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useLayoutEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  useLayoutEffect(() => {
    if (root.current) root.current.inert = !open;
  }, [open, mounted]);
  useEffect(() => {
    if (!mounted) return;
    if (open) {
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const exit = setTimeout(() => setMounted(false), 160);
    return () => clearTimeout(exit);
  }, [open, mounted]);
  useEffect(() => {
    const node = panel.current;
    if (!modalOpen || !mounted || !node) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!modalStack.length) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    const descendant = modalStack.findIndex((entry) => descendsFrom(entry, node));
    modalStack.splice(descendant < 0 ? modalStack.length : descendant, 0, node);
    setOpenModalCount(modalStack.length);
    syncCloseIds();
    const inside = (element: Element | null): boolean => {
      if (!element) return false;
      if (node.contains(element)) return true;
      const popup = element.closest<HTMLElement>("[data-silo-popup]");
      const anchorId = popup?.dataset.popupAnchor;
      return !!anchorId && inside(document.getElementById(anchorId));
    };
    const controls = () =>
      Array.from(node.querySelectorAll<HTMLElement>(focusable)).filter(
        (element) => element.getClientRects().length > 0,
      );
    const key = (event: KeyboardEvent) => {
      if (modalStack.at(-1) !== node || event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
      if (event.key === "Tab") {
        // A nested popup owns its own roving focus until it closes.
        if (document.activeElement?.closest("[data-silo-popup]")) return;
        const items = controls();
        const first = items[0];
        const last = items.at(-1);
        if (!first) {
          event.preventDefault();
          node.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first || !inside(document.activeElement))
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !inside(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const focus = (event: FocusEvent) => {
      if (modalStack.at(-1) === node && !inside(event.target as Element))
        (controls()[0] || node).focus();
    };
    document.addEventListener("keydown", key);
    document.addEventListener("focusin", focus);
    if (modalStack.at(-1) === node && !inside(document.activeElement)) (
      node.querySelector<HTMLElement>("[autofocus]") ||
      controls().find(
        (element) =>
          !element.classList.contains("closeModalButton") &&
          !element.hasAttribute("data-field-help"),
      ) ||
      node
    ).focus();
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("focusin", focus);
      const wasTop = modalStack.at(-1) === node;
      const index = modalStack.indexOf(node);
      if (index >= 0) modalStack.splice(index, 1);
      setOpenModalCount(modalStack.length);
      const closeButton =
        node.querySelector<HTMLButtonElement>(".closeModalButton");
      if (closeButton)
        closeButton.id = `${node.getAttribute("aria-labelledby")}-close`;
      node.closest<HTMLElement>(".modalBoxMain")?.style.removeProperty("z-index");
      syncCloseIds();
      if (!modalStack.length && originalOverflow !== null) {
        document.body.style.overflow = originalOverflow;
        originalOverflow = null;
      }
      if (wasTop && !inlineNow.current) {
        const target = returnTarget.current?.() || previous;
        const remaining = modalStack.at(-1);
        if (
          target?.isConnected &&
          target.getClientRects().length > 0 &&
          (!remaining || remaining.contains(target))
        )
          target.focus();
        else if (remaining)
          (
            remaining.querySelector<HTMLElement>(focusable) || remaining
          ).focus();
      }
    };
  }, [modalOpen, mounted]);
  if (!mounted && !host) return null;
  const widths = compact
    ? { sm: 360, lg: 480, xl: 800 }
    : { sm: 400, lg: 540, xl: 880 };
  const content = createPortal(
    <ModalPresenceProvider open={open}>
      <Root
        ref={root}
        style={!open && host ? { display: "none" } : undefined}
        $inline={!!inline}
        aria-hidden={!open || undefined}
        className="modalBoxMain"
        $shown={shown}
        $iconColor={iconColor}
        $overlay={backgroundOverlay}
        $width={
          widthLimit ? customMaxWidth || widths[size] : "calc(100% - 32px)"
        }
        $sx={sx}
      >
        <Elevated
          ref={panel}
          offset={4}
          shadowLevel={5}
          className="modalContainer"
          role={inline ? "region" : "dialog"}
          aria-modal={inline ? undefined : true}
          aria-labelledby={id}
          tabIndex={-1}
        >
          <div className="modalTitleBar">
            <h2 id={id} className="title">
              {titleIcon && (
                <span className="titleIcon" aria-hidden="true">
                  {titleIcon}
                </span>
              )}
              {title}
            </h2>
            <IconButton
              id={`${id}-close`}
              className="closeModalButton"
              aria-label={closeLabel || labels.close}
              size="small"
              onClick={onClose}
            >
              <AlertCloseIcon />
            </IconButton>
          </div>
          <div className="dialogContent"><ParentPanel.Provider value={panel}>{children}</ParentPanel.Provider></div>
        </Elevated>
      </Root>
    </ModalPresenceProvider>,
    host || document.body,
  );
  return host ? <><span ref={anchor} style={{ display: "contents" }} />{content}</> : content;
};
export default ModalBox;
