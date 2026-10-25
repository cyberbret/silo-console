// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import {
  emptyHighlight,
  FluidAxis,
  FluidRect,
  HighlightAction,
  highlightReducer,
  pickIndex,
} from "./fluidHover.logic";

export interface FluidHoverOptions {
  axis?: FluidAxis;
  gapClick?: boolean | { maxDistance: number };
  from?: number;
  selectedSelector?: string;
  frozen?: () => boolean;
  disabled?: boolean;
  onActiveChange?: (index: number | null) => void;
}
const itemSelector = "[data-fluid-index]";
const controls =
  "input,textarea,select,button,a[href],summary,[contenteditable],[role=button],[role=option],[role=menuitem],[role=menuitemcheckbox],[role=tab],[data-fluid-activator]";
const disabled = (element: HTMLElement) =>
  element.matches(":disabled,[aria-disabled=true]");

/** A list-local store: only its highlight subscribes. Pointer events do not render rows. */
export function createFluidHover() {
  let root: HTMLElement | null = null;
  let options: FluidHoverOptions = {};
  let snapshot = { hover: emptyHighlight, selected: emptyHighlight };
  const listeners = new Set<() => void>();
  let items: HTMLElement[] = [];
  let rects: (FluidRect | undefined)[] = [];
  let observer: ResizeObserver | undefined;
  let mutation: MutationObserver | undefined;
  let frame = 0;
  let needsMeasurement = false;
  let fresh = false;
  let point: { x: number; y: number } | null = null;
  let active: HTMLElement | undefined;
  let activeKey: string | undefined;
  let previous: HTMLElement | undefined;

  const publish = (channel: "hover" | "selected", action: HighlightAction) => {
    const next = highlightReducer(snapshot[channel], action);
    if (next === snapshot[channel]) return;
    snapshot = { ...snapshot, [channel]: next };
    listeners.forEach((listener) => listener());
  };
  const mark = (index: number | null) => {
    const next = index === null ? undefined : items[index];
    const before = index === null ? undefined : items[index - 1];
    if (previous !== before) {
      previous?.removeAttribute("data-fluid-before");
      previous = before;
      previous?.setAttribute("data-fluid-before", "true");
    }
    root?.toggleAttribute("data-fluid-first", index === 0);
    if (active !== next) {
      active?.removeAttribute("data-fluid-hover");
      active = next;
      activeKey = next?.dataset.fluidKey;
      active?.setAttribute("data-fluid-hover", "true");
      options.onActiveChange?.(index);
    }
  };
  const setActiveIndex = (index: number | null, entry = false) => {
    const element = index === null ? undefined : items[index];
    const rect = index === null ? undefined : rects[index];
    if (!element || !rect || disabled(element) || options.disabled) {
      mark(null);
      publish("hover", { type: "hide" });
      return;
    }
    mark(index);
    publish("hover", {
      type: "target",
      key: element.dataset.fluidKey || String(index),
      rect,
      fresh: entry,
      from: options.from === undefined ? undefined : rects[options.from],
    });
  };
  const localPoint = (x: number, y: number) => {
    const bounds = root!.getBoundingClientRect();
    const sx = bounds.width / root!.offsetWidth || 1;
    const sy = bounds.height / root!.offsetHeight || 1;
    return {
      x: (x - bounds.left) / sx + root!.scrollLeft - root!.clientLeft,
      y: (y - bounds.top) / sy + root!.scrollTop - root!.clientTop,
    };
  };
  const pick = () => {
    if (!point || options.frozen?.()) return;
    setActiveIndex(
      pickIndex(localPoint(point.x, point.y), rects, options.axis),
      fresh,
    );
    fresh = false;
  };
  const measure = (attempt = 0) => {
    if (!root) return;
    const nextItems = Array.from(
      root.querySelectorAll<HTMLElement>(itemSelector),
    ).filter((item) => item.closest("[data-fluid-container]") === root);
    if (
      items.length !== nextItems.length ||
      items.some((item, index) => item !== nextItems[index])
    ) {
      observer?.disconnect();
      observer?.observe(root);
      nextItems.forEach((item) => observer?.observe(item));
    }
    const next = nextItems.map((item) => {
      if (disabled(item) || !item.offsetWidth || !item.offsetHeight)
        return undefined;
      const bounds = item.getBoundingClientRect();
      const origin = localPoint(bounds.left, bounds.top);
      return {
        left: origin.x,
        top: origin.y,
        width: item.offsetWidth,
        height: item.offsetHeight,
      };
    });
    if (nextItems.length && !next.some(Boolean) && attempt < 2) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure(attempt + 1);
      });
      return;
    }
    items = nextItems;
    rects = next;
    const selected = items.findIndex((item) =>
      item.matches(options.selectedSelector || "[data-fluid-selected=true]"),
    );
    if (selected >= 0 && rects[selected])
      publish("selected", {
        type: "target",
        key: items[selected].dataset.fluidKey || String(selected),
        rect: rects[selected]!,
      });
    else publish("selected", { type: "hide" });
    // An unmounted virtual row must not hand its highlight to a recycled index.
    if (
      active &&
      (!items.includes(active) ||
        !rects[items.indexOf(active)] ||
        active.dataset.fluidKey !== activeKey)
    ) {
      setActiveIndex(null);
      point = null;
    } else if (point) pick();
    else if (active) setActiveIndex(items.indexOf(active));
    else if (document.activeElement instanceof HTMLElement) {
      const focused = document.activeElement.closest<HTMLElement>(itemSelector);
      if (focused && items.includes(focused))
        setActiveIndex(items.indexOf(focused));
    }
  };
  const schedule = () => {
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (needsMeasurement) {
          needsMeasurement = false;
          measure();
        } else pick();
      });
  };
  const refresh = () => {
    needsMeasurement = true;
    schedule();
  };
  const move = (event: MouseEvent) => {
    if (options.disabled || options.frozen?.()) return;
    if (
      event.target instanceof Element &&
      event.target.closest("[role=columnheader],[data-fluid-ignore]")
    ) {
      point = null;
      setActiveIndex(null);
      return;
    }
    point = { x: event.clientX, y: event.clientY };
    schedule();
  };
  const enter = (event: MouseEvent) => {
    fresh = true;
    move(event);
  };
  const leave = () => {
    point = null;
    if (options.frozen?.()) return;
    const focused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement.closest<HTMLElement>(itemSelector)
        : null;
    setActiveIndex(
      focused && root?.contains(focused) ? items.indexOf(focused) : null,
    );
  };
  const focus = (event: FocusEvent) => {
    const element =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(itemSelector)
        : null;
    if (element && items.includes(element))
      setActiveIndex(items.indexOf(element), !snapshot.hover.visible);
  };
  const blur = (event: FocusEvent) => {
    if (
      !point &&
      !(
        event.relatedTarget instanceof Node &&
        root?.contains(event.relatedTarget)
      )
    )
      setActiveIndex(null);
  };
  const keyboard = () => {
    point = null;
    fresh = false;
  };
  const click = (event: MouseEvent) => {
    const target = event.target;
    if (
      !(target instanceof Element) ||
      !target.isConnected ||
      !root?.contains(target) ||
      event.button ||
      options.gapClick === false ||
      options.disabled
    )
      return;
    if (
      target.closest(itemSelector) ||
      target.closest(controls) ||
      !active ||
      disabled(active) ||
      active.dataset.fluidGapClick === "false"
    )
      return;
    const bounds = active.getBoundingClientRect();
    const distance = Math.hypot(
      Math.max(bounds.left - event.clientX, 0, event.clientX - bounds.right),
      Math.max(bounds.top - event.clientY, 0, event.clientY - bounds.bottom),
    );
    const cap =
      typeof options.gapClick === "object"
        ? options.gapClick.maxDistance
        : options.axis === "xy"
          ? 16
          : Infinity;
    if (distance <= cap)
      (active.matches(controls)
        ? active
        : active.querySelector<HTMLElement>(controls)
      )?.click();
  };
  const disconnect = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    observer?.disconnect();
    mutation?.disconnect();
    root?.removeEventListener("mousemove", move);
    root?.removeEventListener("mouseenter", enter);
    root?.removeEventListener("mouseleave", leave);
    root?.removeEventListener("click", click);
    root?.removeEventListener("focusin", focus);
    root?.removeEventListener("focusout", blur);
    root?.removeEventListener("keydown", keyboard, true);
    root?.removeEventListener("scroll", refresh, true);
    window.removeEventListener("resize", refresh);
    mark(null);
    root?.removeAttribute("data-fluid-container");
    root = null;
    point = null;
    fresh = true;
    items = [];
    rects = [];
    needsMeasurement = false;
    publish("hover", { type: "hide" });
    publish("selected", { type: "hide" });
  };
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    setActiveIndex: (index: number | null) => {
      keyboard();
      // Keyboard input can arrive before the next frame after filtering rows.
      // Use the current DOM for that explicit action; pointer motion stays batched.
      if (needsMeasurement) {
        needsMeasurement = false;
        measure();
      }
      setActiveIndex(index);
    },
    refresh,
    disconnect,
    connect: (element: HTMLElement | null, settings: FluidHoverOptions) => {
      options = settings;
      if (root !== element) {
        disconnect();
        root = element;
        if (!root) return;
        root.setAttribute("data-fluid-container", "true");
        observer = new ResizeObserver(refresh);
        observer.observe(root);
        mutation = new MutationObserver(refresh);
        mutation.observe(root, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: [
            "data-fluid-index",
            "data-fluid-key",
            "data-fluid-selected",
            "disabled",
            "aria-disabled",
            "hidden",
          ],
        });
        root.addEventListener("mousemove", move);
        root.addEventListener("mouseenter", enter);
        root.addEventListener("mouseleave", leave);
        root.addEventListener("click", click);
        root.addEventListener("focusin", focus);
        root.addEventListener("focusout", blur);
        root.addEventListener("keydown", keyboard, true);
        root.addEventListener("scroll", refresh, true);
        window.addEventListener("resize", refresh);
      }
      refresh();
    },
  };
}
export type FluidHover = ReturnType<typeof createFluidHover>;
