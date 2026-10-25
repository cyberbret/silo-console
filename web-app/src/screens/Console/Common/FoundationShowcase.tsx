// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { CSSProperties, useState } from "react";
import styled from "styled-components";
import { BucketsIcon } from "mds";
import { formatText, i18nKey, useT } from "i18n";
import {
  darkTokens,
  DensityProvider,
  Elevated,
  lightTokens,
  tokenCssVariables,
  type,
  typeRoles,
  useDensity,
} from "../../../common/ui";

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: var(--space-16);
`;
const Panel = styled.div`
  padding: var(--space-20);
  border-radius: var(--radius-card);
  background: var(--surface-3);
  box-shadow: var(--shadow-2);
  color: var(--foreground);
  min-width: 0;
  h2 {
    ${type("title")} margin: 0 0 var(--space-16);
  }
`;
const Swatches = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-8);
`;
const Swatch = styled.div<{ $color: string }>`
  ${type("caption")}
  padding: var(--space-12) var(--space-4);
  text-align: center;
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-1);
  background: ${({ $color }) => $color};
`;
const TypeSample = styled.div<{ $role: keyof typeof typeRoles }>`
  ${({ $role }) => type($role)}
  padding: var(--space-8) 0;
  & + & {
    border-top: 1px solid var(--border);
  }
`;
const ShadowGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-24);
  padding: var(--space-16) 0;
`;
const ShadowSample = styled(Elevated)`
  ${type("caption")}
  padding: var(--space-16) var(--space-4);
  border-radius: var(--radius-control);
  text-align: center;
`;
const DensityRow = styled.div<{ $roleStyle: ReturnType<typeof type> }>`
  ${({ $roleStyle }) => $roleStyle}
  display: flex;
  align-items: center;
  height: var(--control-height);
  padding: 0 var(--control-padding);
  gap: var(--gap);
  border-radius: var(--radius-control);
  background: var(--hover);
  svg {
    width: var(--icon-size);
    height: var(--icon-size);
    color: var(--muted-foreground);
  }
`;
const DensitySample = () => {
  const { compact, type: roles, controlHeight } = useDensity();
  const t = useT();
  return (
    <div>
      <DensityRow $roleStyle={roles.body}>
        <BucketsIcon />
        <span>{compact ? t("Compact density") : t("Default density")}</span>
        <span className="silo-num">
          {formatText(t("{height} px"), { height: controlHeight })}
        </span>
      </DensityRow>
    </div>
  );
};
const MotionTrack = styled.div`
  margin-top: var(--space-12);
  padding: var(--space-4);
  border-radius: var(--radius-control);
  background: var(--muted);
`;
const MotionBox = styled.div<{ $tier: string; $moved: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-control);
  background: var(--foreground);
  transform: translateX(${({ $moved }) => ($moved ? "140px" : "0")});
  opacity: ${({ $moved }) => ($moved ? 0.6 : 1)};
  transition:
    transform var(--dur-${({ $tier }) => $tier})
      var(--ease-${({ $tier }) => $tier}),
    opacity var(--dur-${({ $tier }) => $tier})
      var(--ease-${({ $tier }) => $tier});
  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
`;
const MotionButton = styled.button`
  ${type("body", { weight: "semibold" })}
  padding: var(--space-8) var(--space-12);
  border: none;
  border-radius: var(--radius-control);
  color: var(--foreground);
  background: var(--tint);
  cursor: pointer;
  &:hover {
    background: var(--tint-hover);
  }
`;
const MotionSample = ({
  tier,
  label,
}: {
  tier: "fast" | "moderate" | "slow";
  label: string;
}) => {
  const [moved, setMoved] = useState(false);
  const t = useT();
  return (
    <div>
      <MotionButton
        type="button"
        aria-pressed={moved}
        onClick={() => setMoved(!moved)}
      >
        {t(label)}
      </MotionButton>
      <MotionTrack>
        <MotionBox data-motion-tier={tier} $tier={tier} $moved={moved} />
      </MotionTrack>
    </div>
  );
};
const roleLabels = {
  display: i18nKey("Display type"),
  title: i18nKey("Title type"),
  subtitle: i18nKey("Subtitle type"),
  body: i18nKey("Body type"),
  caption: i18nKey("Caption type"),
  micro: i18nKey("Micro type"),
};

const FoundationShowcase = () => {
  const t = useT();
  return (
    <>
      <Grid>
        {(["light", "dark"] as const).map((theme) => (
          <Panel
            key={theme}
            style={
              tokenCssVariables(
                theme === "light" ? lightTokens : darkTokens,
              ) as CSSProperties
            }
          >
            <h2>
              {theme === "light" ? t("Light palette") : t("Dark palette")}
            </h2>
            <Swatches>
              {Array.from({ length: 8 }, (_, i) => (
                <Swatch key={i} $color={`var(--surface-${i + 1})`}>
                  {formatText(t("Surface {level}"), { level: i + 1 })}
                </Swatch>
              ))}
            </Swatches>
            <p
              style={{
                marginTop: "var(--space-12)",
                color: "var(--foreground)",
              }}
            >
              {t("Primary text")}
            </p>
            <p style={{ color: "var(--muted-foreground)" }}>
              {t("Secondary text")}
            </p>
          </Panel>
        ))}
      </Grid>
      <Grid>
        <Panel>
          <h2>{t("Typography roles")}</h2>
          {(Object.keys(typeRoles) as Array<keyof typeof typeRoles>).map(
            (role) => (
              <TypeSample key={role} $role={role}>
                {t(roleLabels[role])}{" "}
                <span className="silo-num">
                  {typeRoles[role].size}/{typeRoles[role].line}
                </span>
              </TypeSample>
            ),
          )}
        </Panel>
        <Panel>
          <h2>{t("Shadow ladder")}</h2>
          <ShadowGrid>
            {Array.from({ length: 8 }, (_, i) => (
              <ShadowSample key={i} offset={i} shadowLevel={i + 1}>
                {i + 1}
              </ShadowSample>
            ))}
          </ShadowGrid>
          <h2>{t("Density comparison")}</h2>
          <DensityProvider>
            <DensitySample />
          </DensityProvider>
          <div style={{ height: "var(--space-8)" }} />
          <DensityProvider density="compact">
            <DensitySample />
          </DensityProvider>
        </Panel>
      </Grid>
      <Panel>
        <h2>{t("Motion tiers")}</h2>
        <Grid>
          <MotionSample tier="fast" label={i18nKey("Fast · 80 ms")} />
          <MotionSample tier="moderate" label={i18nKey("Moderate · 160 ms")} />
          <MotionSample tier="slow" label={i18nKey("Slow · 240 ms")} />
        </Grid>
      </Panel>
    </>
  );
};

export default FoundationShowcase;
