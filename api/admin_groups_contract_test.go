// Copyright (c) 2026 PGSTY
// SPDX-License-Identifier: AGPL-3.0-or-later

package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-openapi/runtime"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	groupAPI "github.com/minio/console/api/operations/group"
	"github.com/minio/console/models"
	"github.com/minio/madmin-go/v3"
	"github.com/stretchr/testify/require"
)

func TestGroupUpdateBindingContract(t *testing.T) {
	for _, tc := range []struct {
		name, body            string
		valid, membersPresent bool
	}{
		{"status only", `{"status":"disabled"}`, true, false},
		{"null members preserve", `{"status":"enabled","members":null}`, true, false},
		{"explicit empty members", `{"status":"disabled","members":[]}`, true, true},
		{"legacy full request", `{"status":"enabled","members":["alice","bob"]}`, true, true},
		{"missing status", `{"members":[]}`, false, false},
		{"empty body", `{}`, false, false},
		{"null body", `null`, false, false},
		{"null status", `{"status":null,"members":[]}`, false, false},
		{"invalid status", `{"status":"invalid","members":[]}`, false, false},
		{"empty status", `{"status":"","members":[]}`, false, false},
		{"non-array members", `{"status":"enabled","members":"alice"}`, false, false},
		{"non-string member", `{"status":"enabled","members":[42]}`, false, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest("PUT", "/api/v1/group/team", strings.NewReader(tc.body))
			request.Header.Set("Content-Type", "application/json")
			params := groupAPI.NewUpdateGroupParams()
			err := params.BindRequest(request, &middleware.MatchedRoute{Consumer: runtime.JSONConsumer(), Formats: strfmt.Default})
			if !tc.valid {
				require.Error(t, err)
				require.Nil(t, params.Body)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tc.membersPresent, params.Body.Members != nil)
			// Generated Go clients must retain an explicitly empty array when
			// marshaling. Omitting it would silently turn a clear into a no-op.
			encoded, err := json.Marshal(params.Body)
			require.NoError(t, err)
			var roundTrip models.UpdateGroupRequest
			require.NoError(t, json.Unmarshal(encoded, &roundTrip))
			require.Equal(t, params.Body.Members, roundTrip.Members)
		})
	}
}

// Embed the interface so every unexpected administrative operation fails the test.
type groupUpdateClient struct {
	MinioAdmin
	description        madmin.GroupDesc
	writes             []madmin.GroupAddRemove
	statusWrites       int
	readErr, statusErr error
	concurrentMembers  []string
}

func (c *groupUpdateClient) getGroupDescription(_ context.Context, _ string) (*madmin.GroupDesc, error) {
	copy := c.description
	return &copy, c.readErr
}

func (c *groupUpdateClient) updateGroupMembers(_ context.Context, update madmin.GroupAddRemove) error {
	c.writes = append(c.writes, update)
	if update.IsRemove {
		c.description.Members = DifferenceArrays(c.description.Members, update.Members)
	} else {
		c.description.Members = append(c.description.Members, update.Members...)
	}
	return nil
}

func (c *groupUpdateClient) setGroupStatus(_ context.Context, _ string, status madmin.GroupStatus) error {
	c.statusWrites++
	if c.statusErr != nil {
		return c.statusErr
	}
	c.description.Status = string(status)
	if c.concurrentMembers != nil {
		c.description.Members = c.concurrentMembers
	}
	return nil
}

func TestGroupUpdateMembersContract(t *testing.T) {
	for _, tc := range []struct {
		name          string
		members, want []string
		writes        int
	}{
		{"omitted preserves", nil, []string{"alice", "bob"}, 0},
		{"explicit empty clears", []string{}, []string{}, 1},
		{"legacy full replacement", []string{"bob", "carol"}, []string{"bob", "carol"}, 2},
	} {
		t.Run(tc.name, func(t *testing.T) {
			client := &groupUpdateClient{description: madmin.GroupDesc{Name: "team", Status: "enabled", Members: []string{"alice", "bob"}}}
			status := "disabled"
			result, err := groupUpdate(context.Background(), client, "team", &models.UpdateGroupRequest{Members: tc.members, Status: &status})
			require.NoError(t, err)
			require.ElementsMatch(t, tc.want, result.Members)
			require.Len(t, client.writes, tc.writes)
			require.Equal(t, "disabled", result.Status)
			require.Equal(t, 1, client.statusWrites)
		})
	}
}

func TestGroupStatusUpdateConcurrentMembersAndErrors(t *testing.T) {
	for _, tc := range []struct {
		name               string
		readErr, statusErr error
	}{
		{name: "concurrent membership is preserved"},
		{name: "failed read cannot mutate", readErr: errors.New("read denied")},
		{name: "failed status cannot mutate members", statusErr: errors.New("status denied")},
	} {
		t.Run(tc.name, func(t *testing.T) {
			client := &groupUpdateClient{description: madmin.GroupDesc{Name: "team", Status: "enabled", Members: []string{"alice"}}, concurrentMembers: []string{"bob"}, readErr: tc.readErr, statusErr: tc.statusErr}
			status := "disabled"
			result, err := groupUpdate(context.Background(), client, "team", &models.UpdateGroupRequest{Status: &status})
			require.Empty(t, client.writes)
			if tc.readErr != nil {
				require.ErrorIs(t, err, tc.readErr)
				require.Zero(t, client.statusWrites)
				return
			}
			if tc.statusErr != nil {
				require.ErrorIs(t, err, tc.statusErr)
				return
			}
			require.NoError(t, err)
			require.Equal(t, []string{"bob"}, result.Members)
		})
	}
}

func TestGroupUpdateInvalidStatusDoesNotMutateMembers(t *testing.T) {
	client := &groupUpdateClient{description: madmin.GroupDesc{Name: "team", Status: "enabled", Members: []string{"alice"}}}
	status := "invalid"
	_, err := groupUpdate(context.Background(), client, "team", &models.UpdateGroupRequest{Members: []string{}, Status: &status})
	require.Error(t, err)
	require.Empty(t, client.writes)
	require.Zero(t, client.statusWrites)
}
