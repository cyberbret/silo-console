// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { ReactNode } from "react";
import styled from "styled-components";
import { type } from "../../global/typography";
import { useDensity } from "../../global/Density";
import InfoIcon from "../Icons/InfoIcon";
const tones = {
  neutral: "var(--foreground)",
  info: "var(--info)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--destructive)",
};
const Container = styled.div<{
  $tone: string;
  $high: boolean;
  $compact: boolean;
}>`
  ${type("body")}
  color: var(--foreground);
  background: ${({ $high, $tone }) =>
    $high ? `color-mix(in oklab, ${$tone} 12%, transparent)` : "var(--hover)"};
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  border: 0;
  border-radius: 8px;
  padding: ${({ $compact }) => ($compact ? 12 : 16)}px;
  .banner-icon {
    color: ${({ $tone, $high }) => ($high ? "var(--foreground)" : $tone)};
    display: flex;
    align-items: center;
    height: var(--lh-body, 20px);
  }
  .banner-icon svg {
    width: var(--icon-size, 16px);
    height: var(--icon-size, 16px);
    fill: currentColor;
  }
  .banner-title {
    font-weight: 550;
    margin-bottom: 4px;
  }
  .banner-description {
    color: var(--foreground);
  }
`;
const Banner = ({
  title,
  children,
  icon,
  tone = "neutral",
  contrast = "low",
  actions,
  ...props
}: {
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  tone?: keyof typeof tones;
  contrast?: "low" | "high";
  actions?: ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "title">) => {
  const { compact } = useDensity();
  return (
    <Container
      $tone={tones[tone]}
      $high={contrast === "high"}
      $compact={compact}
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      {...props}
    >
      <span className="banner-icon" aria-hidden="true">
        {icon || <InfoIcon />}
      </span>
      <div>
        {title && <div className="banner-title">{title}</div>}
        <div className="banner-description">{children}</div>
      </div>
      {actions}
    </Container>
  );
};
export default Banner;
