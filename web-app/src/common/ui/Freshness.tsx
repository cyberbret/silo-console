// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useEffect, useState } from "react";
import { TimeIcon } from "mds";
import styled from "styled-components";
import { useLanguage } from "i18n";
import { Hint } from "./shared";
import { typography } from "./typography";
import { freshnessText } from "./freshnessText";

const Timestamp = styled.span`
  ${typography.caption}
  display: inline-flex;
  align-items: center;
  gap: var(--silo-space-4);
  color: var(--silo-text-muted);
  font-variant-numeric: tabular-nums;
  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    fill: currentColor;
  }
`;

export const Freshness = (props: {
  at?: string | null;
  pending?: boolean;
  prefix?: "Updated" | "Calculated";
}) => {
  const language = useLanguage();
  const [, refresh] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => refresh((tick) => tick + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const { label, tooltip, dateTime } = freshnessText({ ...props, language });
  return (
    <Hint text={tooltip}>
      <Timestamp tabIndex={0}>
        <TimeIcon aria-hidden="true" />
        {dateTime ? <time dateTime={dateTime}>{label}</time> : label}
      </Timestamp>
    </Hint>
  );
};
