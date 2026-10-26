// Copyright (c) 2026 Ruohang Feng
// SPDX-License-Identifier: AGPL-3.0-or-later

package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	jwtgo "github.com/golang-jwt/jwt/v4"
	"github.com/minio/console/models"
	"github.com/minio/madmin-go/v3"
	"github.com/stretchr/testify/require"
)

// Exercise the session response with the same policy for every identity, as
// returned by account-info. These are UI capabilities, not authorization grants.
func TestSessionGroupsConditions(t *testing.T) {
	const policy = `{"Version":"2012-10-17","Statement":[
		{"Effect":"Allow","Action":["admin:*"],"Condition":{"ForAnyValue:StringEquals":{"jwt:groups":["ops"]}}},
		{"Effect":"Deny","Action":["admin:ListUsers"],"Condition":{"ForAnyValue:StringEquals":{"jwt:groups":["suspended"]}}},
		{"Effect":"Deny","Action":["admin:ListUserPolicies"],"Condition":{"StringEquals":{"jwt:sub":"blocked"}}},
		{"Effect":"Allow","Action":["s3:GetObject"],"Resource":["arn:aws:s3:::team/allowed.txt"],"Condition":{"ForAnyValue:StringEquals":{"jwt:groups":["ops","dev"]}}}
	]}`
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != accountInfoAdminPath {
			w.WriteHeader(http.StatusForbidden) // Optional KMS feature probe.
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(madmin.AccountInfo{Policy: json.RawMessage(policy)})
	}))
	t.Cleanup(server.Close)
	t.Setenv(ConsoleMinIOServer, server.URL)

	for _, tt := range []struct {
		name   string
		claims jwtgo.MapClaims
		users  bool
		policy bool
	}{
		{"string", jwtgo.MapClaims{"groups": "ops"}, true, true},
		{"string array", jwtgo.MapClaims{"groups": []string{"ops"}}, true, true},
		{"JSON array two groups", jwtgo.MapClaims{"groups": []interface{}{"dev", "ops"}}, true, true},
		{"business group", jwtgo.MapClaims{"groups": []string{"dev"}}, false, false},
		{"missing groups", jwtgo.MapClaims{"sub": "ordinary"}, false, false},
		{"empty array", jwtgo.MapClaims{"groups": []string{}}, false, false},
		{"wrong type", jwtgo.MapClaims{"groups": true}, false, false},
		{"invalid members", jwtgo.MapClaims{"groups": []interface{}{true, 42, nil, map[string]string{"name": "ops"}, []string{"ops"}}}, false, false},
		{"mixed members match server", jwtgo.MapClaims{"groups": []interface{}{42, "ops", nil}}, true, true},
		{"conditional group deny", jwtgo.MapClaims{"groups": []string{"ops", "suspended"}}, false, true},
		{"string claim deny", jwtgo.MapClaims{"groups": []string{"ops"}, "sub": "blocked"}, true, false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			token, err := jwtgo.NewWithClaims(jwtgo.SigningMethodHS256, tt.claims).SignedString([]byte("test-only-key"))
			require.NoError(t, err)
			response, apiErr := getSessionResponse(t.Context(), &models.Principal{
				STSAccessKeyID: "test-access", STSSecretAccessKey: "test-secret", STSSessionToken: token,
			})
			require.Nil(t, apiErr)
			actions := response.Permissions[ConsoleResourceName]
			require.Equal(t, tt.users, containsSessionAction(actions, "admin:ListUsers"))
			require.Equal(t, tt.policy, containsSessionAction(actions, "admin:ListUserPolicies"))
			// The UI treats admin:* as a grant for every management operation.
			// It must not mask a narrower explicit deny in the same policy.
			require.Equal(t, tt.users && tt.policy, containsSessionAction(actions, "admin:*"))
			// Object-scoped access must not become a global capability.
			require.NotContains(t, actions, "s3:GetObject")
			require.NotContains(t, response.Permissions, "arn:aws:s3:::other/*")
		})
	}
}

func containsSessionAction(actions []string, action string) bool {
	for _, candidate := range actions {
		if candidate == action {
			return true
		}
	}
	return false
}

func TestSessionClaimConditionValues(t *testing.T) {
	for _, groups := range []interface{}{[]string{"dev", "ops"}, []interface{}{"dev", "ops", 42, nil}} {
		values := map[string][]string{"username": {"existing"}}
		addSessionClaimConditionValues(values, map[string]interface{}{
			"groups": groups, "sub": "subject", "aud": []string{"unsupported-array"}, "exp": 42,
		})
		require.Equal(t, map[string][]string{
			"username": {"existing"}, "groups": {"dev", "ops"}, "sub": {"subject"},
		}, values)
	}
}
