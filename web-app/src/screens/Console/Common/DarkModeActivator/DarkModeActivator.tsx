// This file is part of MinIO Console Server
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

import React from "react";
import { DarkModeIcon, LightModeIcon } from "mds";
import { useSelector } from "react-redux";
import { AppState, useAppDispatch } from "../../../../store";
import { setDarkMode } from "../../../../systemSlice";
import { storeDarkMode } from "../../../../utils/stylesUtils";
import { useT } from "i18n";
import HeaderIconButton from "../PageHeaderWrapper/HeaderIconButton";

export const useThemeAction = () => {
  const dispatch = useAppDispatch();
  const t = useT();

  const darkMode = useSelector((state: AppState) => state.system.darkMode);

  const darkModeActivator = () => {
    const currentStatus = !!darkMode;

    dispatch(setDarkMode(!currentStatus));
    storeDarkMode(!currentStatus ? "on" : "off");
  };

  return {
    label: darkMode ? t("Switch to light mode") : t("Switch to dark mode"),
    onClick: darkModeActivator,
    icon: darkMode ? <LightModeIcon /> : <DarkModeIcon />,
  };
};

const DarkModeActivator = () => {
  const action = useThemeAction();
  return (
    <HeaderIconButton
      id={"dark-mode-activator"}
      aria-label={action.label}
      onClick={action.onClick}
    >
      {action.icon}
    </HeaderIconButton>
  );
};

export default DarkModeActivator;
