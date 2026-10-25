// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { DateTime } from "luxon";
import type {
  AdminInfoResponse,
  ServerDrives,
  ServerProperties,
} from "../../../api/consoleApi";
import { i18nKey } from "../../../i18n/lang";

export const reportedNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;

export const health = (servers: ServerProperties[] | undefined) => {
  const known = Array.isArray(servers);
  const rows = known ? servers : [];
  const drives = rows.flatMap((server) => server.drives ?? []);
  const completeDrives =
    known && rows.every((server) => Array.isArray(server.drives));
  return {
    serversOnline: known
      ? rows.filter((server) => server.state === "online").length
      : undefined,
    serversTotal: known ? rows.length : undefined,
    serversOffline: rows.filter(
      (server) => server.state && server.state !== "online",
    ).length,
    drivesOnline: completeDrives
      ? drives.filter((drive) => drive.state === "ok").length
      : undefined,
    drivesTotal: completeDrives ? drives.length : undefined,
    drivesOffline: drives.filter((drive) => drive.state && drive.state !== "ok")
      .length,
    healing: drives.filter((drive) => drive.healing === true).length,
    incomplete:
      !known ||
      !rows.length ||
      !completeDrives ||
      rows.some((server) => !server.state) ||
      drives.some((drive) => !drive.state),
  };
};

export const driveCapacity = (drive: ServerDrives) => {
  const total = reportedNumber(drive.totalSpace);
  const used = reportedNumber(drive.usedSpace);
  const available = reportedNumber(drive.availableSpace);
  // A missing field is not universally zero: an offline or incomplete drive
  // can lack its measurements. Only a reported positive total is eligible.
  return total !== undefined && total > 0
    ? {
        total,
        used,
        available,
        ratio: used === undefined ? undefined : used / total,
      }
    : {
        total: undefined,
        used: undefined,
        available: undefined,
        ratio: undefined,
      };
};

export const capacity = (servers: ServerProperties[] | undefined) => {
  const rows = servers ?? [];
  const drives = rows.flatMap((server) => server.drives ?? []);
  const measured = drives
    .map(driveCapacity)
    .filter((drive) => drive.total !== undefined);
  const sum = (field: "total" | "used" | "available") => {
    if (
      !measured.length ||
      !measured.every((drive) => drive[field] !== undefined)
    )
      return undefined;
    return reportedNumber(
      measured.reduce((total, drive) => total + drive[field]!, 0),
    );
  };
  const rawTotal = sum("total");
  const rawUsed = sum("used");
  const rawAvailable = sum("available");
  // BackendProperties contains global counts/parity, but no erasure-set
  // geometry. Those fields cannot establish a defensible EC usable estimate.
  return {
    rawTotal,
    rawUsed,
    rawAvailable,
    usedRatio:
      rawTotal && rawUsed !== undefined ? rawUsed / rawTotal : undefined,
    measuredDrives: measured.length,
    incomplete:
      !Array.isArray(servers) ||
      !rows.length ||
      rows.some((server) => !Array.isArray(server.drives)) ||
      measured.length !== drives.length ||
      rawUsed === undefined ||
      rawAvailable === undefined,
  };
};

export const usage = (info: AdminInfoResponse) => {
  const computed = Boolean(
    info.usageUpdatedAt && DateTime.fromISO(info.usageUpdatedAt).isValid,
  );
  // The successful Go response omits int64 zeros. A valid scanner timestamp
  // proves that omitted usage fields describe a computed zero, not pending data.
  const computedValue = (value: number | undefined) =>
    computed ? reportedNumber(value === undefined ? 0 : value) : undefined;
  return {
    computed,
    objects: computedValue(info.objects),
    bytes: computedValue(info.usage),
    buckets:
      reportedNumber(info.buckets) ??
      (info.buckets === undefined && computed ? 0 : undefined),
  };
};

type OverviewAlert = {
  id: string;
  severity: "danger" | "warning" | "info";
  message: string;
  values?: Record<string, string | number>;
  href?: string;
};

export const alerts = (
  info: AdminInfoResponse,
  needsRestart: boolean,
): OverviewAlert[] => {
  const result: OverviewAlert[] = [];
  const state = health(info.servers);
  if (state.serversOffline)
    result.push({
      id: "servers-offline",
      severity: "danger",
      message: i18nKey("{count} server(s) offline"),
      values: { count: state.serversOffline },
      href: "#overview-servers",
    });
  if (state.drivesOffline)
    result.push({
      id: "drives-offline",
      severity: "danger",
      message: i18nKey("{count} drive(s) offline"),
      values: { count: state.drivesOffline },
      href: "#overview-servers",
    });
  for (const [serverIndex, server] of (info.servers ?? []).entries()) {
    for (const [driveIndex, drive] of (server.drives ?? []).entries()) {
      const ratio = driveCapacity(drive).ratio;
      if (ratio === undefined || ratio < 0.85) continue;
      result.push({
        id: `drive-capacity-${serverIndex}-${driveIndex}`,
        severity: ratio >= 0.95 ? "danger" : "warning",
        message:
          ratio >= 0.95
            ? i18nKey(
                "Drive {drive} is at least 95% full. The server may reject writes.",
              )
            : i18nKey("Drive {drive} is at least 85% full."),
        values: {
          drive:
            drive.drivePath ||
            drive.endpoint ||
            `${serverIndex + 1}/${driveIndex + 1}`,
        },
        href: "#overview-servers",
      });
    }
  }
  if (state.healing)
    result.push({
      id: "healing",
      severity: "warning",
      message: i18nKey("{count} drive(s) healing"),
      values: { count: state.healing },
      href: "#overview-servers",
    });
  if (needsRestart)
    result.push({
      id: "restart",
      severity: "warning",
      message: i18nKey(
        "Configuration changes are waiting for a server restart.",
      ),
      href: "#restart-server",
    });
  if (state.incomplete)
    result.push({
      id: "health-unknown",
      severity: "info",
      message: i18nKey(
        "Some server or drive health information is unavailable.",
      ),
    });
  if (capacity(info.servers).incomplete)
    result.push({
      id: "capacity-unknown",
      severity: "info",
      message: i18nKey(
        "Capacity is incomplete. Only reported drive measurements are shown.",
      ),
    });
  if (!usage(info).computed)
    result.push({
      id: "usage-pending",
      severity: "info",
      message: i18nKey("The server has not finished computing usage yet."),
    });
  const order = { danger: 0, warning: 1, info: 2 };
  return result.sort((a, b) => order[a.severity] - order[b.severity]);
};
