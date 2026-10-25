// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import styled from "styled-components";
import { Elevated, type } from "mds";
import { Link } from "react-router-dom";

export const Header = styled.div`
  .page-header {
    min-height: 56px;
    flex-wrap: nowrap;
  }
  .page-header .page-header-label,
  .page-header .page-header-actions {
    flex: 0 1 auto;
    width: auto;
    max-width: none;
    margin: 0;
  }
  .page-header .page-header-actions {
    flex-shrink: 0;
  }
`;
export const PageTitle = styled.h1`
  ${type("title")}
  margin: 0;
`;
export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
  font-variant-numeric: tabular-nums;
  > * {
    min-width: 0;
  }
`;
export const Cards = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  @media (max-width: 1199px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;
export const Panel = styled(Elevated)<{ $columns?: number }>`
  grid-column: span ${({ $columns }) => $columns ?? 12};
  border-radius: var(--radius-card);
  padding: 20px;
  min-width: 0;
  @media (max-width: 1199px) {
    grid-column: 1 / -1;
  }
  @media (max-width: 767px) {
    padding: 16px;
  }
`;
export const Title = styled.h2`
  ${type("title")}
  margin: 0 0 16px;
  color: var(--foreground);
`;
export const Caption = styled.span`
  ${type("caption")}
  color: var(--muted-foreground);
`;
export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
export const Notice = styled.div`
  ${type("body")}
  grid-column: 1 / -1;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border-radius: var(--radius-control);
  background: var(--hover);
  color: var(--foreground);
  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    fill: currentColor;
  }
`;
export const AlertList = styled.ul`
  ${type("body")}
  list-style: none;
  padding: 0;
  margin: 0;
  li {
    display: flex;
    gap: 12px;
    padding: 12px 0;
    align-items: flex-start;
  }
  li + li {
    border-top: 1px solid var(--border);
  }
  && li::before {
    content: none;
  }
  a,
  span {
    overflow-wrap: anywhere;
  }
  a {
    color: var(--foreground);
    text-underline-offset: 3px;
  }
  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    fill: currentColor;
  }
`;
export const AlertIcon = styled.span<{
  $severity: "danger" | "warning" | "info";
}>`
  display: inline-flex;
  margin-top: 2px;
  color: ${({ $severity }) =>
    `var(--${$severity === "danger" ? "destructive" : $severity})`};
`;
export const Actions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
  }
  button {
    justify-content: flex-start;
  }
`;
export const SkeletonBlock = styled.span`
  display: inline-block;
  width: 96px;
  height: 28px;
  background: var(--muted);
  border-radius: var(--radius-control);
`;
export const Navigation = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  @media (max-width: 1199px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;
export const NavigationCard = styled(Elevated)`
  min-width: 0;
  border-radius: var(--radius-card);
  padding: 16px;
  h2 {
    margin: 0 8px 12px;
  }
  nav {
    display: grid;
    gap: 4px;
  }
`;
export const NavigationLink = styled(Link)`
  ${type("body")}
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: var(--control-height);
  padding: 4px 8px;
  color: var(--foreground);
  text-decoration: none;
  border-radius: var(--radius-control);
  transition: background var(--dur-fast) var(--ease-fast);
  span {
    display: flex;
    flex: 0 0 16px;
    color: var(--muted-foreground);
  }
  svg {
    width: 16px;
    height: 16px;
  }
  &:hover {
    background: var(--hover);
  }
  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }
  @media (pointer: coarse) {
    min-height: 40px;
  }
`;
