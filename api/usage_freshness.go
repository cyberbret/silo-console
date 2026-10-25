// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

package api

import (
	"context"
	"time"

	"github.com/go-openapi/strfmt"
)

const usageFreshnessTimeout = 500 * time.Millisecond

// usageUpdatedAt returns the data-usage LastUpdate or nil when unknown.
func usageUpdatedAt(ctx context.Context, client MinioAdmin) *strfmt.DateTime {
	ctx, cancel := context.WithTimeout(ctx, usageFreshnessTimeout)
	defer cancel()

	usage, err := client.DataUsageInfo(ctx)
	if err != nil || usage.LastUpdate.IsZero() {
		return nil
	}
	updatedAt := strfmt.DateTime(usage.LastUpdate)
	return &updatedAt
}
