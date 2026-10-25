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

import React, { Fragment, Suspense, useEffect, useRef } from "react";
import ModalWrapper from "../../../../Common/ModalWrapper/ModalWrapper";
import LoadingComponent from "../../../../../../common/LoadingComponent";
import { ObjectPreviewIcon } from "mds";
import { BucketObject } from "../../../../../../api/consoleApi";
import { formatText, useT } from "i18n";

const PreviewFileContent = React.lazy(() => import("./PreviewFileContent"));

interface IPreviewFileProps {
  open: boolean;
  bucketName: string;
  actualInfo: BucketObject;
  onClosePreview: () => void;
}

const PreviewFileModal = ({
  open,
  bucketName,
  actualInfo,
  onClosePreview,
}: IPreviewFileProps) => {
  const t = useT();
  const previewFocus = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    // Move focus off the trigger and its tooltip when the preview opens.
    previewFocus.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [open]);
  return (
    <Fragment>
      <ModalWrapper
        modalOpen={open}
        title={formatText(t("Preview - {object}"), {
          object: actualInfo?.name || "",
        })}
        onClose={onClosePreview}
        wideLimit={false}
        titleIcon={<ObjectPreviewIcon />}
      >
        <div
          ref={previewFocus}
          tabIndex={-1}
          role="group"
          aria-label={t("Preview")}
        >
          <Suspense fallback={<LoadingComponent />}>
            <PreviewFileContent
              bucketName={bucketName}
              actualInfo={actualInfo}
            />
          </Suspense>
        </div>
      </ModalWrapper>
    </Fragment>
  );
};

export default PreviewFileModal;
