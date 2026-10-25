// This file is part of MinIO Console Server
// Copyright (c) 2022 MinIO, Inc.
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
import { Accordion, Box, breakPoints, type } from "mds";
import styled from "styled-components";
import ServerInfoItem from "./ServerInfoItem";
import DriveInfoItem from "./DriveInfoItem";
import { ServerProperties } from "api/consoleApi";
import { useT } from "i18n";

const ServersHeading = styled.h2`
  ${type("title")}
  margin: 0 0 16px;
  color: var(--foreground);
`;

const DrivesHeading = styled.h3`
  ${type("body", { weight: "semibold" })}
  margin: 0;
  padding: 8px 16px;
  color: var(--foreground);
  background: var(--muted);
`;

const ServersList = ({ data }: { data: ServerProperties[] }) => {
  const t = useT();
  const [expanded, setExpanded] = React.useState<string>(
    data.length > 1 ? "" : data[0].endpoint + "-0",
  );

  const handleClick = (key: string) => {
    setExpanded(key);
  };

  return (
    <Box>
      <ServersHeading>
        {t("Servers")} ({data.length})
      </ServersHeading>
      <Box>
        {data.map((serverInfo, index) => {
          const key = `${serverInfo.endpoint}-${index}`;
          const isExpanded = expanded === key;
          return (
            <Accordion
              key={key}
              expanded={isExpanded}
              onTitleClick={() => {
                if (!isExpanded) {
                  handleClick(key);
                } else {
                  handleClick("");
                }
              }}
              id={"key"}
              title={<ServerInfoItem server={serverInfo} index={index} />}
              sx={{ marginBottom: 16 }}
            >
              <DrivesHeading>
                {t("Drives")} ({serverInfo.drives?.length})
              </DrivesHeading>
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  padding: 16,
                  gap: 16,
                  [`@media (max-width: ${breakPoints.sm}px)`]: {
                    padding: 12,
                  },
                }}
              >
                {serverInfo.drives?.map((driveInfo, index) => {
                  return (
                    <DriveInfoItem
                      drive={driveInfo}
                      key={`${driveInfo.endpoint}-${index}`}
                    />
                  );
                })}
              </Box>
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
};

export default ServersList;
