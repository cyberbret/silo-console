// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import { Button, SearchIcon } from "mds";
import { useLocation, useNavigate } from "react-router-dom";
import { useT } from "i18n";
import styled from "styled-components";
import { EmptyState } from "./EmptyState";

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-16);
`;
const Path = styled.code`
  padding: var(--space-4) var(--space-8);
  max-width: 100%;
  overflow-wrap: anywhere;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
`;

// Adapt the standalone NotFoundPage's message to an authenticated shell.
const ConsoleNotFound = ({ headingLevel }: { headingLevel?: 2 | 3 | 4 }) => {
  const t = useT();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <EmptyState
      headingLevel={headingLevel}
      framed
      icon={<SearchIcon />}
      title={t("Page not found")}
      description={t("Sorry, the page could not be found.")}
      action={
        <Actions>
          <Button
            id="not-found-go-back"
            label={t("Go back")}
            onClick={() => navigate(-1)}
          />
          <Button
            id="not-found-go-to-buckets"
            variant="callAction"
            label={t("Go to Buckets")}
            onClick={() => navigate("/browser")}
          />
        </Actions>
      }
    >
      <Path>{pathname}</Path>
    </EmptyState>
  );
};

export { ConsoleNotFound };
