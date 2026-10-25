// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

package api

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/go-openapi/strfmt"
	"github.com/minio/madmin-go/v3"
	"github.com/stretchr/testify/require"
)

func TestListBucketsUsageFreshness(t *testing.T) {
	previousAccountInfo, previousUsageInfo := minioAccountInfoMock, minioDataUsageInfoMock
	t.Cleanup(func() {
		minioAccountInfoMock, minioDataUsageInfoMock = previousAccountInfo, previousUsageInfo
	})
	minioAccountInfoMock = func(context.Context) (madmin.AccountInfo, error) {
		return madmin.AccountInfo{Buckets: []madmin.BucketAccessInfo{{Name: "demo-data", Objects: 3, Size: 42}}}, nil
	}
	updatedAt := time.Date(2026, time.October, 23, 4, 5, 6, 0, time.UTC)
	for _, tt := range []struct {
		name string
		time time.Time
		err  error
	}{
		{name: "present", time: updatedAt},
		{name: "zero"},
		{name: "error", err: errors.New("usage unavailable")},
		{name: "forbidden", err: madmin.ErrorResponse{Code: "AccessDenied", Message: "Access Denied"}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			calls := 0
			minioDataUsageInfoMock = func(ctx context.Context) (madmin.DataUsageInfo, error) {
				calls++
				deadline, ok := ctx.Deadline()
				require.True(t, ok)
				require.LessOrEqual(t, time.Until(deadline), 2*time.Second)
				return madmin.DataUsageInfo{LastUpdate: tt.time}, tt.err
			}
			response, err := listBuckets(context.Background(), AdminClientMock{})
			require.NoError(t, err)
			require.Equal(t, 1, calls)
			require.EqualValues(t, 1, response.Total)
			require.EqualValues(t, 3, response.Buckets[0].Objects)
			require.EqualValues(t, 42, response.Buckets[0].Size)
			payload, err := json.Marshal(response)
			require.NoError(t, err)
			if tt.time.IsZero() || tt.err != nil {
				require.Nil(t, response.UsageUpdatedAt)
				require.NotContains(t, string(payload), "usageUpdatedAt")
			} else {
				require.Equal(t, strfmt.DateTime(updatedAt), *response.UsageUpdatedAt)
				require.Contains(t, string(payload), `"usageUpdatedAt":"2026-10-23T04:05:06.000Z"`)
			}
		})
	}
}

func TestUsageFreshnessTimeout(t *testing.T) {
	previous := minioDataUsageInfoMock
	t.Cleanup(func() { minioDataUsageInfoMock = previous })
	minioDataUsageInfoMock = func(ctx context.Context) (madmin.DataUsageInfo, error) {
		<-ctx.Done()
		return madmin.DataUsageInfo{}, ctx.Err()
	}
	start := time.Now()
	require.Nil(t, usageUpdatedAt(context.Background(), AdminClientMock{}))
	require.Less(t, time.Since(start), 2*time.Second)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	start = time.Now()
	require.Nil(t, usageUpdatedAt(ctx, AdminClientMock{}))
	require.Less(t, time.Since(start), usageFreshnessTimeout)
}

func TestAdminInfoUsageFreshness(t *testing.T) {
	previousServerInfo, previousUsageInfo := MinioServerInfoMock, minioDataUsageInfoMock
	t.Cleanup(func() {
		MinioServerInfoMock, minioDataUsageInfoMock = previousServerInfo, previousUsageInfo
	})
	MinioServerInfoMock = func(context.Context) (madmin.InfoMessage, error) {
		return madmin.InfoMessage{}, nil
	}
	updatedAt := time.Date(2026, time.October, 23, 4, 5, 6, 0, time.UTC)
	for _, tt := range []struct {
		name string
		err  error
	}{
		{name: "present"},
		{name: "optional on failure", err: errors.New("usage unavailable")},
	} {
		t.Run(tt.name, func(t *testing.T) {
			minioDataUsageInfoMock = func(context.Context) (madmin.DataUsageInfo, error) {
				return madmin.DataUsageInfo{LastUpdate: updatedAt}, tt.err
			}
			response, err := getUsageWidgetsForDeployment(context.Background(), "", AdminClientMock{})
			require.NoError(t, err)
			if tt.err != nil {
				require.Nil(t, response.UsageUpdatedAt)
			} else {
				require.Equal(t, strfmt.DateTime(updatedAt), *response.UsageUpdatedAt)
			}
		})
	}
}
