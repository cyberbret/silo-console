// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { AdminInfoResponse } from "../../src/api/consoleApi";

export const requests: {
  signal: AbortSignal;
  defaultOnly?: boolean;
  resolve: (data: AdminInfoResponse) => void;
  reject: () => void;
}[] = [];
export const api = {
  admin: {
    adminInfo: (
      query: { defaultOnly?: boolean },
      params: { signal: AbortSignal },
    ) =>
      new Promise<{ data: AdminInfoResponse }>((resolve, reject) => {
        // Deliberately ignore abort here: the generation guard must also protect
        // against a transport/parse continuation that resolves after cancellation.
        requests.push({
          signal: params.signal,
          defaultOnly: query.defaultOnly,
          resolve: (data) => resolve({ data }),
          reject: () => reject(new Error("Network unavailable")),
        });
      }),
  },
};
