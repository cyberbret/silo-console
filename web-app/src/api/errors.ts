// This file is part of MinIO Console Server
// Copyright (c) 2023 MinIO, Inc.
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

import { ErrorResponseHandler } from "../common/types";
import { ApiError } from "./consoleApi";

// errorToHandler translates a swagger error to a ErrorResponseHandler which
// is legacy, when all API calls are using the swagger API, we can remove this.
export const errorToHandler = (e: ApiError): ErrorResponseHandler => {
  if (!e) {
    return {
      errorMessage: "",
      detailedError: "",
    };
  }
  return {
    errorMessage: e.message || "",
    detailedError: e.detailedMessage || "",
  };
};

// Generated methods with a void response leave error=null even when the
// server returns a JSON error. Populate that field before UI error handlers
// run, preserving both the rejected Response and its readable body.
export const readApiError = async (reason: unknown): Promise<void> => {
  if (!(reason instanceof Response) || reason.ok) return;
  const response = reason as Response & { error?: unknown };
  if (
    response.error != null ||
    !response.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return;
  try {
    response.error = await response.clone().json();
  } catch {
    // A malformed/non-JSON failure must still reject with the original response.
  }
};
