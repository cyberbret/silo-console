// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { interpolate, useT } from "i18n";
import { CliEquivalent } from "common/ui/CliEquivalent";
import { typography } from "common/ui/typography";

const storageKey = "silo.cliEquivalent.open";
const changeEvent = "silo:cli-equivalent-toggle";
// Shell syntax is invariant across UI languages.
const aliasSetup =
  "mcli alias set ALIAS https://silo.example.com ACCESS_KEY SECRET_KEY";

const Container = styled.div`
  min-width: 0;
  width: 100%;
  margin-block: var(--silo-space-16);
`;

const Caption = styled.p`
  ${typography.caption}
  color: var(--silo-text-secondary);
  margin: var(--silo-space-8) 0 0;
  overflow-wrap: anywhere;
  code {
    font-family: var(--font-mono, monospace);
  }
`;

const PolicyDocument = styled.pre`
  ${typography.small}
  font-family: var(--font-mono, monospace);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 240px;
  overflow: auto;
  padding: var(--silo-space-12);
  background: var(--silo-bg);
  border: 1px solid var(--silo-border);
  border-radius: var(--silo-radius-input);
`;

export const PolicyFileNote = () => {
  const t = useT();
  return <Caption>{t("Save the JSON below as policy.json.")}</Caption>;
};

const readOpenState = () => {
  try {
    return localStorage.getItem(storageKey) === "true";
  } catch {
    return false;
  }
};

export const FormCliEquivalent = ({
  commands,
  notes = [],
  emptyMessage,
  policyJSON,
}: {
  commands: string[];
  notes?: string[];
  emptyMessage?: string;
  policyJSON?: string;
}) => {
  const t = useT();
  const [open, setOpen] = useState(readOpenState);

  useEffect(() => {
    const restore = () => setOpen(readOpenState());
    window.addEventListener(changeEvent, restore);
    window.addEventListener("storage", restore);
    return () => {
      window.removeEventListener(changeEvent, restore);
      window.removeEventListener("storage", restore);
    };
  }, []);

  const persist = (nextOpen: boolean) => {
    setOpen(nextOpen);
    try {
      const value = String(nextOpen);
      if (localStorage.getItem(storageKey) !== value) {
        localStorage.setItem(storageKey, value);
        window.dispatchEvent(new Event(changeEvent));
      }
    } catch {
      // Do not prevent operators from using the panel without storage.
    }
  };

  return (
    <Container>
      <CliEquivalent
        open={open}
        onToggle={persist}
        commands={
          commands.length
            ? commands
            : [
                `# ${emptyMessage || t("Complete the form to see the command.")}`,
              ]
        }
      />
      {open && (
        <>
          <Caption>
            {interpolate(
              t("For example, create your mcli alias with {command}."),
              {
                command: <code>{aliasSetup}</code>,
              },
            )}
          </Caption>
          {notes.map((note) => (
            <Caption key={note}>{note}</Caption>
          ))}
          {policyJSON !== undefined && (
            <>
              <PolicyFileNote />
              <PolicyDocument tabIndex={0}>
                <code>{policyJSON}</code>
              </PolicyDocument>
            </>
          )}
        </>
      )}
    </Container>
  );
};
