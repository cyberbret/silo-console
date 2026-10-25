// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { ComponentProps } from "react";
import { Button, SearchIcon } from "mds";
import { useT } from "i18n";
import { EmptyState } from "./EmptyState";

// A filtered list must offer recovery, rather than implying it has no data.
export const FilteredEmptyState = ({
  filtered,
  onClear,
  ...empty
}: ComponentProps<typeof EmptyState> & {
  filtered: boolean;
  onClear: () => void;
}) => {
  const t = useT();
  return filtered ? (
    <EmptyState
      headingLevel={empty.headingLevel}
      icon={<SearchIcon />}
      title={t("No matching results")}
      description={t(
        "Try a different search or clear the filters to see all items.",
      )}
      action={
        <Button
          id="clear-list-filters"
          variant="regular"
          onClick={onClear}
          label={t("Clear filters")}
        />
      }
    />
  ) : (
    <EmptyState {...empty} />
  );
};
