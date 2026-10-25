// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import {
  Autocomplete,
  Select,
  Button,
  Checkbox,
  CommentBox,
  InputBox,
  ModalBox,
  RadioGroup,
  Switch,
  Tooltip,
  DensityProvider,
  AlertCloseIcon,
  useModalActive,
} from "../../packages/mds/src";
import {
  darkTokens,
  lightTokens,
  tokenCssVariables,
} from "../../src/common/ui/tokens";
import { siloLightThemeOverrides } from "../../src/common/siloTheme";
import { ModalPresence } from "../../src/common/ui/ModalPresence";
const CapturedDialog = ({
  name,
  onClose,
  onMount,
  onUnmount,
}: {
  name: string;
  onClose: () => void;
  onMount: () => void;
  onUnmount: () => void;
}) => {
  const [draft, setDraft] = useState(name);
  useEffect(() => {
    onMount();
    return onUnmount;
  }, []);
  return (
    <ModalBox open title="Captured dialog" onClose={onClose}>
      <p id="captured-name">{name}</p>
      <InputBox
        id="captured-draft"
        label="Draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <Button id="close-captured" label="Close captured" onClick={onClose} />
    </ModalBox>
  );
};
const theme = (dark: boolean) => {
  for (const [name, value] of Object.entries(
    tokenCssVariables(dark ? darkTokens : lightTokens),
  ))
    document.documentElement.style.setProperty(name, value);
};
theme(false);
const Harness = () => {
  const [choice, setChoice] = useState("alpha");
  const choices = [
    { value: "disabled", label: "Disabled", disabled: true },
    { value: "alpha", label: "Alpha", icon: <span data-choice-icon="alpha" /> },
    { value: "beta", label: "Beta", icon: <span data-choice-icon="beta" /> },
  ];
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [radio, setRadio] = useState("one");
  const [modal, setModal] = useState(false);
  const [child, setChild] = useState(false);
  const [sibling, setSibling] = useState(false);
  const [compactOpen, setCompactOpen] = useState(false);
  const [captured, setCaptured] = useState<{ name: string } | null>(null);
  const [generation, setGeneration] = useState(0);
  const [mounts, setMounts] = useState(0);
  const [unmounts, setUnmounts] = useState(0);
  const [closes, setCloses] = useState(0);
  const modalActive = useModalActive();
  return (
    <ThemeProvider theme={siloLightThemeOverrides}>
      <DensityProvider>
        <main
          style={{
            padding: 32,
            background: "var(--surface-1)",
            color: "var(--foreground)",
            display: "grid",
            gap: 16,
          }}
        >
          <output id="modal-audit">
            {JSON.stringify({ mounts, unmounts, closes, modalActive })}
          </output>
          <Button
            id="open-captured"
            label="Open captured"
            onClick={() => {
              setGeneration(generation + 1);
              setCaptured({ name: `Captured ${generation + 1}` });
            }}
          />
          <ModalPresence open={!!captured}>
            {captured && (
              <CapturedDialog
                name={captured.name}
                onClose={() => {
                  setCloses((value) => value + 1);
                  setCaptured(null);
                }}
                onMount={() => setMounts((value) => value + 1)}
                onUnmount={() => setUnmounts((value) => value + 1)}
              />
            )}
          </ModalPresence>
          <button id="theme" onClick={() => theme(true)}>
            Dark
          </button>
          <Button
            id="press80"
            variant="primary"
            sx={{ width: 80 }}
            label="Save"
          />
          <Button
            id="press400"
            variant="primary"
            sx={{ width: 400 }}
            label="Save changes"
          />
          <Button
            id="loading"
            variant="primary"
            loading={loading}
            label="Save these changes"
          />
          <button
            id="toggle-loading"
            onClick={() => setLoading((value) => !value)}
          >
            Toggle loading
          </button>
          <div style={{ display: "flex", gap: 16 }}>
            {(
              [
                "primary",
                "secondary",
                "outline",
                "ghost",
                "danger",
                "danger-fill",
              ] as const
            ).map((variant) => (
              <Button
                key={variant}
                id={`variant-${variant}`}
                variant={variant}
                label={variant}
              />
            ))}
            <Button id="variant-disabled" label="Disabled" disabled />
          </div>
          <InputBox id="field" label="Name" error="Enter a name" />
          <InputBox
            id="disabled-placeholder"
            label="Disabled"
            disabled
            placeholder="Name"
          />
          <CommentBox
            id="disabled-textarea"
            label="Disabled description"
            disabled
            placeholder="Description"
          />
          <InputBox
            id="password-error"
            label="Password"
            type="password"
            error="Enter a password"
          />
          <Checkbox
            id="check"
            label="Enabled"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
          <Switch
            id="switch"
            label="Switch"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
          <Switch
            id="uncontrolled-switch"
            label="Uncontrolled switch"
            defaultChecked
          />
          <RadioGroup
            id="radios"
            name="radios"
            label="Mode"
            currentValue={radio}
            selectorOptions={[
              { value: "one", label: "One" },
              { value: "two", label: "Two" },
            ]}
            onChange={(event) => setRadio(event.target.value)}
          />
          <div style={{ display: "flex", gap: 16 }}>
            <Tooltip tooltip="First tooltip">
              <Button id="tip1" label="First" />
            </Tooltip>
            <Tooltip tooltip="Second tooltip">
              <Button id="tip2" label="Second" />
            </Tooltip>
          </div>
          <Select
            id="select"
            label="Choice"
            options={choices}
            value={choice}
            onChange={setChoice}
          />
          <Button id="after-select" label="After select" />
          <Autocomplete
            id="autocomplete"
            label="Search choice"
            options={choices}
            value={choice}
            onChange={setChoice}
          />
          <Button id="after-autocomplete" label="After autocomplete" />
          <Button
            id="reset-choice"
            label="Reset choice"
            onClick={() => setChoice("alpha")}
          />
          <Button id="open" label="Open" onClick={() => setModal(true)} />
          <ModalBox
            open={modal}
            title="Parent dialog"
            onClose={() => setModal(false)}
          >
            <InputBox id="modal-input" label="Name" />
            <Select
              id="modal-select"
              label="Modal choice"
              options={choices}
              value={choice}
              onChange={setChoice}
            />
            <Button
              id="open-child"
              label="Child"
              onClick={() => setChild(true)}
            />
            <Button
              id="open-sibling"
              label="Sibling"
              onClick={() => setSibling(true)}
            />
            <Tooltip tooltip="Close this dialog">
              <Button
                id="tooltip-parent-close"
                label="Close tooltip parent"
                onClick={() => setModal(false)}
              />
            </Tooltip>
            <Button
              id="close-parent"
              label="Close parent"
              onClick={() => setModal(false)}
            />
            <ModalBox
              open={child}
              title="Child dialog"
              size="sm"
              onClose={() => setChild(false)}
            >
              <Button
                id="close-child"
                label="Close child"
                onClick={() => setChild(false)}
              />
            </ModalBox>
          </ModalBox>
          <ModalBox
            open={sibling}
            title="Sibling dialog"
            onClose={() => setSibling(false)}
          >
            <Button
              id="close-underlying"
              label="Close underlying"
              onClick={() => setModal(false)}
            />
          </ModalBox>
          <dialog id="native-dialog">
            <Tooltip tooltip="Native tooltip">
              <button id="native-tooltip">Native trigger</button>
            </Tooltip>
          </dialog>
          <DensityProvider density="compact">
            <Button id="compact" label="Compact" />
            <Switch id="compact-switch" label="Compact switch" defaultChecked />
            <InputBox id="compact-field" label="Compact field" />
            <Button
              id="open-compact"
              label="Open compact"
              onClick={() => setCompactOpen(true)}
            />
            <ModalBox
              open={compactOpen}
              title="Compact dialog"
              size="sm"
              titleIcon={<AlertCloseIcon />}
              iconColor="delete"
              onClose={() => setCompactOpen(false)}
            >
              <p id="compact-copy">Raw compact copy</p>
            </ModalBox>
          </DensityProvider>
        </main>
      </DensityProvider>
    </ThemeProvider>
  );
};
createRoot(document.getElementById("root")!).render(<Harness />);
