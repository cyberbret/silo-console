// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import { StatusBadge } from "common/ui/StatusBadge";
import { useT } from "i18n";
import type { Policy } from "../../../api/consoleApi";
import { policyKind } from "./policyPresentation";

export const PolicyTypeBadge = ({ policy }: { policy: Policy }) => {
  const t = useT();
  const kind = policyKind(policy);
  return (
    <StatusBadge
      tone={
        kind === "modified" ? "warning" : kind === "custom" ? "info" : "neutral"
      }
      label={
        kind === "modified"
          ? t("Built-in · Modified")
          : kind === "builtin"
            ? t("Built-in")
            : kind === "custom"
              ? t("Custom")
              : t("Unknown")
      }
    />
  );
};
