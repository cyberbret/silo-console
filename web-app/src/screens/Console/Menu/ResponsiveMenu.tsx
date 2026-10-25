// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { createContext, useContext, useEffect, useState } from "react";
import { useMobile } from "common/ui/useMediaQuery";
import { useOverlayIntent } from "common/ui/overlayIntent";

const Context = createContext({
  available: false,
  mobile: false,
  open: false,
  setOpen: (_open: boolean) => {},
});
export const useResponsiveMenu = () => useContext(Context);
export function ResponsiveMenuProvider({
  available,
  children,
}: {
  available: boolean;
  children: React.ReactNode;
}) {
  const mobile = useMobile();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!mobile || !available) setOpen(false);
  }, [mobile, available]);
  useOverlayIntent(available && mobile && open);
  return (
    <Context.Provider
      value={{ available, mobile, open: available && mobile && open, setOpen }}
    >
      {children}
    </Context.Provider>
  );
}
