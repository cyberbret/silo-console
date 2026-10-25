// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

package api

import (
	"bytes"
	"context"
	"encoding/json"
	"sort"

	"github.com/go-openapi/swag"
	"github.com/minio/console/models"
	"github.com/minio/madmin-go/v3"
)

func semanticallyEqualPolicies(stored, builtin []byte) (bool, error) {
	var storedPolicy, builtinPolicy interface{}
	if err := json.Unmarshal(stored, &storedPolicy); err != nil {
		return false, err
	}
	if err := json.Unmarshal(builtin, &builtinPolicy); err != nil {
		return false, err
	}
	storedJSON, err := canonicalPolicyJSON(storedPolicy)
	if err != nil {
		return false, err
	}
	builtinJSON, err := canonicalPolicyJSON(builtinPolicy)
	if err != nil {
		return false, err
	}
	return bytes.Equal(storedJSON, builtinJSON), nil
}

// Policy arrays (statements, actions, resources and condition values) are
// unordered. JSON marshaling sorts object keys; sort each array recursively too.
func canonicalPolicyJSON(value interface{}) (json.RawMessage, error) {
	switch value := value.(type) {
	case map[string]interface{}:
		object := make(map[string]json.RawMessage, len(value))
		for key, item := range value {
			canonical, err := canonicalPolicyJSON(item)
			if err != nil {
				return nil, err
			}
			object[key] = canonical
		}
		return json.Marshal(object)
	case []interface{}:
		array := make([]json.RawMessage, len(value))
		for i, item := range value {
			canonical, err := canonicalPolicyJSON(item)
			if err != nil {
				return nil, err
			}
			array[i] = canonical
		}
		sort.Slice(array, func(i, j int) bool {
			return bytes.Compare(array[i], array[j]) < 0
		})
		return json.Marshal(array)
	default:
		return json.Marshal(value)
	}
}

func setPolicyUsageCounts(ctx context.Context, client MinioAdmin, policies []*models.Policy) {
	if len(policies) == 0 {
		return
	}
	names := make([]string, 0, len(policies))
	for _, policy := range policies {
		names = append(names, policy.Name)
	}
	sort.Strings(names)
	entities, err := client.GetPolicyEntities(ctx, madmin.PolicyEntitiesQuery{Policy: names})
	if err != nil {
		return
	}
	users := make(map[string]map[string]struct{})
	groups := make(map[string]map[string]struct{})
	for _, mapping := range entities.PolicyMappings {
		if users[mapping.Policy] == nil {
			users[mapping.Policy] = make(map[string]struct{})
			groups[mapping.Policy] = make(map[string]struct{})
		}
		for _, user := range mapping.Users {
			users[mapping.Policy][user] = struct{}{}
		}
		for _, group := range mapping.Groups {
			groups[mapping.Policy][group] = struct{}{}
		}
	}
	// A successful query omits policies with no assignments, which are known zeroes.
	for _, policy := range policies {
		policy.UserCount = swag.Int64(int64(len(users[policy.Name])))
		policy.GroupCount = swag.Int64(int64(len(groups[policy.Name])))
	}
}
