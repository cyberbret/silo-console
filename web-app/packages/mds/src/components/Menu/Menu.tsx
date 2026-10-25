// This file is part of MinIO Design System
// Copyright (c) 2023 MinIO, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import React, { FC, useEffect, useState } from "react";
import { MenuProps } from "./Menu.types";
import HorizontalMenu from "./Horizontal/HorizontalMenu";
import VerticalMenu from "./Vertical/VerticalMenu";
import MobileMenu from "./MobileMenu/MobileMenu";
import MobileDrawer from "./MobileMenu/MobileDrawer";

const Menu: FC<MenuProps> = ({
  horizontal = false,
  mobileModeAuto = false,
  mobileMode,
  ...props
}) => {
  const [smallScreen, setSmallScreen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767.98px)");
    const update = () => setSmallScreen(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (smallScreen && mobileMode === "auto") {
    return <MobileDrawer {...props} />;
  }

  // Keep the explicitly requested legacy mobile header API available.
  if (smallScreen && mobileMode === undefined && mobileModeAuto) {
    return <MobileMenu {...props} />;
  }

  if (horizontal) {
    return <HorizontalMenu {...props} />;
  }

  return <VerticalMenu {...props} />;
};

export default Menu;
