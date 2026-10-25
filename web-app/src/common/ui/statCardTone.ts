// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Capacity thresholds from DESIGN.md §5.1. Unknown/non-finite values must be
// handled as missing by the caller, never displayed as a measured zero.
export const statCardTone = (
  value: number,
): "success" | "warning" | "danger" =>
  value >= 0.95 ? "danger" : value >= 0.85 ? "warning" : "success";
