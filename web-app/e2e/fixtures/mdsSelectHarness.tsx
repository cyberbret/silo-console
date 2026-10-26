// Copyright (c) 2026 PGSTY
// SPDX-License-Identifier: AGPL-3.0-or-later

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Select, ThemeHandler } from "mds";

export type NamingMode =
  | "label"
  | "explicit"
  | "explicit-only"
  | "fixed"
  | "placeholder"
  | "unlabelled"
  | "empty"
  | "disabled"
  | "rich";

declare global {
  interface Window {
    selectNamingFixture?: { mode: NamingMode; language: "en" | "zh" };
  }
}

function NamingHarness() {
  const { mode, language } = window.selectNamingFixture!;
  const zh = language === "zh";
  const [value, setValue] = useState(
    mode === "placeholder" || mode === "empty" ? "" : "all",
  );
  const field = zh ? "状态" : "Status";
  const all = zh ? "全部" : "All";
  // The public type accepts strings. JavaScript consumers can also render JSX;
  // accessible names must come from that DOM, never ReactNode string coercion.
  const rich = (text: string) =>
    (
      <span>
        <strong>{text}</strong>
        <span aria-hidden="true"> decorative</span>
      </span>
    ) as unknown as string;
  return (
    <ThemeHandler>
      <main style={{ maxWidth: 350, margin: 16 }}>
        <Select
          id="status"
          name="status"
          label={
            ["unlabelled", "explicit-only", "placeholder"].includes(mode)
              ? undefined
              : mode === "rich"
                ? rich(field)
                : field
          }
          aria-label={
            mode.startsWith("explicit")
              ? zh
                ? "账号状态"
                : "Account status"
              : undefined
          }
          fixedLabel={mode === "fixed" ? (zh ? "筛选" : "Filter") : undefined}
          placeholder={
            mode === "placeholder"
              ? zh
                ? "选择状态"
                : "Choose status"
              : undefined
          }
          disabled={mode === "disabled"}
          value={value}
          onChange={setValue}
          options={[
            { value: "all", label: mode === "rich" ? rich(all) : all },
            { value: "enabled", label: zh ? "已启用" : "Enabled" },
            {
              value: "disabled",
              label: zh ? "已禁用" : "Disabled",
              disabled: true,
            },
          ]}
        />
        <button id="after-status">After</button>
      </main>
    </ThemeHandler>
  );
}

function Harness() {
  const [value, setValue] = useState("");
  return (
    <ThemeHandler>
      <div style={{ width: 400, margin: 30 }}>
        <Select
          id="target"
          label="Target"
          placeholder="Choose target"
          value={value}
          onChange={(next) => setValue(next as string)}
          options={[
            { value: "first", label: "First" },
            { value: "second", label: "Second" },
            { value: "disabled", label: "Disabled", disabled: true },
            { value: "last", label: "Last" },
          ]}
        />
        <output id="chosen">{value}</output>
      </div>
    </ThemeHandler>
  );
}

createRoot(document.getElementById("root")!).render(
  window.selectNamingFixture ? <NamingHarness /> : <Harness />,
);
