// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

interface KeyInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
  defaultPrevented?: boolean;
}
export function keyAction(event: KeyInput) {
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229)
    return null;
  const command = event.ctrlKey || event.metaKey;
  if (command)
    return !event.altKey && !event.shiftKey && event.key.toLowerCase() === "a"
      ? "all"
      : null;
  if (event.altKey)
    return event.key === "ArrowUp" && !event.shiftKey ? "parent" : null;
  if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey))
    return "menu";
  if (event.key === "?") return "help";
  if (event.shiftKey && !["ArrowUp", "ArrowDown"].includes(event.key))
    return null;
  const actions: Record<string, string> = {
    ArrowUp: "up",
    ArrowDown: "down",
    Home: "first",
    End: "last",
    PageUp: "pageUp",
    PageDown: "pageDown",
    Enter: "open",
    " ": "toggle",
    Backspace: "parent",
    Escape: "escape",
    "/": "filter",
    p: "preview",
  };
  return actions[event.key] ?? null;
}
export function moveIndex(
  index: number,
  count: number,
  action: string,
  pageSize: number,
) {
  if (!count) return -1;
  const start = Math.max(0, index);
  const next =
    action === "first"
      ? 0
      : action === "last"
        ? count - 1
        : start +
          (action === "up"
            ? -1
            : action === "down"
              ? 1
              : action === "pageUp"
                ? -pageSize
                : pageSize);
  return Math.max(0, Math.min(count - 1, next));
}
export function rangeSelection(
  ids: readonly string[],
  anchor: string,
  end: string,
  base: readonly string[] = [],
) {
  const a = ids.indexOf(anchor),
    b = ids.indexOf(end);
  if (a < 0 || b < 0)
    return [...new Set(base.filter((id) => ids.includes(id)))];
  return [
    ...new Set([
      ...base.filter((id) => ids.includes(id)),
      ...ids.slice(Math.min(a, b), Math.max(a, b) + 1),
    ]),
  ];
}
export const toggleSelection = (selected: readonly string[], key: string) =>
  selected.includes(key)
    ? selected.filter((id) => id !== key)
    : [...new Set([...selected, key])];
export function parentPrefix(key: string) {
  const path = key.endsWith("/") ? key.slice(0, -1) : key;
  return path.slice(0, path.lastIndexOf("/") + 1);
}
export const objectPath = (bucket: string, key: string) =>
  `/browser/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`;
export function typingTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[data-silo-popup],[role="dialog"]',
    ),
  );
}
export function interactiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('button,a,input,textarea,select,[role="button"]'))
  );
}
