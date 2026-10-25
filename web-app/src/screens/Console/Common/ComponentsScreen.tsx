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

import React, { Fragment, lazy, Suspense, useEffect, useState } from "react";
import {
  Button,
  ConfirmDeleteIcon,
  PageLayout,
  SectionTitle,
  Grid,
  BucketsIcon,
  StorageIcon,
  EditIcon,
  DeleteIcon,
  RefreshIcon,
} from "mds";
import styled from "styled-components";
import { Link } from "react-router-dom";
import {
  StatusBadge,
  StatusValue,
  EmptyState,
  DisabledReason,
  Freshness,
  StatCard,
  FeatureUnavailable,
  NoPermission,
  OverflowMenu,
  CliEquivalent,
  SkeletonRows,
  breakpoints,
  typography,
} from "../../../common/ui";
import FoundationShowcase from "./FoundationShowcase";
import ControlShowcase from "./ControlShowcase";
import ConfirmDialog from "./ModalWrapper/ConfirmDialog";
import PageHeaderWrapper from "./PageHeaderWrapper/PageHeaderWrapper";
import { setHelpName } from "../../../systemSlice";
import { useAppDispatch } from "../../../store";
import { i18nKey, interpolate, useT } from "i18n";

const FluidHoverShowcase = lazy(() => import("./FluidHoverShowcase"));

const Showcase = styled.div`
  color: var(--silo-text);
  display: grid;
  gap: var(--silo-space-24);
  margin-bottom: var(--silo-space-32);
  h1 {
    ${typography.title} margin: 0 0 var(--silo-space-8);
  }
  h2 {
    ${typography.section} margin: 0 0 var(--silo-space-16);
  }
  p {
    ${typography.body} color: var(--silo-text-secondary);
    margin: 0;
  }
  a {
    color: var(--silo-primary);
  }
  #root & button.button-regular,
  #root & button.button-callAction {
    border-radius: var(--silo-radius-button);
    letter-spacing: normal;
  }
`;
const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--silo-space-16);
  @media (max-width: ${breakpoints.lg - 1}px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: ${breakpoints.md - 1}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;
const Pair = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--silo-space-16);
  @media (max-width: ${breakpoints.md - 1}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;
const Panel = styled.div`
  min-width: 0;
  padding: var(--silo-space-20);
  background: var(--surface-3);
  box-shadow: var(--shadow-2);
  border-radius: var(--silo-radius-card);
`;
const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--silo-space-12);
  & + & {
    margin-top: var(--silo-space-16);
  }
`;
const UnavailableControl = styled.span`
  ${typography.small}
  display: inline-flex;
  align-items: center;
  padding: var(--silo-space-8) var(--silo-space-12);
  border: 1px dashed var(--silo-border-strong);
  border-radius: var(--silo-radius-input);
  color: var(--silo-text-muted);
`;

const ComponentsScreen = () => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [enabled, setEnabled] = useState(true);
  const [notice, setNotice] = useState("");
  const [updatedAt] = useState(() =>
    new Date(Date.now() - 180_000).toISOString(),
  );
  const dispatch = useAppDispatch();
  const t = useT();

  useEffect(() => {
    dispatch(setHelpName("components"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <PageHeaderWrapper label={i18nKey("Components")} help />

      <PageLayout
        sx={{
          padding: 24,
          [`@media (max-width: ${breakpoints.lg - 1}px)`]: { padding: 16 },
          [`@media (max-width: ${breakpoints.md - 1}px)`]: { padding: 12 },
        }}
      >
        <Showcase>
          <div>
            <h1>{t("SILO primitives")}</h1>
            <p>
              {t(
                "Shared building blocks for storage, identity and monitoring.",
              )}
            </p>
          </div>
          <ControlShowcase />
          <FoundationShowcase />
          <Suspense fallback={null}>
            <FluidHoverShowcase />
          </Suspense>
          <Stats>
            <StatCard
              label={t("Capacity")}
              icon={<StorageIcon />}
              value="7.2"
              unit="TiB"
              subline={t("Healthy capacity")}
              progress={{ value: 0.72 }}
              footer={<Freshness at={updatedAt} prefix="Calculated" />}
            />
            <StatCard
              label={t("Capacity warning")}
              icon={<StorageIcon />}
              value="8.7"
              unit="TiB"
              subline={t("Above the 85% warning threshold")}
              progress={{ value: 0.87 }}
            />
            <StatCard
              label={t("Capacity critical")}
              icon={<StorageIcon />}
              value="9.6"
              unit="TiB"
              subline={t("Above the 95% critical threshold")}
              progress={{ value: 0.96 }}
            />
            <StatCard
              label={t("Buckets")}
              icon={<BucketsIcon />}
              value="28"
              subline={t("Usage is calculated by the server.")}
              footer={<Link to="/buckets">{t("View buckets")}</Link>}
            />
          </Stats>
          <Pair>
            <Panel>
              <h2>{t("Status and values")}</h2>
              <Row>
                <StatusBadge tone="success" label={t("Online")} />
                <StatusBadge tone="warning" label={t("Healing")} />
                <StatusBadge tone="danger" label={t("Offline")} />
                <StatusBadge tone="neutral" label={t("Disabled")} />
                <StatusBadge tone="info" label={t("Built-in")} dot={false} />
              </Row>
              <Row>
                <StatusValue
                  label={t("Versioning")}
                  value={
                    <StatusBadge
                      tone={enabled ? "success" : "neutral"}
                      label={enabled ? t("Enabled") : t("Disabled")}
                    />
                  }
                  onEdit={() => setEnabled((value) => !value)}
                />
                <StatusValue
                  label={t("Objects")}
                  value={<span className="silo-num">1,248</span>}
                />
              </Row>
            </Panel>
            <Panel>
              <h2>{t("Freshness and actions")}</h2>
              <Row>
                <Freshness at={updatedAt} />
                <Freshness />
                <Freshness at={updatedAt} pending />
              </Row>
              <Row>
                <DisabledReason
                  reason={t("Select an object to inspect its details.")}
                >
                  <UnavailableControl>{t("Object details")}</UnavailableControl>
                </DisabledReason>
                <OverflowMenu
                  items={[
                    {
                      label: t("Delete"),
                      icon: <DeleteIcon />,
                      danger: true,
                      onClick: () => setNotice(t("Demo action completed.")),
                    },
                    {
                      label: t("Refresh"),
                      icon: <RefreshIcon />,
                      onClick: () => setNotice(t("Demo action completed.")),
                    },
                    {
                      label: t("Edit"),
                      icon: <EditIcon />,
                      onClick: () => setNotice(t("Demo action completed.")),
                    },
                    {
                      label: t("Download"),
                      disabled: true,
                      disabledReason: t("Select an object to download."),
                      onClick: () => {},
                    },
                  ]}
                />
              </Row>
              <p role="status">{notice}</p>
            </Panel>
          </Pair>
          <div>
            <h2>{t("Empty and unavailable states")}</h2>
            <Pair>
              <Panel>
                <EmptyState
                  icon={<BucketsIcon />}
                  title={t("No buckets yet")}
                  description={t("Create a bucket to start storing objects.")}
                  docsUrl="https://silo.pgsty.com/"
                  action={
                    <Button
                      id="showcase-create-bucket"
                      type="button"
                      variant="callAction"
                      label={t("Create bucket")}
                      onClick={() => setNotice(t("Demo action completed."))}
                    />
                  }
                />
              </Panel>
              <Panel>
                <EmptyState
                  compact
                  icon={<BucketsIcon />}
                  title={t("No matching objects")}
                  description={t(
                    "Try a different name or clear the search filter.",
                  )}
                />
              </Panel>
              <Panel>
                <FeatureUnavailable
                  title={t("Metrics are unavailable")}
                  description={t(
                    "Connect a Prometheus endpoint to view monitoring metrics.",
                  )}
                  docsUrl="https://silo.pgsty.com/"
                />
              </Panel>
              <Panel>
                <NoPermission
                  required={["admin:ServerInfo", "s3:ListAllMyBuckets"]}
                />
              </Panel>
            </Pair>
          </div>
          <Pair>
            <Panel>
              <h2>{t("Loading rows")}</h2>
              <SkeletonRows columns={3} />
            </Panel>
            <div>
              <h2>{t("Command preview")}</h2>
              <CliEquivalent
                alias="silo"
                commands={[
                  "mcli ls ALIAS",
                  "mcli version info ALIAS/demo-data",
                ]}
              />
            </div>
          </Pair>
        </Showcase>
        <Grid container>
          <Grid item xs={12}>
            <SectionTitle>{t("Confirm Dialogs")}</SectionTitle>
          </Grid>
          <Grid item xs={12}>
            <p>{t("Used to confirm a non-idempotent action.")}</p>
          </Grid>
          <Grid item xs={12}>
            <Button
              id={"open-dialog-test"}
              type="button"
              variant={"regular"}
              onClick={() => {
                setDialogOpen(true);
              }}
              label={t("Open Dialog")}
            />
            <ConfirmDialog
              destructive
              title={t("Delete Bucket")}
              confirmText={t("Delete")}
              isOpen={dialogOpen}
              titleIcon={<ConfirmDeleteIcon />}
              isLoading={false}
              onConfirm={() => {
                setDialogOpen(false);
              }}
              onClose={() => {
                setDialogOpen(false);
              }}
              confirmationContent={
                <Fragment>
                  {interpolate(
                    t("Are you sure you want to delete bucket {bucket}?"),
                    { bucket: <b>bucket</b> },
                  )}
                  <br />
                  {t("A bucket can only be deleted if it's empty.")}
                </Fragment>
              }
            />
          </Grid>
        </Grid>
      </PageLayout>
    </Fragment>
  );
};

export default ComponentsScreen;
