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

import { ModalPresence } from "common/ui/ModalPresence";
import React, { Fragment, useState } from "react";
import { IConfigurationSys, IElementValue } from "../../Configurations/types";
import { Button, ConsoleIcon, DataTable, Grid, Box, Tooltip } from "mds";
import AddEndpointModal from "./AddEndpointModal";
import DeleteWebhookEndpoint from "./DeleteWebhookEndpoint";
import EditWebhookEndpoint from "./EditWebhookEndpoint";
import { Configuration } from "api/consoleApi";
import { useT } from "i18n";
import { StatusBadge } from "common/ui/StatusBadge";
import { useBoundedTable } from "common/ui/useBoundedTable";

interface WebhookSettingsProps {
  WebhookSettingslist: Configuration[];
  setResetConfigurationOpen: () => void;
  type: string;
}

const WebhookSettings = ({
  setResetConfigurationOpen,
  WebhookSettingslist,
  type,
}: WebhookSettingsProps) => {
  const t = useT();
  const boundedTable = useBoundedTable(WebhookSettingslist.length);
  const [newEndpointOpen, setNewEndpointOpen] = useState<boolean>(false);
  const [deleteWebhookOpen, setDeleteWebhookOpen] = useState<boolean>(false);
  const [editWebhookOpen, setEditWebhookOpen] = useState<boolean>(false);
  const [selectedARN, setSelectedARN] = useState<string>("");
  const [selectedEndpoint, setSelectedEndpoint] =
    useState<IConfigurationSys | null>(null);

  const renderEndpoint = (item: IElementValue[]) => {
    const endpointFilter = item.find((itm) => itm.key === "endpoint");

    if (endpointFilter) {
      if (endpointFilter.env_override) {
        return endpointFilter.env_override.value;
      }

      return endpointFilter.value;
    }

    return "";
  };

  const renderWebhookStatus = (item: IElementValue[]) => {
    const enable = item.find((entry) => entry.key === "enable");
    const value = enable?.env_override
      ? enable.env_override.value
      : enable?.value;
    // An unset value enables the endpoint; an environment override wins.
    const enabled = !value || value === "on";
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 8 }}>
        <StatusBadge
          tone={enabled ? "success" : "neutral"}
          label={enabled ? t("Enabled") : t("Disabled")}
        />
        {enable?.env_override && (
          <Tooltip tooltip={t("Set by environment variable")}>
            <span tabIndex={0} aria-label={t("Set by environment variable")}>
              <ConsoleIcon
                style={{
                  color: "var(--muted-foreground)",
                  width: 14,
                  height: 14,
                }}
              />
            </span>
          </Tooltip>
        )}
      </Box>
    );
  };

  const onCloseDelete = () => {
    setDeleteWebhookOpen(false);
    setSelectedARN("");
  };

  const onCloseEditWebhook = () => {
    setEditWebhookOpen(false);
    setSelectedEndpoint(null);
  };

  const actions = [
    {
      type: "view",
      onClick: (item: IConfigurationSys) => {
        if (item.name) {
          setEditWebhookOpen(true);
          setSelectedEndpoint(item);
        }
      },
    },
    {
      type: "delete",
      onClick: (item: IConfigurationSys) => {
        if (item.name) {
          setDeleteWebhookOpen(true);
          setSelectedARN(item.name);
        }
      },
      isDisabled: (item: string) => {
        const wHook = WebhookSettingslist.find(
          (element) => element.name === item,
        );

        if (wHook) {
          const hasOverride = wHook.key_values?.filter(
            (itm) => !!itm.env_override,
          );

          // Has override values, we cannot delete.
          if (hasOverride && hasOverride.length > 0) {
            return true;
          }

          return false;
        }
        return false;
      },
    },
  ];
  return (
    <Grid container>
      <ModalPresence open={Boolean(newEndpointOpen)}>
        {newEndpointOpen && (
          <AddEndpointModal
            open={newEndpointOpen}
            type={type}
            onCloseEndpoint={() => {
              setNewEndpointOpen(false);
            }}
          />
        )}
      </ModalPresence>
      <ModalPresence open={Boolean(deleteWebhookOpen)}>
        {deleteWebhookOpen && (
          <DeleteWebhookEndpoint
            modalOpen={deleteWebhookOpen}
            onClose={onCloseDelete}
            selectedARN={selectedARN}
            type={type}
          />
        )}
      </ModalPresence>
      <ModalPresence open={Boolean(editWebhookOpen && selectedEndpoint)}>
        {editWebhookOpen && selectedEndpoint && (
          <EditWebhookEndpoint
            open={editWebhookOpen}
            type={type}
            endpointInfo={selectedEndpoint}
            onCloseEndpoint={onCloseEditWebhook}
          />
        )}
      </ModalPresence>
      <Grid
        item
        xs={12}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "var(--fs-title)",
            lineHeight: "var(--lh-title)",
            fontWeight: 550,
          }}
        >
          {t("Currently Configured Endpoints")}
        </h2>
        <Button
          id={"newWebhook"}
          variant="callAction"
          onClick={() => {
            setNewEndpointOpen(true);
          }}
        >
          {t("New Endpoint")}
        </Button>
      </Grid>
      <Grid item xs={12}>
        <Fragment>
          <DataTable
            {...boundedTable}
            columns={[
              {
                label: t("Status"),
                elementKey: "key_values",
                renderFunction: renderWebhookStatus,
                width: 140,
                priority: "high",
              },
              { label: t("Name"), elementKey: "name", priority: "high" },
              {
                label: t("Endpoint"),
                elementKey: "key_values",
                renderFunction: renderEndpoint,
                priority: "low",
              },
            ]}
            itemActions={actions}
            idField="name"
            isLoading={false}
            records={WebhookSettingslist}
            entityName={t("endpoints")}
            customEmptyMessage={t("There are no endpoints yet.")}
          />
        </Fragment>
      </Grid>
    </Grid>
  );
};
export default WebhookSettings;
