// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export const surfaceLevel = (substrate: number, offset = 0) =>
  Math.max(1, Math.min(Math.round(substrate + offset), 8));

// The dark neutral text token needs more contrast above surface six. Keeping
// this selection beside elevation also resets nested, explicitly lower roots.
export const surfaceMutedVariable = (level: number) =>
  level >= 7 ? "--muted-foreground-elevated" : "--muted-foreground-base";

// Painted cards and portalled surfaces share the same local text-role reset.
export const surfaceTextCssVariables = (level: number, inverted = false) => ({
  "--muted-foreground": inverted
    ? "var(--surface-1, #fafafa)"
    : `var(${surfaceMutedVariable(level)}, #737373)`,
  "--silo-text-secondary": "var(--muted-foreground)",
  "--silo-text-muted": "var(--muted-foreground)",
});
