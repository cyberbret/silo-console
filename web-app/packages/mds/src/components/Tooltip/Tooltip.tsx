// This file is part of MinIO Design System
// Copyright (c) 2022 MinIO, Inc.
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
  cloneElement,
  FC,
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { createPortal } from "react-dom";
import { Elevated } from "../../global/SurfaceLevel";
import { useModalPresence } from "../../global/ModalState";
import { type } from "../../global/typography";
import { TooltipProps } from "./Tooltip.types";
let warmUntil = 0;
const Wrapper = styled.span`
  display: inline-flex;
  position: relative;
  max-width: 100%;
`;
const Bubble = styled(Elevated)<{
  $shown: boolean;
  $side: string;
  $interactive: boolean;
}>`
  ${type("caption")}
  position: fixed;
  z-index: 10001;
  width: max-content;
  max-width: min(350px, calc(100vw - 16px));
  padding: 4px 8px;
  border-radius: 8px;
  pointer-events: ${({ $interactive }) => ($interactive ? "auto" : "none")};
  overflow-wrap: anywhere;
  // An invisible 8px bridge keeps the bubble reachable across its side offset.
  &::before {
    content: "";
    position: absolute;
    ${({ $side }) =>
      $side === "top"
        ? "left: 0; right: 0; top: 100%; height: 8px;"
        : $side === "bottom"
          ? "left: 0; right: 0; bottom: 100%; height: 8px;"
          : $side === "left"
            ? "top: 0; bottom: 0; left: 100%; width: 8px;"
            : "top: 0; bottom: 0; right: 100%; width: 8px;"}
  }
  opacity: ${({ $shown }) => ($shown ? 1 : 0)};
  transform: ${({ $shown, $side }) =>
    $shown
      ? "translate(0,0)"
      : $side === "top"
        ? "translateY(4px)"
        : $side === "bottom"
          ? "translateY(-4px)"
          : $side === "left"
            ? "translateX(4px)"
            : "translateX(-4px)"};
  transition:
    opacity
      ${({ $shown }) =>
        $shown
          ? "var(--dur-fast,80ms) var(--ease-fast,ease-out)"
          : "var(--dur-fast-exit,60ms) var(--ease-exit,ease-in)"},
    transform
      ${({ $shown }) =>
        $shown
          ? "var(--dur-fast,80ms) var(--ease-fast,ease-out)"
          : "var(--dur-fast-exit,60ms) var(--ease-exit,ease-in)"};
  @media (prefers-reduced-motion: reduce) {
    transform: none;
    transition-property: opacity;
  }
`;
const Tooltip: FC<TooltipProps> = ({
  children,
  tooltip,
  errorProps,
  placement = "bottom",
  wrapperProps,
}) => {
  const visible = useModalPresence();
  // Expanded controls own a popup; their trigger hint must not cover its items.
  const expanded = children.props["aria-expanded"] === true;
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    side: placement as string,
  });
  const hovered = useRef(false);
  const focused = useRef(false);
  const show = (immediate = false) => {
    if (expanded) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        setMounted(true);
        setOpen(true);
      },
      immediate || Date.now() < warmUntil ? 0 : 200,
    );
  };
  const hide = (force = false) => {
    if (!force && (hovered.current || focused.current)) return;
    clearTimeout(timer.current);
    if (open) warmUntil = Date.now() + 300;
    setOpen(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!visible || expanded) {
      clearTimeout(timer.current);
      hovered.current = false;
      focused.current = false;
      setOpen(false);
    }
  }, [visible, expanded]);
  useEffect(() => {
    if (!mounted) return;
    if (open) {
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const exit = setTimeout(() => setMounted(false), 60);
    return () => clearTimeout(exit);
  }, [open, mounted]);
  useLayoutEffect(() => {
    if (!mounted || expanded || !anchor.current || !bubble.current) return;
    let frame = 0;
    let previous: typeof position | undefined;
    const measure = () => {
      if (!anchor.current || !bubble.current) return;
      const a = anchor.current.getBoundingClientRect();
      const b = bubble.current.getBoundingClientRect();
      let side = placement;
      if (side === "top" && a.top < b.height + 16) side = "bottom";
      if (side === "bottom" && a.bottom + b.height + 16 > innerHeight)
        side = "top";
      if (side === "left" && a.left < b.width + 16) side = "right";
      if (side === "right" && a.right + b.width + 16 > innerWidth)
        side = "left";
      const left =
        side === "left"
          ? a.left - b.width - 8
          : side === "right"
            ? a.right + 8
            : a.left + (a.width - b.width) / 2;
      const top =
        side === "top"
          ? a.top - b.height - 8
          : side === "bottom"
            ? a.bottom + 8
            : a.top + (a.height - b.height) / 2;
      let positionedLeft = Math.max(
        8,
        Math.min(left, innerWidth - b.width - 8),
      );
      let positionedTop = Math.max(
        8,
        Math.min(top, innerHeight - b.height - 8),
      );
      // A transformed dialog establishes the fixed-position containing block.
      // Convert the viewport placement into that block's local coordinates;
      // ordinary main/navigation landmarks keep the viewport coordinates.
      const containingBlock = bubble.current.offsetParent;
      if (containingBlock instanceof HTMLElement) {
        const rect = containingBlock.getBoundingClientRect();
        const scaleX = rect.width / containingBlock.offsetWidth || 1;
        const scaleY = rect.height / containingBlock.offsetHeight || 1;
        positionedLeft =
          (positionedLeft - rect.left) / scaleX -
          containingBlock.clientLeft +
          containingBlock.scrollLeft;
        positionedTop =
          (positionedTop - rect.top) / scaleY -
          containingBlock.clientTop +
          containingBlock.scrollTop;
      }
      const next = {
        left: positionedLeft,
        top: positionedTop,
        side,
      };
      if (
        previous?.left !== next.left ||
        previous?.top !== next.top ||
        previous?.side !== next.side
      ) {
        previous = next;
        setPosition(next);
      }
      // An error, wrapping label or animated panel can move an anchor without
      // resizing it or scrolling. Follow that geometry only while painted.
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [mounted, expanded, placement, tooltip]);
  if (tooltip === "" || tooltip === undefined || tooltip === null)
    return errorProps ? cloneElement(children, errorProps) : children;
  const child =
    children.type === Fragment
      ? children
      : cloneElement(children, {
          ...errorProps,
          "aria-describedby": [children.props["aria-describedby"], id]
            .filter(Boolean)
            .join(" "),
        });
  return (
    <Wrapper
      ref={anchor}
      {...wrapperProps}
      onPointerEnter={(event) => {
        hovered.current = true;
        show();
        wrapperProps?.onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        hovered.current = false;
        hide();
        wrapperProps?.onPointerLeave?.(event);
      }}
      onFocus={(event) => {
        focused.current = true;
        show(true);
        wrapperProps?.onFocus?.(event);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focused.current = false;
          hide();
        }
        wrapperProps?.onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          hide(true);
          event.stopPropagation();
        }
        wrapperProps?.onKeyDown?.(event);
      }}
    >
      {child}
      <span id={id} hidden>
        {tooltip}
      </span>
      {mounted &&
        !expanded &&
        createPortal(
          <Bubble
            ref={bubble}
            onPointerEnter={() => {
              hovered.current = true;
              show(true);
            }}
            onPointerLeave={() => {
              hovered.current = false;
              hide();
            }}
            inverted
            offset={2}
            shadowLevel={3}
            aria-hidden={!visible || !open || undefined}
            role="tooltip"
            $shown={shown}
            $interactive={visible}
            $side={position.side}
            style={{ left: position.left, top: position.top }}
          >
            {tooltip}
          </Bubble>,
          anchor.current?.closest("dialog") ||
            anchor.current?.closest('[role="dialog"], [role="alertdialog"]') ||
            anchor.current?.closest(
              'main, nav, aside, [role="main"], [role="navigation"], [role="complementary"], [role="region"][aria-label], [role="region"][aria-labelledby], section[aria-label], section[aria-labelledby]',
            ) ||
            document.body,
        )}
    </Wrapper>
  );
};
export default Tooltip;
