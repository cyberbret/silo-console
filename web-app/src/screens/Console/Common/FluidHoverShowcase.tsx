// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useState } from "react";
import styled from "styled-components";
import { DataTable, DensityProvider, Tabs } from "mds";
import { useT } from "i18n";

const Section = styled.section`
  display: grid;
  gap: 16px;
  min-width: 0;
  .fluidExamples {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  @media (max-width: 760px) {
    .fluidExamples {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`;

export default function FluidHoverShowcase() {
  const t = useT();
  const [tab, setTab] = useState("objects");
  const [subtle, setSubtle] = useState("overview");
  const [notice, setNotice] = useState("");
  const records = [
    "archive",
    "backups",
    "documents",
    "media",
    "reports",
    "snapshots",
  ].map((name, index) => ({ name, objects: (index + 1) * 128 }));
  return (
    <Section aria-labelledby="fluid-showcase-title">
      <h2 id="fluid-showcase-title">{t("Lists and tabs")}</h2>
      <p>
        {t(
          "Move through rows with the pointer or keyboard. Arrow keys focus tabs; Enter or Space opens them.",
        )}
      </p>
      <div className="fluidExamples">
        <div>
          <Tabs
            horizontal
            currentTabOrPath={tab}
            onTabClick={setTab}
            options={[
              {
                tabConfig: { id: "objects", label: t("Objects") },
                content: t("Browse and select stored objects."),
              },
              {
                tabConfig: { id: "versions", label: t("Versions") },
                content: t("Review stored object versions."),
              },
              {
                tabConfig: { id: "settings", label: t("Settings") },
                content: t("Manage bucket settings."),
              },
            ]}
          />
        </div>
        <DensityProvider density="compact">
          <Tabs
            horizontal
            variant="subtle"
            currentTabOrPath={subtle}
            onTabClick={setSubtle}
            options={[
              {
                tabConfig: { id: "overview", label: t("Overview") },
                content: t("Compact section tabs"),
              },
              {
                tabConfig: { id: "usage", label: t("Usage") },
                content: t("Storage and object usage"),
              },
              {
                tabConfig: { id: "activity", label: t("Activity") },
                content: t("Recent storage activity"),
              },
            ]}
          />
        </DensityProvider>
      </div>
      <DataTable
        records={records}
        idField="name"
        entityName={t("Example buckets")}
        customPaperHeight="280px"
        columns={[
          { label: t("Name"), elementKey: "name" },
          { label: t("Objects"), elementKey: "objects" },
        ]}
        itemActions={[
          { type: "view", onClick: (record) => setNotice(record.name) },
        ]}
      />
      <p role="status">{notice}</p>
    </Section>
  );
}
