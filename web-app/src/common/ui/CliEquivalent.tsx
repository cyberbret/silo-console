// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useEffect, useState } from "react";
import { CodeIcon, CopyIcon } from "mds";
import { CopyToClipboard } from "react-copy-to-clipboard";
import styled from "styled-components";
import { formatText, useT } from "i18n";
import { ActionIcon, Hint } from "./shared";
import { typography } from "./typography";

const Panel = styled.details`
  ${typography.body}
  border: 1px solid var(--silo-border);
  border-radius: var(--silo-radius-card);
  background: var(--silo-surface);
  color: var(--silo-text);
  overflow: hidden;
  summary {
    cursor: pointer;
    padding: var(--silo-space-16);
  }
  summary > span {
    display: inline-flex;
    align-items: center;
    gap: var(--silo-space-8);
    vertical-align: middle;
  }
  summary svg {
    width: 16px;
    height: 16px;
    fill: var(--silo-text-secondary);
    color: var(--silo-text-secondary);
  }
`;
const Content = styled.div`
  padding: 0 var(--silo-space-16) var(--silo-space-16);
`;
const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--silo-space-8);
  ${typography.caption}
  color: var(--silo-text-secondary);
`;
const Commands = styled.pre`
  ${typography.small}
  font-family: var(--font-mono);
  background: var(--silo-bg);
  border: 1px solid var(--silo-border);
  border-radius: var(--silo-radius-input);
  padding: var(--silo-space-12);
  margin: var(--silo-space-8) 0;
  overflow-x: auto;
  white-space: pre;
  font-variant-numeric: tabular-nums;
`;
const Caption = styled.p`
  ${typography.caption} margin: 0;
  color: var(--silo-text-secondary);
`;

// Commands are copied exactly as supplied; alias is explanatory metadata, not
// an unsafe string substitution into shell commands.
export const CliEquivalent = ({
  commands,
  alias,
  open,
  onToggle,
}: {
  commands: string[];
  alias?: string;
  open?: boolean;
  onToggle?: (open: boolean) => void;
}) => {
  const t = useT();
  const [copied, setCopied] = useState<boolean | null>(null);
  const code = commands.join("\n");
  useEffect(() => setCopied(null), [code]);
  useEffect(() => {
    if (copied === null) return;
    const timer = window.setTimeout(() => setCopied(null), 3000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <Panel
      open={open}
      onToggle={(event) => onToggle?.(event.currentTarget.open)}
    >
      <summary>
        <span>
          <CodeIcon aria-hidden="true" />
          {t("Equivalent mcli command")}
        </span>
      </summary>
      <Content>
        <Toolbar>
          <span role="status">
            {copied === null
              ? ""
              : copied
                ? t("Copied")
                : t("Copy failed. Select and copy the command.")}
          </span>
          <CopyToClipboard
            text={code}
            onCopy={(_, success) => setCopied(success)}
          >
            <span>
              <Hint text={t("Copy commands")}>
                <ActionIcon type="button" aria-label={t("Copy commands")}>
                  <CopyIcon aria-hidden="true" />
                </ActionIcon>
              </Hint>
            </span>
          </CopyToClipboard>
        </Toolbar>
        <Commands tabIndex={0}>
          <code>{code}</code>
        </Commands>
        <Caption>
          {alias
            ? formatText(
                t(
                  "Replace ALIAS with your configured mcli alias (for example, {alias}).",
                ),
                { alias },
              )
            : t("Replace ALIAS with your configured mcli alias.")}
        </Caption>
      </Content>
    </Panel>
  );
};
