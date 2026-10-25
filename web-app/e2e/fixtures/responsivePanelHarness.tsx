// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import { ModalBox, Menu, useModalActive } from "../../packages/mds/src";
import { lightTokens, tokenCssVariables } from "../../src/common/ui/tokens";
import { siloLightThemeOverrides } from "../../src/common/siloTheme";
import { useMobile } from "../../src/common/ui/useMediaQuery";
for (const [name, value] of Object.entries(tokenCssVariables(lightTokens)))
  document.documentElement.style.setProperty(name, value);
let mounts = 0;
function Owner() {
  const [draft, setDraft] = useState("");
  const [nested, setNested] = useState(false);
  useEffect(() => {
    mounts++;
  }, []);
  return (
    <>
      <input
        aria-label="Detail draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button id="specific-detail" onClick={() => setNested(true)}>
        Edit captured target
      </button>
      {nested && (
        <ModalBox open title="Nested edit" onClose={() => setNested(false)}>
          <input
            id="nested-draft"
            aria-label="Nested draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button id="nested-close" onClick={() => setNested(false)}>
            Cancel nested
          </button>
        </ModalBox>
      )}
      <output id="owner-mounts">{mounts}</output>
    </>
  );
}
function Harness() {
  const mobile = useMobile();
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const active = useModalActive();
  return (
    <ThemeProvider theme={siloLightThemeOverrides}>
      <button id="open-panel" onClick={() => setOpen(true)}>
        Open panel
      </button>
      <output id="modal-active">{String(active)}</output>
      <button id="open-drawer" onClick={() => setDrawer(true)}>
        Open drawer
      </button>
      <Menu
        isOpen
        collapseAction={() => setDrawer(false)}
        mobileMode="auto"
        mobileOpen={drawer}
        onMobileOpenChange={setDrawer}
        mobileLabel="Navigation"
        callPathAction={() => {}}
        currentPath="/a"
        options={[]}
      />
      <ModalBox
        inline={!mobile}
        open={open}
        title="Details"
        onClose={() => setOpen(false)}
        sx={
          mobile
            ? {
                "& .modalContainer": {
                  width: "100%",
                  maxWidth: "100%",
                  height: "100dvh",
                  maxHeight: "100dvh",
                  borderRadius: 0,
                },
              }
            : undefined
        }
      >
        <Owner />
      </ModalBox>
    </ThemeProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
