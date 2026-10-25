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

import { ModalPresence } from "common/ui/ModalPresence";
import React, { Fragment, useState } from "react";
import styled from "styled-components";
import {
  Box,
  breakPoints,
  Button,
  PageLayout,
  ProgressBar,
  SyncIcon,
  TabItemProps,
  Tabs,
} from "mds";
import { IDashboardPanel } from "./types";
import { panelsConfiguration } from "./utils";
import { componentToUse } from "./widgetUtils";
import { useAppDispatch, useAppSelector } from "../../../../store";
import {
  DLayoutColumnProps,
  DLayoutRowProps,
  resourcesPanelsLayout,
  resourcesPanelsLayoutAdvanced,
  RowPanelLayout,
  summaryPanelsLayout,
  trafficPanelsLayout,
} from "./Widgets/LayoutUtil";
import { getUsageAsync } from "../dashboardThunks";
import { reloadWidgets } from "../dashboardSlice";
import { selFeatures } from "../../consoleSlice";
import { AdminInfoResponse } from "api/consoleApi";
import ZoomWidget from "./ZoomWidget";
import DateRangeSelector from "../../Common/FormComponents/DateRangeSelector/DateRangeSelector";
import MergedWidgetsRenderer from "./Widgets/MergedWidgetsRenderer";
import BasicDashboard from "../BasicDashboard/BasicDashboard";
import { useT } from "i18n";
import PrometheusGuidance from "./PrometheusGuidance";

interface IPrDashboard {
  apiPrefix?: string;
  usage: AdminInfoResponse | null;
}

const SectionHeader = styled.h2({
  margin: 0,
  fontSize: "var(--fs-title)",
  lineHeight: "var(--lh-title)",
  fontWeight: 550,
  color: "var(--foreground)",
});

const PrDashboard = ({ apiPrefix = "admin", usage }: IPrDashboard) => {
  const dispatch = useAppDispatch();
  const t = useT();
  const status = useAppSelector((state) => state.dashboard.status);
  const zoomOpen = useAppSelector((state) => state.dashboard.zoom.openZoom);
  const zoomWidget = useAppSelector(
    (state) => state.dashboard.zoom.widgetRender,
  );
  const features = useAppSelector(selFeatures);
  const obOnly = !!features?.includes("object-browser-only");
  let hideMenu = false;
  if (features?.includes("hide-menu")) {
    hideMenu = true;
  } else if (obOnly) {
    hideMenu = true;
  }

  const [timeStart, setTimeStart] = useState<any>(null);
  const [timeEnd, setTimeEnd] = useState<any>(null);
  const panelInformation = panelsConfiguration;
  const [curTab, setCurTab] = useState<string>("info");

  const getPanelDetails = (id: number) => {
    return panelInformation.find((panel) => panel.id === id);
  };

  const triggerLoad = () => {
    dispatch(reloadWidgets());
  };

  const renderCmpByConfig = (
    panelInfo: IDashboardPanel | undefined,
    key: string,
  ) => {
    return (
      <Fragment key={`widget-${key}`}>
        {panelInfo ? (
          <Fragment>
            <Box>
              {panelInfo.mergedPanels ? (
                <MergedWidgetsRenderer
                  info={panelInfo}
                  timeStart={timeStart}
                  timeEnd={timeEnd}
                  loading={true}
                  apiPrefix={apiPrefix}
                />
              ) : (
                componentToUse(
                  panelInfo,
                  timeStart,
                  timeEnd,
                  true,
                  apiPrefix,
                  zoomOpen,
                  t,
                )
              )}
            </Box>
          </Fragment>
        ) : null}
      </Fragment>
    );
  };

  const renderPanelItems = (layoutRows: DLayoutRowProps[]) => {
    return layoutRows.reduce((prev: any[], rowItem, rIdx) => {
      const { columns = [] } = rowItem;
      const cellItems: any[] = columns.map(
        (cellItem: DLayoutColumnProps, colIdx: number) => {
          const panelInfo = getPanelDetails(cellItem.componentId);
          return renderCmpByConfig(panelInfo, `${rIdx}-${colIdx}`);
        },
      );
      const rowConfig = (
        <Box sx={rowItem.sx} key={`layout-row-${rIdx}`}>
          {cellItems}
        </Box>
      );
      return [...prev, rowConfig];
    }, []);
  };

  const renderSummaryPanels = () => {
    return renderPanelItems(summaryPanelsLayout);
  };

  const renderTrafficPanels = () => {
    return renderPanelItems(trafficPanelsLayout);
  };

  const renderResourcesPanels = () => {
    return renderPanelItems(resourcesPanelsLayout);
  };

  const renderAdvancedResourcesPanels = () => {
    return renderPanelItems(resourcesPanelsLayoutAdvanced);
  };

  const searchBox = (
    <Box sx={{ marginBottom: 16 }}>
      {curTab === "info" ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <SectionHeader>{t("Server Information")}</SectionHeader>
          <Button
            id={"sync"}
            type="button"
            variant="regular"
            onClick={() => {
              dispatch(getUsageAsync());
            }}
            disabled={status === "loading"}
            icon={<SyncIcon />}
            label={t("Sync")}
          />
        </Box>
      ) : (
        <DateRangeSelector
          timeStart={timeStart}
          setTimeStart={setTimeStart}
          timeEnd={timeEnd}
          setTimeEnd={setTimeEnd}
          triggerSync={triggerLoad}
        />
      )}
    </Box>
  );

  const infoTab: TabItemProps = {
    tabConfig: { label: t("Info"), id: "info", disabled: false },
    content: (
      <Fragment>
        {(!usage || status === "loading") && <ProgressBar />}
        {usage && status === "idle" && (
          <Fragment>
            {searchBox}
            <BasicDashboard usage={usage} />
          </Fragment>
        )}
      </Fragment>
    ),
  };

  const renderMetrics = (content: React.ReactNode) => {
    if (!usage || status === "loading") return <ProgressBar />;
    const metricsStatus = usage.advancedMetricsStatus;
    if (metricsStatus === "not configured" || metricsStatus === "unavailable") {
      return (
        <PrometheusGuidance
          status={metricsStatus}
          onRetry={() => dispatch(getUsageAsync())}
        />
      );
    }
    return (
      <Fragment>
        {searchBox}
        <RowPanelLayout>{content}</RowPanelLayout>
      </Fragment>
    );
  };

  const prometheusTabs: TabItemProps[] = [
    {
      tabConfig: { label: t("Usage"), id: "usage" },
      content: renderMetrics(renderSummaryPanels()),
    },
    {
      tabConfig: { label: t("Traffic"), id: "traffic" },
      content: renderMetrics(renderTrafficPanels()),
    },
    {
      tabConfig: { label: t("Resources"), id: "resources" },
      content: renderMetrics(
        <Fragment>
          {renderResourcesPanels()}
          <SectionHeader>{t("Advanced")}</SectionHeader>
          {renderAdvancedResourcesPanels()}
        </Fragment>,
      ),
    },
  ];

  let tabsOptions: TabItemProps[] = [infoTab, ...prometheusTabs];

  return (
    <PageLayout sx={hideMenu ? { padding: 0 } : undefined}>
      {hideMenu && (
        <SectionHeader as="h1" style={{ marginBottom: 16 }}>
          {t("Metrics")}
        </SectionHeader>
      )}
      <ModalPresence open={Boolean(zoomOpen)}>
        {zoomOpen && (
          <ZoomWidget
            modalOpen={zoomOpen}
            timeStart={timeStart}
            timeEnd={timeEnd}
            widgetRender={0}
            value={zoomWidget}
            apiPrefix={apiPrefix}
          />
        )}
      </ModalPresence>

      <Tabs
        horizontal
        options={tabsOptions}
        currentTabOrPath={curTab}
        sx={{
          "& > .tabsPanels": {
            padding: "16px 0 0",
          },
          [`@media (max-width: ${breakPoints.sm}px)`]: {
            minWidth: 0,
            "& > .optionsContainer": {
              minWidth: 0,
            },
            "& > .optionsContainer > .optionsList": {
              minWidth: 0,
              overflowX: "auto",
              overflowY: "hidden",
              scrollbarWidth: "thin",
            },
            "& .optionsList > button": {
              flex: "0 0 auto",
            },
            "& > .tabsPanels": {
              boxSizing: "border-box",
              minWidth: 0,
            },
          },
        }}
        onTabClick={(newValue) => {
          setCurTab(newValue);
        }}
      />
    </PageLayout>
  );
};

export default PrDashboard;
