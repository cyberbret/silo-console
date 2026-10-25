// Copyright (c) 2026 Pigsty
// Copyright (c) 2022 MinIO, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { Fragment } from "react";
import { interpolate, useLocalizedLink, useT } from "i18n";

// Rendered as a component rather than a module-level constant so the copy can
// follow the active language.
export const UsageClarifyingContent = () => {
  const t = useT();
  const localizedLink = useLocalizedLink();

  return (
    <Fragment>
      <div>
        <strong> {t("Not what you expected?")}</strong>
        <br />
        {interpolate(
          t(
            "This Usage value is comparable to {command} which represents the size of all object versions that exist in the buckets.",
          ),
          { command: <strong>mc du --versions</strong> },
        )}
        <br />
        {interpolate(
          t(
            "Running {mcDu} without the {flag} flag or {df} will provide different values corresponding to the size of all {current} versions and the physical disk space occupied respectively.",
          ),
          {
            mcDu: (
              <a
                target="_blank"
                href={localizedLink(
                  "https://silo.pgsty.com/reference/minio-mc/mc-du/",
                )}
              >
                mc du
              </a>
            ),
            flag: <strong>--versions</strong>,
            df: (
              <a
                target="_blank"
                href="https://man7.org/linux/man-pages/man1/df.1.html"
              >
                df
              </a>
            ),
            current: <strong>{t("current")}</strong>,
          },
        )}
      </div>
    </Fragment>
  );
};
