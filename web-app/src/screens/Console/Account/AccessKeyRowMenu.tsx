// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import { ItemActions } from "mds";
import { OverflowMenu } from "common/ui/OverflowMenu";
import { ServiceAccounts } from "api/consoleApi";
import { useT } from "i18n";
import {
  IAM_SCOPES,
  permissionTooltipHelper,
} from "common/SecureComponent/permissions";

export function AccessKeyRowMenu({
  record,
  actions,
}: {
  record: ServiceAccounts[number];
  actions: ItemActions[];
}) {
  const t = useT();
  return (
    <span
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <OverflowMenu
        label={`${t("Actions")}: ${record.accessKey}`}
        items={actions.map((action) => {
          const disabled =
            typeof action.isDisabled === "function"
              ? action.isDisabled(record)
              : action.isDisabled;
          return {
            label:
              action.type === "delete"
                ? t("Delete")
                : action.type === "edit"
                  ? t("Edit")
                  : t("View"),
            danger: action.type === "delete",
            disabled,
            disabledReason: disabled
              ? permissionTooltipHelper(
                  [
                    action.type === "delete"
                      ? IAM_SCOPES.ADMIN_REMOVE_SERVICEACCOUNT
                      : IAM_SCOPES.ADMIN_UPDATE_SERVICEACCOUNT,
                  ],
                  t("manage Access Keys"),
                )
              : undefined,
            onClick: () => action.onClick?.(record),
          };
        })}
      />
    </span>
  );
}
