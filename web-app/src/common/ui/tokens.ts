// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import {
  fontWeights,
  typeRoles,
  densitySizes,
} from "../../../packages/mds/src/global/designScale";
export {
  fontWeights,
  typeRoles,
  densitySizes,
} from "../../../packages/mds/src/global/designScale";

// Destructive text is darkened in light mode and lightened in dark mode to
// meet AA on secondary-button tint; the specified status color stays unchanged.
// Fluid Functionalism surface/shadow recipes, MIT © 2026 Micka Touillaud.
// See NOTICE and licenses/fluid-functionalism-MIT.txt.
export const lightTokens = {
  "surface-1": "#FAFAFA",
  "surface-2": "#FCFCFC",
  "surface-3": "#FFFFFF",
  "surface-4": "#FFFFFF",
  "surface-5": "#FFFFFF",
  "surface-6": "#FFFFFF",
  "surface-7": "#FFFFFF",
  "surface-8": "#FFFFFF",
  background: "var(--surface-1)",
  card: "var(--surface-3)",
  border: "color-mix(in oklab, var(--foreground) 12%, transparent)",
  "focus-ring": "#6B97FF",
  foreground: "#171717",
  "muted-foreground": "#737373",
  "muted-foreground-elevated": "#737373",
  muted: "#F4F4F5",
  accent: "#E5E5E5",
  selected: "#D4D4D4",
  input: "#E5E5E5",
  overlay: "0 0 0",
  hover: "rgb(0 0 0 / .04)",
  active: "rgb(0 0 0 / .07)",
  tint: "rgb(0 0 0 / .08)",
  "tint-hover": "rgb(0 0 0 / .065)",
  destructive: "#EF4444",
  "destructive-text": "#B32E2E",
  "destructive-light": "#FEF2F2",
  info: "#3B82F6",
  success: "#22C55E",
  warning: "#F59E0B",
  brand: "#1D588C",
  "info-tint": "color-mix(in oklab, var(--info) 12%, transparent)",
  "success-tint": "color-mix(in oklab, var(--success) 12%, transparent)",
  "warning-tint": "color-mix(in oklab, var(--warning) 12%, transparent)",
  "destructive-tint":
    "color-mix(in oklab, var(--destructive) 12%, transparent)",
} as const;

export const darkTokens = {
  "surface-1": "#171717",
  "surface-2": "#1E1E1E",
  "surface-3": "#252525",
  "surface-4": "#2C2C2C",
  "surface-5": "#333333",
  "surface-6": "#3A3A3A",
  "surface-7": "#414141",
  "surface-8": "#484848",
  background: "var(--surface-1)",
  card: "var(--surface-3)",
  border: "color-mix(in oklab, var(--foreground) 12%, transparent)",
  "focus-ring": "#6B97FF",
  foreground: "#F5F5F5",
  "muted-foreground": "#A3A3A3",
  "muted-foreground-elevated": "#B8B8B8",
  muted: "#1E1E1E",
  accent: "#525252",
  selected: "#525252",
  input: "#404040",
  overlay: "255 255 255",
  hover: "rgb(255 255 255 / .06)",
  active: "rgb(255 255 255 / .10)",
  tint: "rgb(255 255 255 / .25)",
  "tint-hover": "rgb(255 255 255 / .20)",
  destructive: "#FCA5A5",
  "destructive-text": "#FFE1E1",
  "destructive-light": "#450A0A",
  info: "#93C5FD",
  success: "#86EFAC",
  warning: "#FCD34D",
  brand: "#7FB8E8",
  "info-tint": "color-mix(in oklab, var(--info) 12%, transparent)",
  "success-tint": "color-mix(in oklab, var(--success) 12%, transparent)",
  "warning-tint": "color-mix(in oklab, var(--warning) 12%, transparent)",
  "destructive-tint":
    "color-mix(in oklab, var(--destructive) 12%, transparent)",
} as const;

const fonts = {
  sans: '"Inter", "Inter Variable", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif',
  mono: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", "Noto Sans Mono CJK SC", monospace',
} as const;

const shadows = {
  "shadow-color": "rgb(0 0 0 / 0.06)",
  "shadow-light-1": "0 0 0 1px var(--shadow-color)",
  "shadow-light-2":
    "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color)",
  "shadow-light-3":
    "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color), 0 3px 3px -1.5px var(--shadow-color)",
  "shadow-light-4":
    "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color), 0 3px 3px -1.5px var(--shadow-color), 0 6px 6px -3px var(--shadow-color)",
  "shadow-light-5":
    "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color), 0 3px 3px -1.5px var(--shadow-color), 0 6px 6px -3px var(--shadow-color), 0 12px 12px -6px var(--shadow-color)",
  "shadow-light-6":
    "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color), 0 3px 3px -1.5px var(--shadow-color), 0 6px 6px -3px var(--shadow-color), 0 12px 12px -6px var(--shadow-color), 0 24px 24px -12px var(--shadow-color)",
  "shadow-light-7":
    "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color), 0 3px 3px -1.5px var(--shadow-color), 0 6px 6px -3px var(--shadow-color), 0 12px 12px -6px var(--shadow-color), 0 24px 24px -12px var(--shadow-color), 0 48px 48px -24px var(--shadow-color)",
  "shadow-light-8":
    "0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color), 0 3px 3px -1.5px var(--shadow-color), 0 6px 6px -3px var(--shadow-color), 0 12px 12px -6px var(--shadow-color), 0 24px 24px -12px var(--shadow-color), 0 48px 48px -24px var(--shadow-color), 0 96px 96px -48px var(--shadow-color)",
  "dm-hi-base": "rgba(255,255,255,0.01)",
  "dm-hi-mid": "rgba(255,255,255,0.02)",
  "dm-hi-high": "rgba(255,255,255,0.04)",
  "dm-hi-peak": "rgba(255,255,255,0.06)",
  "dm-ring-base": "rgba(255,255,255,0.02)",
  "dm-ring-mid": "rgba(255,255,255,0.04)",
  "dm-ring-high": "rgba(255,255,255,0.06)",
  "dm-drop": "rgba(0,0,0,0.18)",
  "shadow-dark-1": "inset 0 0 0 1px var(--dm-ring-base)",
  "shadow-dark-2":
    "inset 0 1px 0 0 var(--dm-hi-base), inset 0 0 0 1px var(--dm-ring-base), 0 1px 1px -0.5px var(--dm-drop)",
  "shadow-dark-3":
    "inset 0 1px 0 0 var(--dm-hi-mid), inset 0 0 0 1px var(--dm-ring-base), 0 0 0 1px rgba(0,0,0,0.12), 0 1px 1px -0.5px var(--dm-drop), 0 3px 3px -1.5px var(--dm-drop)",
  "shadow-dark-4":
    "inset 0 1px 0 0 var(--dm-hi-mid), inset 0 0 0 1px var(--dm-ring-mid), 0 0 0 1px rgba(0,0,0,0.14), 0 1px 1px -0.5px var(--dm-drop), 0 3px 3px -1.5px var(--dm-drop), 0 6px 6px -3px var(--dm-drop)",
  "shadow-dark-5":
    "inset 0 1px 0 0 var(--dm-hi-high), inset 0 0 0 1px var(--dm-ring-mid), 0 0 0 1px rgba(0,0,0,0.16), 0 1px 1px -0.5px var(--dm-drop), 0 3px 3px -1.5px var(--dm-drop), 0 6px 6px -3px var(--dm-drop), 0 12px 12px -6px var(--dm-drop)",
  "shadow-dark-6":
    "inset 0 1px 0 0 var(--dm-hi-high), inset 0 0 0 1px var(--dm-ring-high), 0 0 0 1px rgba(0,0,0,0.18), 0 1px 1px -0.5px var(--dm-drop), 0 3px 3px -1.5px var(--dm-drop), 0 6px 6px -3px var(--dm-drop), 0 12px 12px -6px var(--dm-drop), 0 24px 24px -12px var(--dm-drop)",
  "shadow-dark-7":
    "inset 0 1px 0 0 var(--dm-hi-peak), inset 0 0 0 1px var(--dm-ring-high), 0 0 0 1px rgba(0,0,0,0.20), 0 1px 1px -0.5px var(--dm-drop), 0 3px 3px -1.5px var(--dm-drop), 0 6px 6px -3px var(--dm-drop), 0 12px 12px -6px var(--dm-drop), 0 24px 24px -12px var(--dm-drop), 0 48px 48px -24px var(--dm-drop)",
  "shadow-dark-8":
    "inset 0 1px 0 0 var(--dm-hi-peak), inset 0 0 0 1px var(--dm-ring-high), 0 0 0 1px rgba(0,0,0,0.22), 0 1px 1px -0.5px var(--dm-drop), 0 3px 3px -1.5px var(--dm-drop), 0 6px 6px -3px var(--dm-drop), 0 12px 12px -6px var(--dm-drop), 0 24px 24px -12px var(--dm-drop), 0 48px 48px -24px var(--dm-drop), 0 96px 96px -48px var(--dm-drop)",
} as const;

export const spacing = [4, 8, 12, 16, 20, 24, 32, 48] as const;
export const radius = {
  control: 8,
  input: 8,
  button: 8,
  card: 12,
  popover: 12,
  dialog: 16,
  badge: 999,
  pill: 999,
} as const;
export const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 1200,
  xl: 1440,
} as const;

// BEGIN GENERATED SPRINGS (node hack/gen-springs.mjs)
export const motion = {
  "ease-exit": "ease-in",
  "dur-fast": "80ms",
  "dur-fast-exit": "60ms",
  "ease-fast":
    "linear(0, 0.010187, 0.036939, 0.075445, 0.121911, 0.173372, 0.227536, 0.28265, 0.3374, 0.390817, 0.44221, 0.491107, 0.537206, 0.580338, 0.620435, 0.657505, 0.691614, 0.722868, 0.7514, 0.777361, 0.800916, 0.822229, 0.84147, 0.858801, 0.874381, 0.888362, 0.900887, 0.91209, 0.922097, 0.931023, 0.938976, 0.946053, 0.952344, 0.95793, 0.962887, 0.96728, 0.971171, 0.974615, 0.97766, 0.980351, 0.982727, 0.984824, 0.986674, 0.988304, 0.98974, 0.991005, 0.992118, 0.993097, 0.993957, 0.994714, 0.995378, 0.995962, 0.996474, 0.996923, 0.997317, 0.997663, 0.997966, 0.998231, 0.998464, 0.998667, 0.998846, 0.999002, 0.999138, 0.999258, 0.999362, 0.999453, 0.999533, 0.999603, 0.999664, 0.999717, 0.999763, 0.999804, 0.999839, 0.99987, 0.999897, 0.999921, 0.999941, 0.999959, 0.999975, 0.999988, 1)",
  "dur-moderate": "160ms",
  "dur-moderate-exit": "120ms",
  "ease-moderate":
    "linear(0, 0.010187, 0.036939, 0.075445, 0.121911, 0.173372, 0.227536, 0.28265, 0.3374, 0.390817, 0.44221, 0.491107, 0.537206, 0.580338, 0.620435, 0.657505, 0.691614, 0.722868, 0.7514, 0.777361, 0.800916, 0.822229, 0.84147, 0.858801, 0.874381, 0.888362, 0.900887, 0.91209, 0.922097, 0.931023, 0.938976, 0.946053, 0.952344, 0.95793, 0.962887, 0.96728, 0.971171, 0.974615, 0.97766, 0.980351, 0.982727, 0.984824, 0.986674, 0.988304, 0.98974, 0.991005, 0.992118, 0.993097, 0.993957, 0.994714, 0.995378, 0.995962, 0.996474, 0.996923, 0.997317, 0.997663, 0.997966, 0.998231, 0.998464, 0.998667, 0.998846, 0.999002, 0.999138, 0.999258, 0.999362, 0.999453, 0.999533, 0.999603, 0.999664, 0.999717, 0.999763, 0.999804, 0.999839, 0.99987, 0.999897, 0.999921, 0.999941, 0.999959, 0.999975, 0.999988, 1)",
  "dur-slow": "240ms",
  "dur-slow-exit": "160ms",
  "ease-slow":
    "linear(0, 0.01122, 0.042227, 0.089206, 0.148597, 0.217135, 0.291873, 0.370195, 0.449823, 0.528809, 0.605532, 0.678675, 0.747209, 0.810367, 0.867623, 0.918663, 0.963359, 1.00174, 1.03397, 1.06032, 1.081149, 1.096876, 1.107967, 1.114916, 1.118228, 1.118407, 1.115946, 1.111318, 1.104967, 1.097305, 1.088708, 1.079512, 1.070013, 1.060465, 1.051086, 1.042053, 1.033508, 1.025562, 1.018291, 1.011749, 1.005962, 1.000937, 0.996663, 0.993114, 0.990253, 0.988032, 0.9864, 0.985297, 0.984665, 0.984442, 0.984569, 0.984987, 0.98564, 0.986478, 0.987453, 0.988521, 0.989645, 0.990791, 0.991931, 0.99304, 0.9941, 0.995095, 0.996013, 0.996847, 0.997592, 0.998246, 0.998809, 0.999282, 0.999671, 0.999979, 1.000214, 1.00038, 1.000487, 1.00054, 1.000547, 1.000515, 1.000452, 1.000363, 1.000254, 1.000132, 1)",
} as const;
// END GENERATED SPRINGS

// Compatibility aliases for T03 consumers; every alias resolves to the new system.
const aliases = {
  bg: "surface-1",
  surface: "surface-3",
  "surface-hover": "hover",
  border: "border",
  "border-strong": "input",
  text: "foreground",
  "text-secondary": "muted-foreground",
  "text-muted": "muted-foreground",
  primary: "foreground",
  "primary-hover": "foreground",
  "primary-soft": "active",
  accent: "accent",
  success: "success",
  warning: "warning",
  danger: "destructive",
  "danger-text": "destructive-text",
  info: "info",
  "success-soft": "success-tint",
  "warning-soft": "warning-tint",
  "danger-soft": "destructive-tint",
  "info-soft": "info-tint",
  "neutral-badge": "muted",
  "neutral-badge-text": "foreground",
  "elevation-card": "shadow-2",
  "elevation-overlay": "shadow-3",
} as const;

export const tokenCssVariables = (
  tokens: Readonly<Record<keyof typeof lightTokens, string>>,
): Record<string, string> => {
  const variables: Record<string, string> = {};
  for (const [name, value] of Object.entries({
    ...tokens,
    ...shadows,
    ...motion,
  }))
    variables[`--${name}`] = value;
  variables["--muted-foreground-base"] = tokens["muted-foreground"];
  for (let level = 1; level <= 8; level++)
    variables[`--shadow-${level}`] =
      `var(--shadow-${tokens["surface-1"] === darkTokens["surface-1"] ? "dark" : "light"}-${level})`;
  for (const [name, value] of Object.entries(fonts))
    variables[`--font-${name}`] = value;
  for (const [name, value] of Object.entries(fontWeights))
    variables[`--fw-${name}`] = String(value);
  for (const [role, value] of Object.entries(typeRoles)) {
    variables[`--fs-${role}`] = `${value.size}px`;
    variables[`--lh-${role}`] = `${value.line}px`;
    variables[`--fs-${role}-compact`] = `${value.compactSize}px`;
    variables[`--lh-${role}-compact`] = `${value.compactLine}px`;
  }
  for (const size of spacing) {
    variables[`--space-${size}`] = `${size}px`;
    variables[`--silo-space-${size}`] = `var(--space-${size})`;
  }
  for (const [name, value] of Object.entries(radius)) {
    variables[`--radius-${name}`] = `${value}px`;
    variables[`--silo-radius-${name}`] = `var(--radius-${name})`;
  }
  for (const [density, sizes] of Object.entries(densitySizes))
    for (const [name, size] of Object.entries(sizes)) {
      const key = name.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`,
      );
      variables[`--${key}-${density}`] = `${size}px`;
      if (density === "default") variables[`--${key}`] = `${size}px`;
    }
  for (const [name, token] of Object.entries(aliases))
    variables[`--silo-${name}`] = `var(--${token})`;
  variables["--sidebar-rail-width"] = "64px";
  variables["--silo-motion-hover"] = "var(--dur-fast) var(--ease-fast)";
  variables["--silo-motion-panel"] = "var(--dur-moderate) var(--ease-moderate)";
  return variables;
};
