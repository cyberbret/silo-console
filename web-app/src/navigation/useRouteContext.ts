// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useMemo } from "react";
import { useAppSelector } from "../store";
import { selSession } from "../screens/Console/consoleSlice";
import { selDistSet } from "../systemSlice";
import { hasPermission } from "../common/SecureComponent";
import type { RouteContext } from "./resolveRoute";

export const useRouteContext = (): RouteContext => {
  const session = useAppSelector(selSession);
  const distributedSetup = useAppSelector(selDistSet);
  return useMemo(
    () => ({
      features: session.features ?? [],
      distributedSetup,
      hasPermission,
    }),
    [session, distributedSetup],
  );
};
