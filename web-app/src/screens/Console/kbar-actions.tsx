//  This file is part of MinIO Console Server
//  Copyright (c) 2022 MinIO, Inc.
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU Affero General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License
//  along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { Action } from "kbar/lib/types";
import BucketsIcon from "../../../packages/mds/src/components/Icons/BucketsIcon";
import { menuPages } from "../../navigation/menu";
import { menuSections } from "../../navigation/registry";
import type { RouteContext } from "../../navigation/resolveRoute";
import { IAM_PAGES } from "../../common/SecureComponent/permissions";
import { formatText } from "../../i18n/lang";

export const routesAsKbarActions = (
  recent: readonly string[],
  navigate: (url: string) => void,
  context: RouteContext,
  t: (text: string) => string = (text) => text,
  canCreateBucket = false,
): Action[] => [
  ...menuPages(context).map((page) => ({
    id: page.menu?.id || page.id,
    name: t(page.title),
    keywords: page.title,
    section: t(
      menuSections.find((section) => section.id === page.section)?.title ||
        "Navigation",
    ),
    perform: () => navigate(page.path),
    icon: page.menu!.icon,
  })),
  ...(canCreateBucket
    ? [
        {
          id: "create-bucket",
          name: t("Create Bucket"),
          keywords: "Create Bucket",
          section: t("Buckets"),
          perform: () => navigate(IAM_PAGES.ADD_BUCKETS),
          icon: <BucketsIcon />,
        },
      ]
    : []),
  ...recent.map((name) => ({
    id: `recent-bucket-${name}`,
    name: formatText(t("Open bucket {name}"), { name }),
    keywords: name,
    section: t("Recent buckets"),
    perform: () => navigate(`/browser/${encodeURIComponent(name)}`),
    icon: <BucketsIcon />,
  })),
];
