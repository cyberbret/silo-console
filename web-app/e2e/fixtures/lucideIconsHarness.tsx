// Copyright (c) 2026 PGSTY
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  GlobalStyles,
  IconButton,
  Select,
  ThemeHandler,
  AddIcon,
  CheckCircleIcon,
  ConfirmModalIcon,
  DownloadIcon,
  HelpIcon,
  MenuToggleIcon,
  RefreshIcon,
} from "mds";
import DirectRefresh from "../../packages/mds/src/components/Icons/RefreshIcon";
import DirectCollapse from "../../packages/mds/src/components/Icons/CollapseIcon";
import LanguageToggleIcon from "../../src/icons/LanguageToggleIcon";
import EncryptionIcon from "../../src/icons/SidebarMenus/EncryptionIcon";

function Harness() {
  const [dark, setDark] = useState(false);
  const [clicks, setClicks] = useState(0);
  const ref = useRef<SVGSVGElement>(null);
  return (
    <ThemeHandler darkMode={dark}>
      <GlobalStyles />
      <main style={{ padding: 24, color: dark ? "#e8e8e8" : "#242424" }}>
        <style>{`
          .fixture-row { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
          .legacy-fill svg { fill: rgb(200, 10, 30); }
          .host-width svg { width: 40px; }
          .css-stroke svg { stroke: rgb(10, 90, 180); stroke-width: 3; }
        `}</style>
        <h1>Icon compatibility</h1>
        <button id="theme" onClick={() => setDark(!dark)}>
          Change theme
        </button>
        <div className="fixture-row legacy-fill" id="themed">
          <RefreshIcon data-testid="default" />
          <LanguageToggleIcon />
          <EncryptionIcon />
          <DirectRefresh />
        </div>
        <div className="fixture-row legacy-fill">
          <RefreshIcon
            data-testid="attribute-stroke"
            stroke="#1a8c48"
            strokeWidth={3}
          />
          <RefreshIcon
            data-testid="style-stroke"
            stroke="#1a8c48"
            strokeWidth={3}
            style={{ stroke: "#7b2ca4", strokeWidth: 4 }}
          />
          <span className="css-stroke">
            <RefreshIcon data-testid="css-stroke" />
          </span>
          <CheckCircleIcon data-testid="success" style={{ color: "#16803c" }} />
        </div>
        <div className="fixture-row" id="dimensions">
          <DownloadIcon data-testid="width-12" style={{ width: 12 }} />
          <DownloadIcon data-testid="width-45" style={{ width: 45 }} />
          <span className="host-width">
            <DownloadIcon data-testid="width-40" />
          </span>
          <DownloadIcon
            data-testid="explicit-size"
            style={{ width: 20, height: 28 }}
          />
          <DownloadIcon
            data-testid="attribute-size"
            width={40}
            height={30}
            className="caller-class"
          />
        </div>
        <div className="fixture-row" id="names">
          <Button id="action" icon={<AddIcon />}>
            Add item
          </Button>
          <IconButton
            id="refresh-action"
            aria-label="Refresh list"
            onClick={() => setClicks(clicks + 1)}
          >
            <RefreshIcon />
          </IconButton>
          <HelpIcon aria-label="Help image" />
          <HelpIcon aria-labelledby="external-name" />
          <span id="external-name">External image name</span>
          <HelpIcon title="Title image" />
          <HelpIcon>
            <title>Child title image</title>
          </HelpIcon>
          <HelpIcon role="presentation" data-testid="presentational" />
          <RefreshIcon aria-label="Explicitly hidden" aria-hidden="true" />
          <RefreshIcon
            ref={ref}
            data-testid="ref"
            className="caller-hook"
            style={{ opacity: 0.8 }}
            onClick={() => setClicks(clicks + 1)}
          />
          <button
            id="inspect-ref"
            onClick={() => setClicks(ref.current?.tagName === "svg" ? 100 : -1)}
          >
            Inspect ref
          </button>
          <output id="clicks">{clicks}</output>
        </div>
        <div className="fixture-row" id="controls">
          <Select
            id="region"
            label="Region"
            value="east"
            options={[{ label: "East", value: "east" }]}
            onChange={() => undefined}
          />
          <ConfirmModalIcon
            data-testid="valid-rule"
            style={{ color: "#16803c" }}
          />
          <MenuToggleIcon data-testid="mobile-menu" />
          <DirectCollapse data-testid="legacy-mobile-menu" />
        </div>
        <output id="same-export">
          {String(DirectRefresh === RefreshIcon)}
        </output>
      </main>
    </ThemeHandler>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
