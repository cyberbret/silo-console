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

import { ModalPresence } from "common/ui/ModalPresence";
import React, {
  Fragment,
  Suspense,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { Box, Button, MainContainer, ProgressBar, Snackbar } from "mds";
import { ResponsiveMenuProvider } from "./Menu/ResponsiveMenu";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selFeatures, selSession } from "./consoleSlice";
import { api } from "api";
import { AppState, useAppDispatch } from "../../store";
import MainError from "./Common/MainError/MainError";
import {
  syncSidebarViewport,
  serverIsLoading,
  setServerNeedsRestart,
  setSnackBarMessage,
} from "../../systemSlice";
import MenuWrapper from "./Menu/MenuWrapper";
import LoadingComponent from "../../common/LoadingComponent";
import ConsoleRoutes from "../../navigation/ConsoleRoutes";
import AddBucketModal from "./Buckets/ListBuckets/AddBucket/AddBucketModal";
import { useT } from "i18n";

import TaskCenterHost from "./Common/ObjectManager/TaskCenterHost";

const Console = () => {
  const dispatch = useAppDispatch();
  const t = useT();
  const { pathname = "" } = useLocation();
  const session = useSelector(selSession);
  const features = useSelector(selFeatures);
  const snackBarMessage = useSelector(
    (state: AppState) => state.system.snackBar,
  );
  const needsRestart = useSelector(
    (state: AppState) => state.system.serverNeedsRestart,
  );
  const isServerLoading = useSelector(
    (state: AppState) => state.system.serverIsLoading,
  );
  const loadingProgress = useSelector(
    (state: AppState) => state.system.loadingProgress,
  );
  const createBucketOpen = useSelector(
    (state: AppState) => state.addBucket.addBucketOpen,
  );

  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);

  const obOnly = !!features?.includes("object-browser-only");

  useEffect(() => {
    dispatch({ type: "socket/OBConnect" });
  }, [dispatch]);

  const restartServer = () => {
    dispatch(serverIsLoading(true));
    api.service
      .restartService({})
      .then(() => {
        console.log("success restarting service");
        dispatch(serverIsLoading(false));
        dispatch(setServerNeedsRestart(false));
      })
      .catch((err) => {
        if (err.error.errorMessage === "Error 502") {
          dispatch(setServerNeedsRestart(false));
        }
        dispatch(serverIsLoading(false));
        console.log("failure restarting service");
        console.error(err.error);
      });
  };

  useLayoutEffect(() => {
    const sync = () => dispatch(syncSidebarViewport(window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [dispatch]);

  const closeSnackBar = () => {
    setOpenSnackbar(false);
    dispatch(setSnackBarMessage(""));
  };

  useEffect(() => {
    if (snackBarMessage.message === "") {
      setOpenSnackbar(false);
      return;
    }
    // Open SnackBar
    if (snackBarMessage.type !== "error") {
      setOpenSnackbar(true);
    }
  }, [snackBarMessage]);

  let hideMenu = false;
  if (features?.includes("hide-menu") || pathname.endsWith("/hop") || obOnly) {
    hideMenu = true;
  }

  return (
    <Fragment>
      {session && session.status === "ok" ? (
        <ResponsiveMenuProvider available={!hideMenu}>
          <MainContainer
            menu={!hideMenu ? <MenuWrapper /> : <Fragment />}
            mobileModeAuto={false}
          >
            <Fragment>
              {needsRestart && (
                <Snackbar
                  onClose={() => {}}
                  open={needsRestart}
                  variant={"warning"}
                  message={
                    <Box
                      sx={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                      }}
                    >
                      {isServerLoading ? (
                        <Fragment>
                          <ProgressBar
                            barHeight={3}
                            transparentBG
                            sx={{
                              width: "100%",
                              position: "absolute",
                              top: 0,
                              left: 0,
                            }}
                          />
                          <span>{t("The server is restarting.")}</span>
                        </Fragment>
                      ) : (
                        <Fragment>
                          {t(
                            "The instance needs to be restarted for configuration changes to take effect.",
                          )}{" "}
                          <Button
                            id={"restart-server"}
                            variant="secondary"
                            onClick={() => {
                              restartServer();
                            }}
                            label={t("Restart")}
                          />
                        </Fragment>
                      )}
                    </Box>
                  }
                  autoHideDuration={0}
                />
              )}
              {loadingProgress < 100 && (
                <ProgressBar
                  barHeight={3}
                  variant="determinate"
                  value={loadingProgress}
                  sx={{ width: "100%", position: "absolute", top: 0, left: 0 }}
                />
              )}
              <ModalPresence open={Boolean(createBucketOpen)}>
                {createBucketOpen && <AddBucketModal />}
              </ModalPresence>
              <MainError />
              <Snackbar
                onClose={closeSnackBar}
                open={openSnackbar}
                message={snackBarMessage.message}
                variant={snackBarMessage.type === "error" ? "error" : "default"}
                autoHideDuration={snackBarMessage.type === "error" ? 10 : 5}
                condensed
              />
              <TaskCenterHost />
              <ConsoleRoutes />
            </Fragment>
          </MainContainer>
        </ResponsiveMenuProvider>
      ) : null}
    </Fragment>
  );
};

export default Console;
