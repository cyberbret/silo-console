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
import { useSelector } from "react-redux";
import { Box, DocumentationIcon, LicenseIcon, Menu, MenuItem } from "mds";
import { AppState, useAppDispatch } from "../../../store";
import { menuOptions } from "../../../navigation/menu";
import { useRouteContext } from "../../../navigation/useRouteContext";
import { useRecentBuckets } from "../../../navigation/RecentBucketsProvider";
import { menuOpen } from "../../../systemSlice";
import { useLocation, useNavigate } from "react-router-dom";
import { IAM_PAGES } from "../../../common/SecureComponent/permissions";
import { SiloBrand } from "../../../common/SiloBrand";
import { useLocalizedLink, useT } from "i18n";

import { useResponsiveMenu } from "./ResponsiveMenu";

const MenuWrapper = () => {
  const responsive = useResponsiveMenu();
  const dispatch = useAppDispatch();
  const context = useRouteContext();
  const { recent } = useRecentBuckets();
  const navigate = useNavigate();
  const { pathname = "" } = useLocation();
  const t = useT();
  const localize = useLocalizedLink();

  const sidebarOpen = useSelector(
    (state: AppState) => state.system.sidebarOpen,
  );

  const allowedMenuItems = menuOptions(
    context,
    recent,
    sidebarOpen || responsive.mobile,
    t,
    pathname,
  );

  return (
    <Menu
      isOpen={sidebarOpen}
      options={allowedMenuItems}
      brandMark={<SiloBrand variant="emblem" width={28} height={28} />}
      logo={
        <SiloBrand
          variant="wordmark"
          alt=""
          height={20}
          style={{ width: "auto", display: "block" }}
        />
      }
      signOutLabel={t("Sign Out")}
      collapseLabel={t("Collapse menu")}
      expandLabel={t("Expand menu")}
      mobileLabel={t("Menu")}
      callPathAction={(path) => {
        responsive.setOpen(false);
        navigate(path);
      }}
      signOutAction={() => {
        responsive.setOpen(false);
        navigate("/logout");
      }}
      collapseAction={() => {
        dispatch(menuOpen(!sidebarOpen));
      }}
      currentPath={pathname}
      mobileMode="auto"
      mobileOpen={responsive.open}
      onMobileOpenChange={responsive.setOpen}
      endComponent={
        <Box
          sx={{
            display: "grid",
            width: "100%",
          }}
        >
          <MenuItem
            name={t("Documentation")}
            icon={<DocumentationIcon />}
            path={localize("https://silo.pgsty.com/docs/")}
            visibleTooltip={!sidebarOpen}
            id="menu-documentation"
          />
          <MenuItem
            name={t("License")}
            icon={<LicenseIcon />}
            path={IAM_PAGES.LICENSE}
            onClick={() => {
              responsive.setOpen(false);
              navigate(IAM_PAGES.LICENSE);
            }}
            visibleTooltip={!sidebarOpen}
            id="menu-license"
          />
        </Box>
      }
    />
  );
};

export default MenuWrapper;
