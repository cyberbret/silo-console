// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { ReactNode } from "react";
import { InfoIcon } from "mds";
import { useT } from "i18n";
import { EmptyState } from "./EmptyState";

export const FeatureUnavailable = ({
  title,
  description,
  ...props
}: {
  title: string;
  description: ReactNode;
  docsUrl?: string;
  docsLabel?: string;
  action?: ReactNode;
  children?: ReactNode;
  framed?: boolean;
  headingLevel?: 2 | 3 | 4;
}) => {
  const t = useT();
  return (
    <EmptyState
      icon={<InfoIcon />}
      title={t(title)}
      description={
        typeof description === "string" ? t(description) : description
      }
      {...props}
    />
  );
};
