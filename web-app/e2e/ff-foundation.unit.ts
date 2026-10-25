// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import { springSamples, generateMotion } from "../hack/gen-springs.mjs";
import {
  darkTokens,
  lightTokens,
  motion,
  tokenCssVariables,
} from "../src/common/ui/tokens";
import {
  surfaceLevel,
  surfaceMutedVariable,
} from "../packages/mds/src/global/SurfaceLevel.logic";
import { darkTheme, lightTheme } from "../packages/mds/src/global/themes";
import {
  siloDarkThemeOverrides,
  siloLightThemeOverrides,
} from "../src/common/siloTheme";

test("CSS springs settle exactly, preserve monotonic zero-bounce motion and match the intended overshoot", () => {
  for (const duration of [80, 160, 240]) {
    const samples = springSamples(duration, 0);
    expect(samples.length).toBeGreaterThanOrEqual(40);
    expect(samples[0]).toBe(0);
    expect(samples.at(-1)).toBe(1);
    for (let i = 1; i < samples.length; i++)
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
  }
  const bouncing = springSamples(240, 0.12);
  expect(bouncing[0]).toBe(0);
  expect(bouncing.at(-1)).toBe(1);
  expect(Math.max(...bouncing) - 1).toBeCloseTo(0.12, 2);
  expect(() => springSamples(0, 0)).toThrow(RangeError);
  expect(() => springSamples(80, 1)).toThrow(RangeError);
  expect(() => springSamples(80, 0, 39)).toThrow(RangeError);
  expect(generateMotion()).toEqual(motion);
});

const luminance = (hex: string) => {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((part) => {
      const value = parseInt(part, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

test("all text token pairs including inverted tooltips meet WCAG AA", () => {
  for (const [name, tokens] of [
    ["light", lightTokens],
    ["dark", darkTokens],
  ] as const) {
    const pairs = [
      ...["surface-1", "surface-2", "surface-3"].flatMap((surface) =>
        ["foreground", "muted-foreground"].map((text) => [text, surface]),
      ),
      ["surface-1", "foreground"],
    ];
    for (const [text, surface] of pairs) {
      const a = luminance(tokens[text as keyof typeof tokens]);
      const b = luminance(tokens[surface as keyof typeof tokens]);
      const contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      console.log(`${name} | ${text} | ${surface} | ${contrast.toFixed(2)}:1`);
      expect(contrast, `${name}: ${text} on ${surface}`).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  }
});

test("both text roles meet AA on all eight contextual surface levels", () => {
  for (const [name, tokens] of [
    ["light", lightTokens],
    ["dark", darkTokens],
  ] as const) {
    const variables = tokenCssVariables(tokens);
    for (let level = 1; level <= 8; level++) {
      const background = luminance(variables[`--surface-${level}`]);
      for (const variable of ["--foreground", surfaceMutedVariable(level)]) {
        const text = luminance(variables[variable]);
        const ratio =
          (Math.max(text, background) + 0.05) /
          (Math.min(text, background) + 0.05);
        console.log(
          `${name} | ${variable} | surface-${level} | ${ratio.toFixed(2)}:1`,
        );
        expect(
          ratio,
          `${name}: ${variable} on surface-${level}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});

test("destructive text meets AA on tinted page, card, dialog and error backgrounds", () => {
  const overlay = (hex: string, channel: number, alpha: number) =>
    "#" +
    hex
      .slice(1)
      .match(/../g)!
      .map((part) =>
        Math.round(parseInt(part, 16) * (1 - alpha) + channel * alpha)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  for (const [name, tokens] of [
    ["light", lightTokens],
    ["dark", darkTokens],
  ] as const) {
    const isDark = name === "dark";
    const backgrounds = [
      tokens["destructive-light"],
      ...["surface-1", "surface-3", "surface-5"].flatMap((key) => {
        const base = tokens[key as keyof typeof tokens];
        return [
          base,
          ...[
            isDark ? 0.25 : 0.08,
            isDark ? 0.2 : 0.065,
            isDark ? 0.1 : 0.07,
          ].map((alpha) => overlay(base, isDark ? 255 : 0, alpha)),
        ];
      }),
    ];
    const text = luminance(tokens["destructive-text"]);
    for (const background of backgrounds) {
      const fill = luminance(background);
      expect(
        (Math.max(text, fill) + 0.05) / (Math.min(text, fill) + 0.05),
        `${name}: destructive text on ${background}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("surface nesting saturates at eight, and cloned palettes select the correct shadow recipe", () => {
  expect(surfaceLevel(1, 2)).toBe(3);
  expect(surfaceLevel(surfaceLevel(1, 4), 2)).toBe(7);
  expect(surfaceLevel(7, 4)).toBe(8);
  expect(surfaceLevel(-1)).toBe(1);
  for (const [name, tokens] of [
    ["light", lightTokens],
    ["dark", darkTokens],
  ] as const) {
    const variables = tokenCssVariables({ ...tokens });
    expect(variables["--shadow-5"]).toBe(`var(--shadow-${name}-5)`);
    expect(variables["--font-sans"]).toContain('"PingFang SC"');
  }
});

const leafKeys = (value: object, prefix = ""): string[] =>
  Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof entry === "object" ? leafKeys(entry, path) : [path];
  });

test("both SILO themes explicitly replace every stock MDS theme leaf", () => {
  for (const [base, themed] of [
    [lightTheme, siloLightThemeOverrides],
    [darkTheme, siloDarkThemeOverrides],
  ]) {
    const keys = new Set(leafKeys(themed));
    expect(leafKeys(base).filter((key) => !keys.has(key))).toEqual([]);
  }
});
