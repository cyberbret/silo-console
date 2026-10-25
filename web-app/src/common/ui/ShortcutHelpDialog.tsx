// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import { ModalBox, type } from "mds";
import styled from "styled-components";
import { useT, i18nKey } from "i18n";
const List = styled.dl`
  ${type("body")}
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 20px;
  margin: 16px 0 0;
  dt {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }
  dd {
    margin: 0;
    color: var(--muted-foreground);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 4px;
    dd {
      margin-bottom: 8px;
    }
  }
`;
const bindings = [
  ["↑ / ↓ · Home / End", i18nKey("Move through objects")],
  ["PageUp / PageDown", i18nKey("Move one visible page")],
  ["Enter", i18nKey("Open folder or object details")],
  ["Backspace / Alt+↑", i18nKey("Go to parent folder within this bucket")],
  ["Space", i18nKey("Toggle object selection")],
  ["Shift+↑ / Shift+↓ · Shift+click", i18nKey("Extend selection range")],
  ["Ctrl/⌘+click", i18nKey("Toggle object selection")],
  ["Ctrl/⌘+A", i18nKey("Select all objects on the current page")],
  ["Escape", i18nKey("Close menu, clear selection or close details")],
  ["/", i18nKey("Focus object filter")],
  ["p", i18nKey("Preview the focused object when available")],
  ["Shift+F10 / ContextMenu", i18nKey("Open object actions")],
  ["?", i18nKey("Keyboard shortcuts")],
];
export default function ShortcutHelpDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const t = useT();
  return (
    <ModalBox
      open
      title={t("Keyboard shortcuts")}
      closeLabel={t("Close")}
      onClose={onClose}
      size="lg"
    >
      <p>
        {t(
          "Object browser shortcuts are available while browsing objects. They pause while typing or using a dialog.",
        )}
      </p>
      <List>
        {bindings.map(([key, description]) => (
          <React.Fragment key={key}>
            <dt>{key}</dt>
            <dd>{t(description)}</dd>
          </React.Fragment>
        ))}
      </List>
    </ModalBox>
  );
}
