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

import React, { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { PageLayout } from "mds";
import { useSelector } from "react-redux";
import withSuspense from "../../Common/Components/withSuspense";
import {
  selDistSet,
  setErrorSnackMessage,
  setHelpName,
} from "../../../../systemSlice";
import {
  selBucketDetailsInfo,
  selBucketDetailsLoading,
  setBucketDetailsLoad,
  setBucketInfo,
} from "./bucketDetailsSlice";
import { useAppDispatch } from "../../../../store";
import { api } from "api";
import { errorToHandler } from "api/errors";
import BucketPageHeader from "../BucketPageHeader";

const AccessRulePanel = withSuspense(
  React.lazy(() => import("./AccessRulePanel")),
);
const AccessDetailsPanel = withSuspense(
  React.lazy(() => import("./AccessDetailsPanel")),
);
const BucketSummaryPanel = withSuspense(
  React.lazy(() => import("./BucketSummaryPanel")),
);
const BucketEventsPanel = withSuspense(
  React.lazy(() => import("./BucketEventsPanel")),
);
const BucketReplicationPanel = withSuspense(
  React.lazy(() => import("./BucketReplicationPanel")),
);
const BucketLifecyclePanel = withSuspense(
  React.lazy(() => import("./BucketLifecyclePanel")),
);

const BucketDetails = () => {
  const dispatch = useAppDispatch();
  const { bucketName = "" } = useParams();
  const distributedSetup = useSelector(selDistSet);
  const loadingBucket = useSelector(selBucketDetailsLoading);
  const bucketInfo = useSelector(selBucketDetailsInfo);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    dispatch(setHelpName("bucket_details"));
    dispatch(setBucketDetailsLoad(true));
  }, [bucketName, dispatch]);
  useEffect(() => {
    if (!loadingBucket) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    api.buckets
      .bucketInfo(bucketName, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        dispatch(setBucketInfo(res.data));
        dispatch(setBucketDetailsLoad(false));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        dispatch(setBucketDetailsLoad(false));
        dispatch(setErrorSnackMessage(errorToHandler(err)));
      });
    return () => controller.abort();
  }, [bucketName, loadingBucket, dispatch]);
  return (
    <BucketPageHeader
      bucketName={bucketName}
      bucketInfo={bucketInfo}
      onRefresh={() => dispatch(setBucketDetailsLoad(true))}
    >
      <PageLayout>
        <Routes>
          <Route path="summary" element={<BucketSummaryPanel />} />
          <Route path="events" element={<BucketEventsPanel />} />
          {distributedSetup && (
            <Route path="replication" element={<BucketReplicationPanel />} />
          )}
          {distributedSetup && (
            <Route path="lifecycle" element={<BucketLifecyclePanel />} />
          )}
          <Route path="access" element={<AccessDetailsPanel />} />
          <Route path="prefix" element={<AccessRulePanel />} />
          <Route
            path="*"
            element={
              <Navigate
                replace
                to={`/buckets/${encodeURIComponent(bucketName)}/admin/summary`}
              />
            }
          />
        </Routes>
      </PageLayout>
    </BucketPageHeader>
  );
};
export default BucketDetails;
