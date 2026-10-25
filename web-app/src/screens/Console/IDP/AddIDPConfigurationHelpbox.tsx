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

import React, { Fragment } from "react";
import { HelpIconFilled, Box } from "mds";
import { useLocalizedLink, useT } from "i18n";

interface IContent {
  icon: React.ReactNode;
  text: string;
  iconDescription: string;
}

interface IAddIDPConfigurationHelpBoxProps {
  helpText: string;
  docLink: string;
  docText: string;
  contents: IContent[];
}

const FeatureItem = ({
  icon,
  description,
}: {
  icon: any;
  description: string;
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "var(--foreground)",
        "& .min-icon": {
          height: 16,
          width: 16,
          flexShrink: 0,
        },
      }}
    >
      {icon} <div style={{ fontWeight: 550 }}>{description}</div>
    </Box>
  );
};

const AddIDPConfigurationHelpBox = ({
  helpText,
  docLink,
  docText,
  contents,
}: IAddIDPConfigurationHelpBoxProps) => {
  const t = useT();
  const localize = useLocalizedLink();

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--surface-2)",
        color: "var(--foreground)",
        fontSize: "var(--fs-body,13px)",
        lineHeight: "var(--lh-body,20px)",
        overflowWrap: "anywhere",
        display: "flex",
        flexFlow: "column",
        padding: 16,
      }}
    >
      <Box
        sx={{
          fontSize: "var(--fs-title,16px)",
          lineHeight: "var(--lh-title,22px)",
          fontWeight: 550,
          display: "flex",
          alignItems: "center",
          marginBottom: "16px",
          gap: 8,

          "& .min-icon": {
            height: 16,
            width: 16,
            flexShrink: 0,
          },
        }}
      >
        <HelpIconFilled />
        <div>{t(helpText)}</div>
      </Box>
      <Box>
        {contents.map((content, index) => (
          <Fragment key={`feature-item-${index}`}>
            {content.icon && (
              <Box sx={{ marginBottom: 8 }}>
                <FeatureItem
                  icon={content.icon}
                  description={t(content.iconDescription)}
                />
              </Box>
            )}
            <Box sx={{ marginBottom: 16 }}>{t(content.text)}</Box>
          </Fragment>
        ))}
        <Box>
          <a href={localize(docLink)} target="_blank" rel="noopener">
            {t(docText)}
          </a>
        </Box>
      </Box>
    </Box>
  );
};

export default AddIDPConfigurationHelpBox;
