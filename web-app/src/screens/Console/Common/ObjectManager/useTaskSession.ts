// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useCallback, useEffect, useRef } from "react";
import { captureTaskSession } from "../../ObjectBrowser/transferManager";

// Capture before asynchronous directory extraction, not when its onDrop
// finally runs. An old view cannot enqueue files into a later account/session.
export const useTaskSession = () => {
  const owner = useRef(captureTaskSession());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return useCallback(() => mounted.current && owner.current(), []);
};
