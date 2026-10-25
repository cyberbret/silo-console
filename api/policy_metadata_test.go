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
	"errors"
	"testing"

	"github.com/minio/console/models"
	"github.com/minio/madmin-go/v3"
	iampolicy "github.com/pgsty/silo-pkg/v3/policy"
	"github.com/stretchr/testify/require"
)

func defaultPolicyForTest(t *testing.T, name string) *iampolicy.Policy {
	t.Helper()
	for _, policy := range iampolicy.DefaultPolicies {
		if policy.Name == name {
			data, err := json.Marshal(policy.Definition)
			require.NoError(t, err)
			var result iampolicy.Policy
			require.NoError(t, json.Unmarshal(data, &result))
			return &result
		}
	}
	t.Fatalf("missing default policy %q", name)
	return nil
}

func TestPolicyBuiltinMetadata(t *testing.T) {
	definition := defaultPolicyForTest(t, "consoleAdmin")
	require.Greater(t, len(definition.Statements), 1)
	original, err := json.Marshal(definition)
	require.NoError(t, err)
	var reformatted bytes.Buffer
	require.NoError(t, json.Indent(&reformatted, original, "", "  "))
	reordered := defaultPolicyForTest(t, "consoleAdmin")
	for i, j := 0, len(reordered.Statements)-1; i < j; i, j = i+1, j-1 {
		reordered.Statements[i], reordered.Statements[j] = reordered.Statements[j], reordered.Statements[i]
	}
	reorderedJSON, err := json.Marshal(reordered)
	require.NoError(t, err)
	changed := defaultPolicyForTest(t, "consoleAdmin")
	changed.Statements[0].Effect = iampolicy.Deny
	changedJSON, err := json.Marshal(changed)
	require.NoError(t, err)

	for _, tt := range []struct {
		name       string
		policyName string
		stored     []byte
		builtin    bool
		modified   bool
	}{
		{name: "identical", policyName: "consoleAdmin", stored: original, builtin: true},
		{name: "reformatted", policyName: "consoleAdmin", stored: reformatted.Bytes(), builtin: true},
		{name: "reordered statements", policyName: "consoleAdmin", stored: reorderedJSON, builtin: true},
		{name: "changed", policyName: "consoleAdmin", stored: changedJSON, builtin: true, modified: true},
		{name: "custom", policyName: "demo-reader", stored: original},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var stored iampolicy.Policy
			require.NoError(t, json.Unmarshal(tt.stored, &stored))
			result, err := parsePolicy(tt.policyName, &stored)
			require.NoError(t, err)
			require.Equal(t, tt.builtin, *result.Builtin)
			require.Equal(t, tt.modified, *result.Modified)
			payload, err := json.Marshal(result)
			require.NoError(t, err)
			require.Contains(t, string(payload), `"builtin":`)
			require.Contains(t, string(payload), `"modified":`)
		})
	}
}

func TestSemanticallyEqualPolicies(t *testing.T) {
	const original = `{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:ListBucket"],"Resource":["arn:aws:s3:::a/*","arn:aws:s3:::b/*"],"Condition":{"StringEquals":{"s3:prefix":["a","b"]}}},{"Effect":"Deny","Action":["s3:DeleteObject"],"Resource":["arn:aws:s3:::*"]}]}`
	const reordered = `{
		"Statement": [
			{"Resource":["arn:aws:s3:::*"],"Action":["s3:DeleteObject"],"Effect":"Deny"},
			{"Condition":{"StringEquals":{"s3:prefix":["b","a"]}},"Resource":["arn:aws:s3:::b/*","arn:aws:s3:::a/*"],"Action":["s3:ListBucket","s3:GetObject"],"Effect":"Allow"}
		], "Version": "2012-10-17"
	}`
	for _, tt := range []struct {
		name    string
		stored  string
		equal   bool
		wantErr bool
	}{
		{name: "identical", stored: original, equal: true},
		{name: "keys and all set values reordered", stored: reordered, equal: true},
		{name: "changed condition", stored: string(bytes.ReplaceAll([]byte(original), []byte(`"a","b"`), []byte(`"a","c"`)))},
		{name: "invalid", stored: "{", wantErr: true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			equal, err := semanticallyEqualPolicies([]byte(tt.stored), []byte(original))
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tt.equal, equal)
		})
	}
}

func TestListPoliciesMetadata(t *testing.T) {
	previousList, previousEntities := minioListPoliciesMock, minioGetPolicyEntitiesMock
	t.Cleanup(func() {
		minioListPoliciesMock, minioGetPolicyEntitiesMock = previousList, previousEntities
	})
	readonly := defaultPolicyForTest(t, "readonly")
	readwrite := defaultPolicyForTest(t, "readwrite")
	modified := defaultPolicyForTest(t, "writeonly")
	modified.Statements[0].Resources = iampolicy.NewResourceSet(iampolicy.NewResource("demo-data/*"))
	minioListPoliciesMock = func() (map[string]*iampolicy.Policy, error) {
		return map[string]*iampolicy.Policy{
			"readonly": readonly, "readwrite": readwrite, "writeonly": modified, "demo-reader": readonly,
		}, nil
	}
	for _, tt := range []struct {
		name string
		err  error
	}{
		{name: "counts present"},
		{name: "counts unavailable", err: errors.New("LDAP-only deployment")},
		{name: "counts forbidden", err: madmin.ErrorResponse{Code: "AccessDenied"}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			calls := 0
			minioGetPolicyEntitiesMock = func(_ context.Context, query madmin.PolicyEntitiesQuery) (madmin.PolicyEntitiesResult, error) {
				calls++
				require.Equal(t, []string{"demo-reader", "readonly", "readwrite", "writeonly"}, query.Policy)
				require.Empty(t, query.Users)
				require.Empty(t, query.Groups)
				return madmin.PolicyEntitiesResult{PolicyMappings: []madmin.PolicyEntities{
					{Policy: "readwrite", Users: []string{"alice", "alice", "bob"}},
					{Policy: "readwrite", Users: []string{"alice", "charlie"}},
					{Policy: "readonly", Groups: []string{"analysts", "analysts"}},
					{Policy: "readonly", Groups: []string{"analysts", "auditors"}},
				}}, tt.err
			}
			policies, err := listPolicies(context.Background(), AdminClientMock{})
			require.NoError(t, err)
			require.Equal(t, 1, calls)
			require.Len(t, policies, 4)
			for _, policy := range policies {
				require.Equal(t, policy.Name != "demo-reader", *policy.Builtin)
				require.Equal(t, policy.Name == "writeonly", *policy.Modified)
				payload, err := json.Marshal(policy)
				require.NoError(t, err)
				if tt.err != nil {
					require.Nil(t, policy.UserCount)
					require.Nil(t, policy.GroupCount)
					require.NotContains(t, string(payload), "userCount")
					require.NotContains(t, string(payload), "groupCount")
					continue
				}
				var users, groups int64
				if policy.Name == "readwrite" {
					users = 3
				}
				if policy.Name == "readonly" {
					groups = 2
				}
				require.Equal(t, users, *policy.UserCount)
				require.Equal(t, groups, *policy.GroupCount)
				require.Contains(t, string(payload), `"userCount":`)
				require.Contains(t, string(payload), `"groupCount":`)
			}
		})
	}
}

func TestPolicyInfoBuiltinMetadata(t *testing.T) {
	previous := minioGetPolicyMock
	t.Cleanup(func() { minioGetPolicyMock = previous })
	minioGetPolicyMock = func(name string) (*iampolicy.Policy, error) {
		return defaultPolicyForTest(t, name), nil
	}
	result, err := policyInfo(context.Background(), AdminClientMock{}, "readwrite")
	require.NoError(t, err)
	require.True(t, *result.Builtin)
	require.False(t, *result.Modified)
}

func TestEmptyPolicyListSkipsEntityQuery(t *testing.T) {
	previous := minioGetPolicyEntitiesMock
	t.Cleanup(func() { minioGetPolicyEntitiesMock = previous })
	minioGetPolicyEntitiesMock = func(context.Context, madmin.PolicyEntitiesQuery) (madmin.PolicyEntitiesResult, error) {
		t.Fatal("empty list must not query all policy entities")
		return madmin.PolicyEntitiesResult{}, nil
	}
	setPolicyUsageCounts(context.Background(), AdminClientMock{}, []*models.Policy{})
}
