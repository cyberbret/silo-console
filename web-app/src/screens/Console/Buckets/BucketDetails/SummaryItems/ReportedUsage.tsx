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
import { StatCard } from "common/ui/StatCard";
import { niceBytes } from "common/utils";
import { formatText, useT } from "i18n";

const ReportedUsage = ({
  bucketSize,
  quota,
  loading,
}: {
  bucketSize?: number;
  quota?: number;
  loading: boolean;
}) => {
  const t = useT();
  const known =
    !loading && bucketSize !== undefined && Number.isFinite(bucketSize);
  const [value, unit] = known
    ? niceBytes(String(bucketSize)).split(" ")
    : ["—", ""];
  return (
    <StatCard
      label={t("Reported Usage:")}
      value={value}
      unit={unit}
      subline={
        loading
          ? t("Loading…")
          : quota && quota > 0
            ? formatText(t("Quota: {quota}"), {
                quota: niceBytes(String(quota)),
              })
            : undefined
      }
      progress={
        known && quota && quota > 0 ? { value: bucketSize / quota } : undefined
      }
    />
  );
};

export default ReportedUsage;
