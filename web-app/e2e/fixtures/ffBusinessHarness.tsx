// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Provider, useSelector } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { KBarProvider, useRegisterActions, useKBar } from "kbar";
import { ThemeProvider } from "styled-components";
import { Button, DensityProvider, ModalBox } from "../../packages/mds/src";
import { lightTokens, tokenCssVariables } from "../../src/common/ui/tokens";
import { siloLightThemeOverrides } from "../../src/common/siloTheme";
import { ModalPresence } from "../../src/common/ui/ModalPresence";
import { store, AppState } from "../../src/store";
import { api } from "../../src/api";
import { globalSetDistributedSetup } from "../../src/systemSlice";
import CommandBar from "../../src/screens/Console/CommandBar";
import EditSiteEndPoint from "../../src/screens/Console/Configurations/SiteReplication/EditSiteEndPoint";
import ShareFile from "../../src/screens/Console/Buckets/ListBuckets/Objects/ObjectDetails/ShareFile";
import { ShareSubject } from "../../src/screens/Console/Buckets/ListBuckets/Objects/ObjectDetails/shareSubject";

const requests: {
  kind: string;
  signal?: AbortSignal | null;
  reject: (error: unknown) => void;
}[] = [];
api.buckets.listObjects = (_bucket, _query, params) =>
  new Promise((_resolve, reject) => {
    requests.push({ kind: "versions", signal: params?.signal, reject });
  });
api.buckets.shareObject = (_bucket, _query, params) =>
  new Promise((_resolve, reject) => {
    requests.push({ kind: "share", signal: params?.signal, reject });
  });
api.buckets.getMaxShareLinkExp = async () =>
  ({ data: { exp: 3600 } }) as Awaited<
    ReturnType<typeof api.buckets.getMaxShareLinkExp>
  >;
for (const [key, value] of Object.entries(tokenCssVariables(lightTokens)))
  document.documentElement.style.setProperty(key, value);
store.dispatch(globalSetDistributedSetup(true));

const Harness = () => {
  const debug = useKBar((state) => ({
    disabled: state.disabled,
    visualState: state.visualState,
    registered: Object.keys(state.actions),
  }));
  const [site, setSite] = useState<string | null>(null);
  const [siteCloses, setSiteCloses] = useState(0);
  const [siteSaves, setSiteSaves] = useState(0);
  const [subject, setSubject] = useState<ShareSubject | null>(null);
  const [modal, setModal] = useState(false);
  const [nested, setNested] = useState(false);
  const [actions, setActions] = useState(0);
  const message = useSelector(
    (state: AppState) => state.system.modalSnackBar.message,
  );
  useRegisterActions(
    [
      {
        id: "fixture-action",
        name: "Fixture action",
        shortcut: ["g", "b"],
        perform: () => setActions((n) => n + 1),
      },
    ],
    [],
  );
  return (
    <main>
      <CommandBar />
      <output id="kbar-state">
        {JSON.stringify({
          disabled: debug.disabled,
          visualState: debug.visualState,
          registered: debug.registered,
        })}
      </output>
      <output id="site-callbacks">
        {JSON.stringify({ siteCloses, siteSaves })}
      </output>
      <Button id="site-a" label="Edit site A" onClick={() => setSite("A")} />
      <Button id="site-b" label="Edit site B" onClick={() => setSite("B")} />
      <ModalPresence open={!!site}>
        {site && (
          <EditSiteEndPoint
            editSite={{
              name: site,
              endpoint: `https://${site.toLowerCase()}.example.com`,
              deploymentID: site,
            }}
            onClose={() => {
              setSiteCloses((n) => n + 1);
              setSite(null);
            }}
            onComplete={() => {
              setSiteSaves((n) => n + 1);
              setSite(null);
            }}
          />
        )}
      </ModalPresence>
      <output id="actions">{actions}</output>
      <output id="modal-message">{message}</output>
      <Button id="plain-focus" label="Focus target" />
      <Button
        id="open-business"
        label="Open dialog"
        onClick={() => setModal(true)}
      />
      <Button
        id="open-versions"
        label="Resolve version"
        onClick={() =>
          setSubject({
            bucket: "fixture",
            key: "first.txt",
            version: { kind: "latest" },
          })
        }
      />
      <Button
        id="open-share"
        label="Share target"
        onClick={() =>
          setSubject({ bucket: "fixture", key: "first.txt", versionId: "v1" })
        }
      />
      <Button
        id="reject-request"
        label="Reject pending"
        onClick={() =>
          requests
            .at(-1)
            ?.reject({ error: { message: "Late retained request" } })
        }
      />
      <Button
        id="request-audit"
        label="Audit requests"
        onClick={(event) => {
          event.currentTarget.dataset.requests = JSON.stringify(
            requests.map((r) => ({ kind: r.kind, aborted: r.signal?.aborted })),
          );
        }}
      />
      <ModalPresence open={!!subject}>
        {subject && (
          <ShareFile
            open
            subject={subject}
            closeModalAndRefresh={() => {
              setSubject(null);
              setModal(true);
            }}
          />
        )}
      </ModalPresence>
      <ModalBox open={modal} title="New dialog" onClose={() => setModal(false)}>
        <Button
          id="nested-business"
          label="Nested"
          onClick={() => setNested(true)}
        />
        <ModalBox
          open={nested}
          title="Nested dialog"
          onClose={() => setNested(false)}
        >
          <Button id="inner-focus" label="Inner focus" />
        </ModalBox>
      </ModalBox>
    </main>
  );
};
createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <MemoryRouter>
      <KBarProvider>
        <ThemeProvider theme={siloLightThemeOverrides}>
          <DensityProvider>
            <Harness />
          </DensityProvider>
        </ThemeProvider>
      </KBarProvider>
    </MemoryRouter>
  </Provider>,
);
