// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useAdminInfo } from "../../src/screens/Console/Overview/useAdminInfo";
import { requests } from "./overviewApiStub";
import type { AdminInfoResponse } from "../../src/api/consoleApi";

declare global {
  interface Window {
    overviewHarness: {
      requests: typeof requests;
      resolve: (index: number, data: AdminInfoResponse) => void;
      hide: (hidden: boolean) => void;
    };
  }
}
let hidden = false;
Object.defineProperty(document, "visibilityState", {
  configurable: true,
  get: () => (hidden ? "hidden" : "visible"),
});
window.overviewHarness = {
  requests,
  resolve: (index, data) => requests[index].resolve(data),
  hide: (next) => {
    hidden = next;
    document.dispatchEvent(new Event("visibilitychange"));
  },
};
function Probe() {
  const { data, error, refreshing, refresh } = useAdminInfo({
    refreshMs: 1000,
  });
  return (
    <>
      <button id="refresh" onClick={() => void refresh()}>
        Refresh
      </button>
      <output id="state">{JSON.stringify({ data, error, refreshing })}</output>
    </>
  );
}
function Harness() {
  const [mounted, setMounted] = useState(true);
  return (
    <>
      <button id="mount" onClick={() => setMounted(!mounted)}>
        Toggle mount
      </button>
      {mounted && <Probe />}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
