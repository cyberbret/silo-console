// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export interface FluidRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
export type FluidAxis = "x" | "y" | "xy";

/** Containment wins; otherwise choose the nearest center. Ties keep the first. */
export function pickIndex(
  point: { x: number; y: number },
  rects: readonly (FluidRect | undefined)[],
  axis: FluidAxis = "y",
): number | null {
  let picked: number | null = null;
  let distance = Infinity;
  for (let index = 0; index < rects.length; index++) {
    const rect = rects[index];
    if (!rect || rect.width <= 0 || rect.height <= 0) continue;
    const inX = point.x >= rect.left && point.x <= rect.left + rect.width;
    const inY = point.y >= rect.top && point.y <= rect.top + rect.height;
    if ((axis === "y" || inX) && (axis === "x" || inY)) return index;
    const dx = point.x - rect.left - rect.width / 2;
    const dy = point.y - rect.top - rect.height / 2;
    const next =
      axis === "x"
        ? Math.abs(dx)
        : axis === "y"
          ? Math.abs(dy)
          : Math.hypot(dx, dy);
    if (next < distance) {
      picked = index;
      distance = next;
    }
  }
  return picked;
}

export const sameRect = (a: FluidRect | null, b: FluidRect | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height);

export interface HighlightState {
  key: string | null;
  rect: FluidRect | null;
  visible: boolean;
  session: number;
  travel: boolean;
  from: FluidRect | null;
}
export const emptyHighlight: HighlightState = {
  key: null,
  rect: null,
  visible: false,
  session: 0,
  travel: false,
  from: null,
};
export type HighlightAction =
  | { type: "hide" }
  | {
      type: "target";
      key: string;
      rect: FluidRect;
      fresh?: boolean;
      from?: FluidRect | null;
    };

/** Reflow of the same item snaps. A new pointer session never travels from stale geometry. */
export function highlightReducer(
  state: HighlightState,
  action: HighlightAction,
): HighlightState {
  if (action.type === "hide")
    return state.visible ? { ...state, visible: false } : state;
  if (action.rect.width <= 0 || action.rect.height <= 0) return state;
  if (
    !action.fresh &&
    state.visible &&
    state.key === action.key &&
    sameRect(state.rect, action.rect)
  )
    return state;
  return {
    key: action.key,
    rect: action.rect,
    visible: true,
    session: state.session + (action.fresh ? 1 : 0),
    travel: !action.fresh && state.visible && state.key !== action.key,
    from: action.fresh ? (action.from ?? null) : null,
  };
}
