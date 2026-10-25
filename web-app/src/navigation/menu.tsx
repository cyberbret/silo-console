// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import BucketsIcon from "../../packages/mds/src/components/Icons/BucketsIcon";
import type { ComponentProps } from "react";
import type { Menu } from "mds";
import { CONSOLE_UI_RESOURCE } from "../common/SecureComponent/permissions";
import { registry, menuSections } from "./registry";
import {
  isFeatureAvailable,
  PageDef,
  resolveRoute,
  RouteContext,
} from "./resolveRoute";

type MenuItem = NonNullable<ComponentProps<typeof Menu>["options"]>[number];

export const menuPages = (ctx: RouteContext): PageDef[] =>
  registry
    .filter((page) => {
      const menu = page.menu;
      if (!menu || !isFeatureAvailable(page, ctx)) return false;
      if (ctx.features.includes("object-browser-only") && page.id !== "buckets")
        return false;
      return (
        menu.forceDisplay ||
        (menu.authorize
          ? menu.authorize(ctx)
          : !page.permission ||
            ctx.hasPermission(CONSOLE_UI_RESOURCE, page.permission))
      );
    })
    .sort((a, b) => a.menu!.order - b.menu!.order);

export const menuOptions = (
  ctx: RouteContext,
  recent: readonly string[],
  expanded: boolean,
  t: (text: string) => string,
  currentPath = "",
): MenuItem[] => {
  const pages = menuPages(ctx);
  const route = resolveRoute(currentPath, registry, ctx);
  const activeSection = "def" in route ? route.def?.section : undefined;
  const asItem = (page: PageDef): MenuItem => ({
    id: page.menu?.id || page.id,
    path: page.path,
    name: t(page.title),
    icon: page.menu!.icon,
    ...(page.id === "buckets" && expanded && recent.length > 0
      ? {
          inlineChildren: true,
          children: recent.map((name) => ({
            id: `sidebarManageBucket-${name}`,
            path: `/browser/${encodeURIComponent(name)}`,
            name,
            icon: <BucketsIcon />,
            visibleTooltip: true,
          })),
        }
      : {}),
  });
  return [
    ...pages.filter((page) => !page.section).map(asItem),
    ...menuSections
      .map((section): MenuItem => ({
        id: section.id,
        name: t(section.title),
        icon: section.icon,
        selected: section.id === activeSection,
        children: pages
          .filter((page) => page.section === section.id)
          .map(asItem),
      }))
      .filter((section) => section.children!.length > 0),
  ];
};
