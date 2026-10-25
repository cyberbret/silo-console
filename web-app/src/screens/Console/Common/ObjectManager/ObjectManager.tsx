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

import React from "react";
import { useSelector } from "react-redux";
import { AppState, useAppDispatch } from "../../../../store";
import { Button, ModalBox, ObjectManagerIcon, type } from "mds";
import styled from "styled-components";
import ObjectHandled from "./ObjectHandled";
import {
  cleanList,
  closeList,
  deleteFromList,
} from "../../ObjectBrowser/objectBrowserSlice";
import { useT } from "i18n";
import { activeTask } from "./taskModel";

const Group = styled.section`
  border: 0;
  border-radius: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  box-shadow: none;
  h3 {
    ${type("subtitle")}
    font-weight: 550;
    margin: 12px 0 4px;
  }
  > p {
    color: var(--muted-foreground);
  }
`;
const ObjectManager = () => {
  const dispatch = useAppDispatch();
  const t = useT();
  const { objectsToManage: objects, managerOpen } = useSelector(
    (state: AppState) => state.objectBrowser.objectManager,
  );
  const running = objects.filter(activeTask);
  const finished = objects.filter((item) => !activeTask(item));
  return (
    <ModalBox
      open={managerOpen}
      onClose={() => dispatch(closeList())}
      title={t("Tasks")}
      titleIcon={<ObjectManagerIcon />}
      closeLabel={t("Close Tasks")}
      customMaxWidth={440}
      sx={{
        justifyContent: "flex-end",
        alignItems: "stretch",
        "& .modalContainer": {
          width: "100%",
          height: "100dvh",
          maxHeight: "100dvh",
          borderRadius: "16px 0 0 16px",
          transform: "none",
          padding: 24,
        },
        "& .dialogContent": { flex: 1 },
        "@media (max-width: 600px)": {
          "& .modalContainer": {
            maxWidth: "100%",
            borderRadius: 0,
            padding: 20,
          },
        },
      }}
    >
      <p
        style={{
          color: "var(--muted-foreground)",
          margin: "0 0 16px",
          fontSize: "var(--fs-caption)",
          lineHeight: "var(--lh-caption)",
        }}
      >
        <span>{t("Downloads / Uploads")}</span>
        {" · "}
        {t("Object operations")}
      </p>
      {(running.length > 0 || finished.length === 0) && (
        <Group aria-label={t("Running")}>
          <h3>
            {t("Running")} · {running.length}
          </h3>
          {!running.length && <p>{t("No running tasks")}</p>}
          {running.map((item) => (
            <ObjectHandled
              key={item.instanceID}
              objectToDisplay={item}
              deleteFromList={(id) => dispatch(deleteFromList(id))}
            />
          ))}
        </Group>
      )}
      <Group aria-label={t("Finished")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <h3>
            {t("Finished")} · {finished.length}
          </h3>
          <Button
            id="clear-finished-tasks"
            variant="text"
            label={t("Clear finished")}
            disabled={!finished.length}
            onClick={() => dispatch(cleanList())}
          />
        </div>
        {!finished.length && <p>{t("No finished tasks")}</p>}
        {finished
          .slice()
          .reverse()
          .map((item) => (
            <ObjectHandled
              key={item.instanceID}
              objectToDisplay={item}
              deleteFromList={(id) => dispatch(deleteFromList(id))}
            />
          ))}
      </Group>
    </ModalBox>
  );
};
export default ObjectManager;
