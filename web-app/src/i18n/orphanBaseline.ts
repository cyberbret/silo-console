// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Existing dictionary keys absent from source literals at the T05 baseline.
// Some arrive from the server (e.g. chart legends). Shrink after review; do not
// add newly orphaned keys instead of removing their unused translations.
export const orphanBaseline: readonly string[] = [
  "CPU Usage Rate",
  "Data Received",
  "Data Sent",
  "Download of multiple files failed.",
  "File couldn't be loaded. Please try Download instead",
  "Free Inodes",
  "Group Mappings",
  "Internode Bytes Received",
  "Internode Bytes Sent",
  "LDAP Configurations",
  "Memory Used",
  "Node RChar",
  "Node WChar",
  "OPENID Configurations",
  "Open FDs",
  "Policy Mappings",
  "Read Syscalls",
  "User Mappings",
  "Write Syscalls",
  "private",
  "public",
];

// Values as well as dictionaries are recorded: editing a shadowed translation
// must fail even if its English key was already present in this baseline.
export const duplicateBaseline: readonly {
  key: string;
  winner: string;
  value: string;
  hidden: string;
  hiddenValue: string;
}[] = [
  {
    key: "Health",
    winner: "zh",
    value: "健康报告",
    hidden: "zhHelp",
    hiddenValue: "健康",
  },
  {
    key: "Inspect",
    winner: "zh",
    value: "对象检查",
    hidden: "zhHelp",
    hiddenValue: "检查",
  },
  {
    key: "Performance",
    winner: "zh",
    value: "性能测试",
    hidden: "zhHelp",
    hiddenValue: "性能",
  },
  {
    key: "Tiers",
    winner: "zh",
    value: "分层存储",
    hidden: "zhHelp",
    hiddenValue: "存储层",
  },
  {
    key: "Unhealthy",
    winner: "zh",
    value: "异常",
    hidden: "zhScreens",
    hiddenValue: "不健康",
  },
  {
    key: "Usage Data Age",
    winner: "zh",
    value: "距上次用量更新",
    hidden: "zhScreens",
    hiddenValue: "用量数据时效",
  },
];
