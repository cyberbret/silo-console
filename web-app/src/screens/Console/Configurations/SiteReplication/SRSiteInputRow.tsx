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

import React, { useEffect, useState } from "react";
import TooltipWrapper from "../../Common/TooltipWrapper/TooltipWrapper";
import { AddIcon, Box, Button, InputBox, RemoveIcon, breakPoints } from "mds";
import { SiteInputRow } from "./Types";
import { useT } from "i18n";

type SiteField = "name" | "endpoint" | "accessKey" | "secretKey";

interface ISRSiteInputRowProps {
  rowData: SiteInputRow;
  rowId: number;
  kind: "current" | "peer";
  onFieldChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    fieldName: SiteField,
    index: number,
  ) => void;
  onAddClick?: (index: number) => void;
  onRemoveClick?: (index: number) => void;
  canAdd?: boolean;
  canRemove?: boolean;
  showRowActions?: boolean;
  disabledFields?: string[];
  fieldErrors?: Partial<Record<SiteField, string>>;
  showValidation?: boolean;
  validationKey?: number;
}

const SRSiteInputRow = ({
  rowData,
  rowId: index,
  kind,
  onFieldChange,
  onAddClick,
  onRemoveClick,
  canAdd = true,
  canRemove = true,
  showRowActions = true,
  disabledFields = [],
  fieldErrors = {},
  showValidation = false,
  validationKey = 0,
}: ISRSiteInputRowProps) => {
  const t = useT();
  const [touched, setTouched] = useState<Partial<Record<SiteField, boolean>>>(
    {},
  );
  useEffect(() => setTouched({}), [validationKey]);
  const errorFor = (field: SiteField) =>
    showValidation || touched[field] ? fieldErrors[field] : undefined;
  const touch = (field: SiteField) =>
    setTouched((previous) => ({ ...previous, [field]: true }));
  const { endpoint = "", accessKey = "", secretKey = "", name = "" } = rowData;
  const prefix = `add-rep-${kind}-site`;

  return (
    <Box
      role="group"
      aria-label={
        kind === "current" ? t("This Site") : `${t("Peer Sites")} ${index + 1}`
      }
      className="site-input-row"
      sx={{
        display: "grid",
        gridTemplateColumns:
          "minmax(0, .8fr) minmax(0, 1.2fr) repeat(2, minmax(0, 1fr)) 88px",
        gap: 16,
        padding: 16,
        minWidth: 0,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-control, 8px)",
        "& .site-field": {
          minWidth: 0,
          margin: 0,
          flexDirection: "column",
          gap: 8,
          "& > .inputLabel": {
            margin: 0,
            minHeight: 0,
            whiteSpace: "normal",
            fontWeight: 550,
          },
          "& .textBoxContainer": { minWidth: 0 },
          "& .errorText": { overflowWrap: "anywhere" },
        },
        // Reserve one error line so blur validation cannot move the next
        // label between pointer down and click, losing its focus action.
        "& .site-field-validated .textBoxContainer": {
          minHeight:
            "calc(var(--field-height, var(--control-height, 36px)) + var(--lh-caption, 16px) + 3px)",
        },
        [`@media (max-width: ${breakPoints.xl - 0.02}px)`]: {
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        },
        [`@media (max-width: ${breakPoints.md - 0.02}px)`]: {
          gridTemplateColumns: "minmax(0, 1fr)",
          padding: 12,
        },
      }}
    >
      <InputBox
        className="site-field"
        noLabelMinWidth
        id={`${prefix}-${index}`}
        name={`${prefix}-${index}`}
        placeholder="site-name"
        label={t("Site Name")}
        readOnly={disabledFields.includes("name")}
        value={name}
        onChange={(event) => onFieldChange(event, "name", index)}
        onBlur={() => touch("name")}
        data-test-id={`add-site-rep-${kind}-site-${index}`}
      />
      <InputBox
        className="site-field site-field-validated"
        noLabelMinWidth
        id={`${prefix}-ep-${index}`}
        name={`${prefix}-ep-${index}`}
        placeholder={`https://dr.example.com:900${index}`}
        label={t("Endpoint")}
        readOnly={disabledFields.includes("endpoint")}
        error={errorFor("endpoint")}
        value={endpoint}
        onChange={(event) => onFieldChange(event, "endpoint", index)}
        onBlur={() => touch("endpoint")}
        required
        data-test-id={`add-site-rep-${kind}-ep-${index}`}
      />
      <InputBox
        className="site-field site-field-validated"
        noLabelMinWidth
        id={`${prefix}-ac-${index}`}
        name={`${prefix}-ac-${index}`}
        label={t("Access Key")}
        required
        disabled={disabledFields.includes("accessKey")}
        value={accessKey}
        error={errorFor("accessKey")}
        onChange={(event) => onFieldChange(event, "accessKey", index)}
        onBlur={() => touch("accessKey")}
        data-test-id={`${prefix}-ac-${index}`}
      />
      <InputBox
        className="site-field site-field-validated"
        noLabelMinWidth
        id={`${prefix}-sk-${index}`}
        name={`${prefix}-sk-${index}`}
        label={t("Secret Key")}
        required
        type="password"
        value={secretKey}
        error={errorFor("secretKey")}
        disabled={disabledFields.includes("secretKey")}
        onChange={(event) => onFieldChange(event, "secretKey", index)}
        onBlur={() => touch("secretKey")}
        data-test-id={`${prefix}-sk-${index}`}
      />
      {showRowActions && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            alignSelf: "start",
            justifyContent: "flex-end",
            gap: 8,
            paddingTop: "calc(var(--lh-body, 20px) + 8px)",
            "& button": {
              width: "var(--control-height, 36px)",
              padding: 0,
            },
            [`@media (max-width: ${breakPoints.xl - 0.02}px)`]: {
              gridColumn: "1 / -1",
              paddingTop: 0,
            },
            "@media (pointer: coarse)": {
              "& button": { minWidth: 40, minHeight: 40 },
            },
          }}
        >
          <TooltipWrapper tooltip={t("Add a Row")}>
            <Button
              aria-label={t("Add site")}
              id={`add-${kind}-row-${index}`}
              type="button"
              variant="regular"
              disabled={!canAdd}
              icon={<AddIcon />}
              onClick={() => onAddClick?.(index)}
            />
          </TooltipWrapper>
          <TooltipWrapper tooltip={t("Remove Row")}>
            <Button
              aria-label={t("Remove site")}
              id={`remove-${kind}-row-${index}`}
              type="button"
              variant="regular"
              disabled={!canRemove}
              icon={<RemoveIcon />}
              onClick={() => onRemoveClick?.(index)}
            />
          </TooltipWrapper>
        </Box>
      )}
    </Box>
  );
};

export default SRSiteInputRow;
