// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import styled from "styled-components";
import { type, useDensity } from "mds";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";
const Badge = styled.span<{ $tone: Tone; $dot: boolean; $compact: boolean }>`
  ${({ $compact }) => type("caption", { compact: $compact })}
  display: inline-flex;
  align-items: center;
  gap: var(--silo-space-8);
  box-sizing: border-box;
  height: ${({ $compact }) => ($compact ? 20 : 24)}px;
  padding: 0 ${({ $compact }) => ($compact ? 8 : 10)}px;
  border-radius: var(--silo-radius-pill);
  color: var(--foreground);
  border: 1px solid ${({ $dot }) => ($dot ? "var(--border)" : "transparent")};
  background: ${({ $tone, $dot }) =>
    $dot
      ? "transparent"
      : `color-mix(in srgb, var(--silo-${$tone === "neutral" ? "text-muted" : $tone}) 15%, var(--background))`};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;
const Dot = styled.span<{ $tone: Tone }>`
  width: 6px;
  height: 6px;
  border-radius: var(--silo-radius-pill);
  background: ${({ $tone }) =>
    `var(--silo-${$tone === "neutral" ? "text-muted" : $tone})`};
  flex-shrink: 0;
`;

export const StatusBadge = ({
  tone,
  label,
  dot = true,
}: {
  tone: Tone;
  label: string;
  dot?: boolean;
}) => {
  const { compact } = useDensity();
  return (
    <Badge $tone={tone} $dot={dot} $compact={compact}>
      {dot && <Dot $tone={tone} aria-hidden="true" />}
      {label}
    </Badge>
  );
};
