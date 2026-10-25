// Copyright (c) 2026 PGSTY
// SPDX-License-Identifier: AGPL-3.0-or-later

export const getStoredSidebarPreference = (
  read = () => localStorage.getItem("sidebarOpen"),
): boolean | undefined => {
  try {
    const value: unknown = JSON.parse(read() || "null");
    if (
      value &&
      typeof value === "object" &&
      "open" in value &&
      typeof value.open === "boolean"
    ) {
      return value.open;
    }
  } catch {
    // A corrupt preference or unavailable storage must not prevent startup.
  }
  return undefined;
};

export const getStoredSidebarOpen = (read?: () => string | null): boolean =>
  getStoredSidebarPreference(read) ?? true;

export const resolveSidebarOpen = (
  preference: boolean | undefined,
  width: number,
) => preference ?? width >= 1200;
