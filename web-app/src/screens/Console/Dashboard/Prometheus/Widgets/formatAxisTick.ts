// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Axis labels need bounded precision; raw values and explicit unit formatters
// remain authoritative for tooltips and exported data.
export function formatAxisTick(value: number | string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || String(value).trim() === "")
    return String(value);
  return Number(parsed.toPrecision(6)).toString();
}
