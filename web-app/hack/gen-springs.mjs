// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Unit-step response of x'' + 2ζω x' + ω²(x - 1) = 0, x(0)=x'(0)=0.
// Bounce is the first overshoot fraction M: ζ = -ln(M)/sqrt(π²+ln(M)²).
// At M=0 the critically damped solution is 1-(1+ωt)exp(-ωt).
// Otherwise use 1-exp(-ζωt)[cos(ωdt)+ζ/sqrt(1-ζ²)sin(ωdt)],
// ωd=ω sqrt(1-ζ²). Choose ω to settle within 0.1% by duration, then
// normalize the final sample to 1. Uniform samples become CSS linear() stops.
// Duration scales physical time, leaving the normalized easing shape invariant.
export function springSamples(duration, bounce, count = 81) {
  if (!(duration > 0) || bounce < 0 || bounce >= 1 || count < 40)
    throw new RangeError(
      "Positive duration, 0 ≤ bounce < 1, ≥40 samples required",
    );
  const log = bounce === 0 ? 0 : -Math.log(bounce);
  const damping = bounce === 0 ? 1 : log / Math.hypot(Math.PI, log);
  const omega = (bounce === 0 ? 12 : -Math.log(0.001) / damping) / duration;
  const response = (t) => {
    if (bounce === 0) return 1 - (1 + omega * t) * Math.exp(-omega * t);
    const factor = Math.sqrt(1 - damping ** 2);
    const angle = omega * factor * t;
    return (
      1 -
      Math.exp(-damping * omega * t) *
        (Math.cos(angle) + (damping / factor) * Math.sin(angle))
    );
  };
  const end = response(duration);
  return Array.from({ length: count }, (_, i) =>
    i === count - 1
      ? 1
      : Number((response((duration * i) / (count - 1)) / end).toFixed(6)),
  );
}

export function generateMotion() {
  const tokens = { "ease-exit": "ease-in" };
  for (const [tier, duration, exit, bounce] of [
    ["fast", 80, 60, 0],
    ["moderate", 160, 120, 0],
    ["slow", 240, 160, 0.12],
  ]) {
    tokens[`dur-${tier}`] = `${duration}ms`;
    tokens[`dur-${tier}-exit`] = `${exit}ms`;
    tokens[`ease-${tier}`] =
      `linear(${springSamples(duration, bounce).join(", ")})`;
  }
  return tokens;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const path = new URL("../src/common/ui/tokens.ts", import.meta.url);
  const source = readFileSync(path, "utf8");
  const generated = `export const motion = ${JSON.stringify(generateMotion(), null, 2)} as const;`;
  writeFileSync(
    path,
    source.replace(/export const motion = [\s\S]*? as const;/, generated),
  );
}
