// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, {
  CSSProperties,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import styled from "styled-components";
import { FluidHover } from "./fluidHover.controller";

const Highlight = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  border-radius: var(--radius-control, 8px);
  background: var(--hover, rgba(0, 0, 0, 0.04));
  opacity: 0;
  transition:
    transform var(--dur-fast, 80ms) var(--ease-fast, ease-out),
    opacity var(--dur-fast, 80ms) ease;
  &[data-selected="true"] {
    background: var(--active, rgba(0, 0, 0, 0.07));
  }
  &[data-visible="false"] {
    transition-duration: var(--dur-fast, 80ms), var(--dur-fast-exit, 60ms);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: opacity var(--dur-fast, 80ms) ease;
  }
`;

export function FluidHoverHighlight({
  hover,
  selected = false,
  className,
  style,
}: {
  hover: FluidHover;
  selected?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const state = useSyncExternalStore(
    hover.subscribe,
    hover.getSnapshot,
    hover.getSnapshot,
  )[selected ? "selected" : "hover"];
  const element = useRef<HTMLDivElement>(null);
  const session = useRef(-1);
  useLayoutEffect(() => {
    const node = element.current;
    if (!node || !state.rect) return;
    const target = `translate(${state.rect.left}px, ${state.rect.top}px)`;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const fresh = session.current !== state.session;
    session.current = state.session;
    const travel = !reduce && (state.travel || (fresh && !!state.from));
    const fade = state.visible
      ? "var(--dur-fast, 80ms)"
      : "var(--dur-fast-exit, 60ms)";
    node.style.transitionProperty = travel ? "transform, opacity" : "opacity";
    node.style.transitionDuration = travel
      ? `${selected ? "var(--dur-moderate, 160ms)" : "var(--dur-fast, 80ms)"}, ${fade}`
      : fade;
    node.style.transitionTimingFunction = travel
      ? `${selected ? "var(--ease-moderate, ease-out)" : "var(--ease-fast, ease-out)"}, ease`
      : "ease";
    node.style.transform = target;
    if (fresh && state.visible) {
      node.style.opacity = "0";
      if (state.from && !reduce)
        node.style.transform = `translate(${state.from.left}px, ${state.from.top}px)`;
      // Commit the entry position once, then let the compositor own the travel.
      node.getBoundingClientRect();
      node.style.transform = target;
    }
    node.style.opacity = state.visible ? "1" : "0";
  }, [state, selected]);
  if (!state.rect) return null;
  return (
    <Highlight
      ref={element}
      aria-hidden="true"
      data-fluid-highlight={selected ? "selected" : "hover"}
      data-selected={selected}
      data-visible={state.visible}
      className={className}
      style={{ width: state.rect.width, height: state.rect.height, ...style }}
    />
  );
}
