// This file is part of MinIO Console Server
// Copyright (c) 2021 MinIO, Inc.
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

import React, {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Box, PageLayout, Tabs } from "mds";

import { configurationElements } from "../utils";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import ConfigurationForm from "./ConfigurationForm";
import { IAM_PAGES } from "../../../../common/SecureComponent/permissions";
import PageHeaderWrapper from "../../Common/PageHeaderWrapper/PageHeaderWrapper";
import ExportConfigButton from "./ExportConfigButton";
import ImportConfigButton from "./ImportConfigButton";

import { setErrorSnackMessage, setHelpName } from "../../../../systemSlice";
import { useAppDispatch } from "../../../../store";
import { api } from "../../../../api";
import { IElement } from "../types";
import { errorToHandler } from "../../../../api/errors";
import { i18nKey, interpolate, useLocalizedLink, useT } from "i18n";

const getRoutePath = (path: string) => {
  return `${IAM_PAGES.SETTINGS}/${path}`;
};

// region is not part of config subsystem list.
const NON_SUB_SYS_CONFIG_ITEMS = ["region"];
const IGNORED_CONFIG_SUB_SYS = ["cache"]; // cache config is not supported.

const ConfigurationOptions = () => {
  const { pathname = "" } = useLocation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const t = useT();
  const container = useRef<HTMLDivElement>(null);
  const [horizontalTabs, setHorizontalTabs] = useState(true);
  const localize = useLocalizedLink();

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    // The global sidebar also occupies tablet space. Choose the orientation
    // from this panel's available width, keeping tab keyboard behavior in sync.
    const measure = () => setHorizontalTabs(element.clientWidth < 760);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const [configSubSysList, setConfigSubSysList] = useState<string[]>([]);
  const fetchConfigSubSysList = useCallback(async () => {
    api.configs
      .listConfig() // get a list of available config subsystems.
      .then((res) => {
        if (res && res?.data && res?.data?.configurations) {
          const confSubSysList = (res?.data?.configurations || []).reduce(
            (acc: string[], { key = "" }) => {
              if (!IGNORED_CONFIG_SUB_SYS.includes(key)) {
                acc.push(key);
              }
              return acc;
            },
            [],
          );

          setConfigSubSysList(confSubSysList);
        }
      })
      .catch((err) => {
        dispatch(setErrorSnackMessage(errorToHandler(err)));
      });
  }, [dispatch]);

  useEffect(() => {
    fetchConfigSubSysList();
    dispatch(setHelpName("settings_Region"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableConfigSubSys = configurationElements.filter(
    ({ configuration_id }: IElement) => {
      return (
        NON_SUB_SYS_CONFIG_ITEMS.includes(configuration_id) ||
        configSubSysList.includes(configuration_id) ||
        !configSubSysList.length
      );
    },
  );

  return (
    <Fragment>
      <PageHeaderWrapper
        label={i18nKey("Configuration")}
        titleElement="h1"
        help
      />
      <PageLayout>
        <Box
          elementRef={container}
          id={"settings-container"}
          sx={{ width: "100%", minWidth: 0 }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <ImportConfigButton />
            <ExportConfigButton />
          </Box>
          <Tabs
            horizontal={horizontalTabs}
            sx={
              horizontalTabs
                ? { ".tabsPanels": { padding: "16px 0" } }
                : undefined
            }
            currentTabOrPath={pathname}
            onTabClick={(path) => {
              navigate(path);
            }}
            useRouteTabs
            options={availableConfigSubSys.map((element) => {
              const { configuration_id, configuration_label, icon } = element;
              return {
                tabConfig: {
                  id: `settings-tab-${configuration_label}`,
                  label: t(configuration_label),
                  value: configuration_id,
                  icon: icon,
                  to: getRoutePath(configuration_id),
                },
              };
            })}
            routes={
              <Routes>
                {availableConfigSubSys.map((element) => (
                  <Route
                    key={`configItem-${element.configuration_label}`}
                    path={`${element.configuration_id}`}
                    element={<ConfigurationForm />}
                  />
                ))}
                <Route
                  path={"/"}
                  element={<Navigate to={`${IAM_PAGES.SETTINGS}/region`} />}
                />
              </Routes>
            }
          />
        </Box>
        <Box
          sx={{
            marginTop: 16,
            color: "var(--muted-foreground)",
            fontSize: "var(--fs-body)",
            lineHeight: "var(--lh-body)",
            "& a": {
              textDecoration: "underline",
              textUnderlineOffset: 3,
            },
          }}
        >
          {interpolate(t("You can learn more at the {link}."), {
            link: (
              <a
                href={localize(
                  "https://silo.pgsty.com/reference/minio-server/settings/#minio-server-configuration-settings",
                )}
                target="_blank"
                rel="noopener"
              >
                {t("documentation")}
              </a>
            ),
          })}
        </Box>
      </PageLayout>
    </Fragment>
  );
};

export default ConfigurationOptions;
