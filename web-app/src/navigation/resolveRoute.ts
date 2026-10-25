// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { ComponentType, LazyExoticComponent, ReactNode } from "react";
import { matchPath, matchRoutes } from "react-router-dom";
import type { Params } from "react-router-dom";
import { CONSOLE_UI_RESOURCE } from "../common/SecureComponent/permissions";

export interface RouteContext {
  features: readonly string[];
  distributedSetup: boolean;
  hasPermission: (resource: string | undefined, scopes: string[]) => boolean;
}

export interface PageDef {
  id: string;
  path: string;
  title: string;
  section?: "identity" | "monitoring" | "settings" | "tools";
  menu?: {
    id?: string;
    order: number;
    icon: ReactNode;
    forceDisplay?: boolean;
    authorize?: (ctx: RouteContext) => boolean;
  };
  permission?: string[];
  feature?: "kms" | "local-identity" | "distributed";
  component: LazyExoticComponent<ComponentType>;
  // Only wrappers that contain their own <Routes> need a different mount base.
  mountPath?: string;
  // A feature-family catch-all explains a missing feature, but is otherwise 404.
  fallback?: boolean;
  authorize?: (ctx: RouteContext, params: Params, scopes: string[]) => boolean;
}

type RouteResolution =
  | { kind: "page"; def?: PageDef }
  | {
      kind: "feature-off";
      def: PageDef;
      feature: NonNullable<PageDef["feature"]> | "full-console";
    }
  | { kind: "forbidden"; def: PageDef }
  | { kind: "not-found" };

export const resolveRoute = (
  pathname: string,
  registry: readonly PageDef[],
  ctx: RouteContext,
): RouteResolution => {
  // The index has an explicit landing route in ConsoleRoutes. T13 owns its policy.
  if (matchPath("/", pathname)) return { kind: "page" };

  // React Router ranks static, parameter and splat patterns. Never let a broad
  // permitted parent swallow a forbidden or disabled, more specific page.
  const matches = matchRoutes(
    registry.map((def) => ({ path: def.path, handle: def })),
    pathname,
  );
  const match = matches?.[matches.length - 1];
  if (!match || !matchPath(match.route.handle.path, match.pathname)) {
    return { kind: "not-found" };
  }
  const def = match.route.handle;

  if (
    ctx.features.includes("object-browser-only") &&
    !matchPath("/browser/*", match.pathname) &&
    def.id !== "buckets"
  ) {
    return { kind: "feature-off", def, feature: "full-console" };
  }

  const featureOn = isFeatureAvailable(def, ctx);
  if (!featureOn && def.feature) {
    return { kind: "feature-off", def, feature: def.feature };
  }

  if (def.fallback) return { kind: "not-found" };

  const permitted = def.authorize
    ? def.authorize(ctx, match.params, def.permission ?? [])
    : !def.permission || ctx.hasPermission(CONSOLE_UI_RESOURCE, def.permission);
  return { kind: permitted ? "page" : "forbidden", def };
};

export const isFeatureAvailable = (def: PageDef, ctx: RouteContext): boolean =>
  def.feature === "kms"
    ? ctx.features.includes("kms")
    : def.feature === "local-identity"
      ? !ctx.features.includes("ldap-idp")
      : def.feature === "distributed"
        ? ctx.distributedSetup
        : true;
