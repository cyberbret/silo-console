// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export const fontWeights = { normal: 400, semibold: 550, bold: 700 } as const;
export const typeRoles = {
  display: {
    size: 28,
    line: 34,
    compactSize: 24,
    compactLine: 30,
    weight: fontWeights.bold,
  },
  title: {
    size: 16,
    line: 22,
    compactSize: 15,
    compactLine: 20,
    weight: fontWeights.semibold,
  },
  subtitle: {
    size: 14,
    line: 20,
    compactSize: 13,
    compactLine: 18,
    weight: fontWeights.semibold,
  },
  body: {
    size: 13,
    line: 20,
    compactSize: 12,
    compactLine: 18,
    weight: fontWeights.normal,
  },
  caption: {
    size: 12,
    line: 16,
    compactSize: 11,
    compactLine: 14,
    weight: fontWeights.normal,
  },
  micro: {
    size: 11,
    line: 14,
    compactSize: 10,
    compactLine: 12,
    weight: fontWeights.normal,
  },
} as const;
export const densitySizes = {
  default: {
    controlHeight: 36,
    controlPadding: 12,
    rowPadding: 8,
    gap: 8,
    iconSize: 16,
  },
  compact: {
    controlHeight: 28,
    controlPadding: 10,
    rowPadding: 6,
    gap: 4,
    iconSize: 14,
  },
} as const;
