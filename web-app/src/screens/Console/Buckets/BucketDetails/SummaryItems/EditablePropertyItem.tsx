// This file is part of MinIO Console Server
// Copyright (c) 2022 MinIO, Inc.
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

import React, { ReactNode } from "react";
import { HelpTip } from "mds";
import { hasPermission } from "common/SecureComponent";
import { StatusValue } from "common/ui/StatusValue";
import { useT } from "i18n";

type EditablePropertyItemProps = {
  isLoading: boolean;
  resourceName: string;
  iamScopes: string[];
  property: string;
  value: ReactNode;
  onEdit: () => void;
  disabled?: boolean;
  helpTip?: ReactNode;
};

const EditablePropertyItem = ({
  isLoading,
  resourceName,
  iamScopes,
  property,
  value,
  onEdit,
  disabled = false,
  helpTip,
}: EditablePropertyItemProps) => {
  const t = useT();
  const canEdit =
    !disabled && !isLoading && hasPermission(resourceName, iamScopes);
  return (
    <StatusValue
      label={property}
      value={
        isLoading ? (
          t("Loading…")
        ) : helpTip ? (
          <HelpTip placement="left" content={helpTip}>
            {value}
          </HelpTip>
        ) : (
          value
        )
      }
      onEdit={canEdit ? onEdit : undefined}
    />
  );
};

export default EditablePropertyItem;
