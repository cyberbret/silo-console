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

import { ModalPresence } from "common/ui/ModalPresence";
import React, { Fragment, useEffect, useState } from "react";
import {
  Box,
  Button,
  FormLayout,
  InputBox,
  InspectMenuIcon,
  PageLayout,
  PasswordKeyIcon,
  Switch,
} from "mds";
import { useSelector } from "react-redux";
import {
  deleteCookie,
  getCookieValue,
  performDownload,
} from "../../../common/utils";
import {
  selDistSet,
  setErrorSnackMessage,
  setHelpName,
} from "../../../systemSlice";
import { useAppDispatch } from "../../../store";
import { i18nKey, useLocalizedLink, useT } from "i18n";
import ModalWrapper from "../Common/ModalWrapper/ModalWrapper";
import DistributedOnly from "../Common/DistributedOnly/DistributedOnly";
import KeyRevealer from "./KeyRevealer";
import PageHeaderWrapper from "../Common/PageHeaderWrapper/PageHeaderWrapper";

import { inspectDownload } from "./inspectDownload";

const Inspect = () => {
  const dispatch = useAppDispatch();
  const distributedSetup = useSelector(selDistSet);
  const t = useT();
  const localize = useLocalizedLink();

  const [volumeName, setVolumeName] = useState<string>("");
  const [inspectPath, setInspectPath] = useState<string>("");
  const [isEncrypt, setIsEncrypt] = useState<boolean>(true);

  const [decryptionKey, setDecryptionKey] = useState<string>("");

  const [insFileName, setInsFileName] = useState<string>("");

  const [touched, setTouched] = useState({ volume: false, path: false });
  const [submitted, setSubmitted] = useState(false);
  const volumeError = !volumeName.trim()
    ? t("This field is required")
    : volumeName.trimStart().startsWith("/")
      ? t("Volume/Bucket name cannot start with /")
      : "";
  const pathError = !inspectPath.trim()
    ? t("This field is required")
    : inspectPath.trimStart().startsWith("/")
      ? t("Path cannot start with /")
      : "";
  const isFormValid = !volumeError && !pathError;

  const performInspect = async () => {
    setSubmitted(true);
    if (!isFormValid) return;
    let basename = document.baseURI.replace(window.location.origin, "");
    const urlOfInspectApi = `${basename}api/v1/admin/inspect?volume=${encodeURIComponent(volumeName)}&file=${encodeURIComponent(inspectPath)}&encrypt=${isEncrypt}`;

    inspectDownload(urlOfInspectApi, t("An error occurred"))
      .then(({ blob, filename }) => {
        const decryptKey = getCookieValue(filename) || "";

        performDownload(blob, filename);
        setInsFileName(filename);
        setDecryptionKey(decryptKey);
      })
      .catch((err) => {
        dispatch(setErrorSnackMessage(err));
      });
  };

  const resetForm = () => {
    setVolumeName("");
    setInspectPath("");
    setIsEncrypt(true);
    setTouched({ volume: false, path: false });
    setSubmitted(false);
  };

  const onCloseDecKeyModal = () => {
    deleteCookie(insFileName);
    setDecryptionKey("");
    resetForm();
  };

  useEffect(() => {
    dispatch(setHelpName("inspect"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <PageHeaderWrapper label={i18nKey("Inspect")} titleElement="h1" help />

      <PageLayout>
        {!distributedSetup ? (
          <DistributedOnly
            iconComponent={<InspectMenuIcon />}
            entity={i18nKey("Inspect")}
          />
        ) : (
          <FormLayout sx={{ maxWidth: 760, padding: 24, gap: 16 }}>
            <form
              noValidate
              autoComplete="off"
              onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                performInspect();
              }}
            >
              <InputBox
                id="inspect_volume"
                name="inspect_volume"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setVolumeName(e.target.value);
                }}
                label={t("Volume or Bucket Name")}
                value={volumeName}
                error={touched.volume || submitted ? volumeError : ""}
                onBlur={() =>
                  setTouched((current) => ({ ...current, volume: true }))
                }
                required
                placeholder={"test-bucket"}
              />
              <InputBox
                id="inspect_path"
                name="inspect_path"
                error={touched.path || submitted ? pathError : ""}
                onBlur={() =>
                  setTouched((current) => ({ ...current, path: true }))
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setInspectPath(e.target.value);
                }}
                label={t("File or Path to inspect")}
                value={inspectPath}
                required
                placeholder={"test*/xl.meta"}
              />
              <Switch
                label={t("Encrypt")}
                indicatorLabels={[t("True"), t("False")]}
                checked={isEncrypt}
                value={"true"}
                id="inspect_encrypt"
                name="inspect_encrypt"
                onChange={() => {
                  setIsEncrypt(!isEncrypt);
                }}
              />
              <Box
                role="note"
                sx={{
                  marginTop: 24,
                  padding: 16,
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-control)",
                  color: "var(--muted-foreground)",
                  fontSize: "var(--fs-body)",
                  lineHeight: "var(--lh-body)",
                  "& a": {
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  },
                }}
              >
                {t(
                  "Recursive inspections can be expensive. Limit the bucket and path before starting.",
                )}{" "}
                {t("Open Help for examples, or read the")}{" "}
                <a
                  href={localize(
                    "https://silo.pgsty.com/operations/troubleshooting/",
                  )}
                  target="_blank"
                  rel="noopener"
                >
                  {t("documentation")}
                </a>
                .
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  marginTop: 24,
                  gap: 8,
                }}
              >
                <Button
                  id={"inspect-clear-button"}
                  type="button"
                  variant="regular"
                  data-test-id="inspect-clear-button"
                  onClick={resetForm}
                  label={t("Clear")}
                />
                <Button
                  id={"inspect-start"}
                  type="submit"
                  variant={"callAction"}
                  data-test-id="inspect-submit-button"
                  disabled={!isFormValid}
                  label={t("Inspect")}
                />
              </Box>
            </form>
          </FormLayout>
        )}
        <ModalPresence open={Boolean(decryptionKey)}>
          {decryptionKey ? (
            <ModalWrapper
              modalOpen={true}
              title={t("Inspect Decryption Key")}
              onClose={onCloseDecKeyModal}
              titleIcon={<PasswordKeyIcon />}
            >
              <Fragment>
                <Box>
                  {t(
                    "This will be displayed only once. It cannot be recovered.",
                  )}
                  <br />
                  {t("Use secure medium to share this key.")}
                </Box>
                <form
                  noValidate
                  onSubmit={() => {
                    return false;
                  }}
                >
                  <KeyRevealer value={decryptionKey} />
                </form>
              </Fragment>
            </ModalWrapper>
          ) : null}
        </ModalPresence>
      </PageLayout>
    </Fragment>
  );
};

export default Inspect;
