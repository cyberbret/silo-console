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

import { i18nKey } from "i18n/lang";

export const LogSearchColumnLabels = {
  time: i18nKey("Timestamp"),
  api_name: i18nKey("API Name"),
  access_key: i18nKey("Access Key"),
  bucket: i18nKey("Bucket"),
  object: i18nKey("Object"),
  remote_host: i18nKey("Remote Host"),
  request_id: i18nKey("Request ID"),
  user_agent: i18nKey("User Agent"),
  response_status: i18nKey("Response Status"),
  response_status_code: i18nKey("Response Status Code"),
  request_content_length: i18nKey("Request Content Length"),
  response_content_length: i18nKey("Response Content Length"),
  time_to_response_ns: i18nKey("Time to Response NS"),
};
