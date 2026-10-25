// This file is part of MinIO Design System
// Copyright (c) 2023 MinIO, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import React, { HTMLAttributes } from "react";
import { CSSObject } from "styled-components";
import { ApplicationLogoProps } from "../ApplicationLogo/ApplicationLogo.types";

export interface MenuProps {
  options?: MenuItemProps[];
  sx?: CSSObject;
  applicationLogo?: ApplicationLogoProps;
  logo?: React.ReactNode;
  /** A fixed brand mark beside the fading wordmark and separate toggle. */
  brandMark?: React.ReactNode;
  collapsedLogo?: React.ReactNode;
  callPathAction: (path: string) => void;
  horizontal?: boolean;
  isOpen: boolean;
  collapseAction: () => void;
  displayGroupTitles?: boolean;
  signOutAction?: () => void;
  signOutLabel?: string;
  collapseLabel?: string;
  expandLabel?: string;
  currentPath?: string;
  middleComponent?: React.ReactNode;
  endComponent?: React.ReactNode;
  mobileModeAuto?: boolean;
  /** Opt in to a modal drawer below 768px. Defaults to "never". */
  mobileMode?: "auto" | "never";
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  mobileLabel?: string;
}

export interface MenuItemProps {
  group?: string;
  path?: string;
  name: string;
  id?: string;
  icon: React.ReactNode;
  onClick?: (path: string) => void;
  children?: MenuItemProps[];
  /** Render secondary links below a navigable parent instead of a toggle. */
  inlineChildren?: boolean;
  badge?: boolean;
  currentPath?: string;
  visibleTooltip?: boolean;
  isVisible?: boolean;
  selected?: boolean;
}

export interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  divider?: boolean;
}

export interface MainHeaderProps {
  divider?: boolean;
}

export interface MenuConstructProps {
  sx?: CSSObject;
}

export interface SubItemsBoxProps {
  anchorEl: (EventTarget & HTMLElement) | null;
  hideTriggerAction: () => void;
  children: React.ReactNode;
  open: boolean;
}
