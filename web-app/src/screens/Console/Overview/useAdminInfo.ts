// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "api";
import type { AdminInfoResponse } from "../../../api/consoleApi";

const requestInfo = async (signal: AbortSignal) =>
  (await api.admin.adminInfo({ defaultOnly: true }, { signal })).data;

export const useAdminInfo = ({
  refreshMs = 60000,
}: {
  refreshMs?: number;
} = {}) => {
  const [state, setState] = useState<{
    data?: AdminInfoResponse;
    refreshing: boolean;
    error: boolean;
  }>({ refreshing: true, error: false });
  const pending = useRef<AbortController>();
  const generation = useRef(0);
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    if (!mounted.current) return;
    const current = ++generation.current;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setState((previous) => ({ ...previous, refreshing: true, error: false }));
    const isCurrent = () =>
      mounted.current &&
      current === generation.current &&
      !controller.signal.aborted;
    try {
      const data = await requestInfo(controller.signal);
      if (!data || typeof data !== "object")
        throw new Error("Invalid admin info response");
      if (isCurrent()) setState({ data, refreshing: false, error: false });
    } catch {
      if (isCurrent())
        setState((previous) => ({
          ...previous,
          refreshing: false,
          error: true,
        }));
    } finally {
      if (current === generation.current) pending.current = undefined;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    let timer: ReturnType<typeof setInterval> | undefined;
    const schedule = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
      if (document.visibilityState === "visible" && refreshMs > 0) {
        timer = setInterval(() => {
          // Also check at dispatch time: visibility can change before its
          // event is delivered, or while a timer callback is already queued.
          if (document.visibilityState === "visible") void refresh();
        }, refreshMs);
      }
    };
    const visibilityChanged = () => {
      schedule();
      if (document.visibilityState === "visible") void refresh();
    };
    schedule();
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      mounted.current = false;
      generation.current++;
      pending.current?.abort();
      pending.current = undefined;
      if (timer !== undefined) clearInterval(timer);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [refresh, refreshMs]);

  return { ...state, refresh };
};
