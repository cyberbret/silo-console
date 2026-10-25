// This file is part of MinIO Design System
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

import React, { FC, useLayoutEffect, useRef, useState } from "react";
import styled, { CSSObject } from "styled-components";
import get from "lodash/get";
import { createPortal } from "react-dom";
import {
  DateTimeSelectorProps,
  StylesOverrideProps,
} from "./DateTimeInput.types";
import Box from "../Box/Box";
import CalendarIcon from "../Icons/CalendarIcon";
import TimeIcon from "../Icons/TimeIcon";
import DateSelector from "./DateSelector";
import TimeSelector from "./TimeSelector";
import { lightColors } from "../../global/themes";
import { DateTime } from "luxon";
import SelectorContainer from "../../global/SelectorContainer";
import { useControlLabels } from "../../global/ControlLabels";

const globalWidth = 315;

const OptionChangeButton = styled.button(({ theme }) => ({
  minHeight: 36,
  minWidth: 36,
  "@media (pointer: coarse)": { minHeight: 40, minWidth: 40 },
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  border: `2px solid ${get(theme, "borderColor", lightColors.borderColor)}`,
  borderRadius: "var(--radius-control,8px)",
  backgroundColor: get(theme, "bgColor", lightColors.white),
  color: get(theme, "signalColors.main", lightColors.mainBlue),
  fontSize: 14,
  fontWeight: "bold",
  "& svg": {
    width: 12,
    height: 12,
  },
  "&.selected": {
    backgroundColor: get(theme, "signalColors.main", lightColors.mainBlue),
    color: get(theme, "bgColor", lightColors.white),
    borderColor: get(theme, "signalColors.main", lightColors.mainBlue),
    boxShadow: `0px 3px 6px #00000029;`,
  },
}));

const DateTimeContainer = styled.div<StylesOverrideProps>(
  ({ theme, sx, isPortal, mode }) => ({
    position: isPortal ? "absolute" : "relative",
    border: `1px solid ${get(theme, "borderColor", lightColors.borderColor)}`,
    backgroundColor: get(theme, "bgColor", lightColors.white),
    width: `min(${globalWidth}px, calc(100vw - 16px))`,
    maxHeight: "calc(100dvh - 16px)",
    overflowY: "auto",
    boxSizing: "border-box",
    minHeight: mode === "all" ? 340 : 285,
    boxShadow: `0px 0px 10px #00000029`,
    padding: 24,
    borderRadius: "var(--radius-card,12px)",
    "@media (pointer: coarse)": {
      width: "min(360px, calc(100vw - 16px))",
      padding: 12,
    },
    "& button:focus-visible": {
      outline: "2px solid var(--focus-ring)",
      outlineOffset: 1,
    },
    "& .modeBar": {
      display: "flex",
      gap: 16,
      marginBottom: 18,
    },
    ...sx,
  }),
);

const calcElementPosition = (
  anchorEl: HTMLElement | null,
  panel: HTMLElement,
): CSSObject => {
  const anchor = anchorEl?.getBoundingClientRect();
  const popup = panel.getBoundingClientRect();
  const below = anchor?.bottom ?? 8;
  const above = (anchor?.top ?? 8) - popup.height;
  return {
    left: Math.max(
      8,
      Math.min(
        (anchor?.right ?? popup.width + 8) - popup.width,
        innerWidth - popup.width - 8,
      ),
    ),
    top: Math.max(
      8,
      Math.min(
        below + popup.height <= innerHeight - 8 ? below : above,
        innerHeight - popup.height - 8,
      ),
    ),
  };
};

const DateTimeSelector: FC<DateTimeSelectorProps> = ({
  mode = "all",
  onChange,
  maxDate,
  minDate,
  value,
  id,
  label,
  usePortal = true,
  anchorEl = null,
  secondsSelector,
  timeFormat = "24h",
  onClose,
  open = false,
  sx,
}) => {
  const [currentView, setCurrentView] = useState<"calendar" | "time">(
    "calendar",
  );
  const [coords, setCoords] = useState<CSSObject | null>(null);

  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const labels = useControlLabels();

  useLayoutEffect(() => {
    if (!open || !usePortal) {
      setCoords(null);
      return;
    }
    const popup = panel.current;
    if (!popup) return;
    const measure = () => {
      const next = calcElementPosition(anchorEl, popup);
      setCoords((previous) =>
        previous?.left === next.left && previous?.top === next.top
          ? previous
          : next,
      );
    };
    const resize = () => close.current?.();
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(popup);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, usePortal, anchorEl]);

  useLayoutEffect(() => {
    const popup = panel.current;
    if (
      !open ||
      !popup ||
      (usePortal && !coords) ||
      popup.contains(document.activeElement)
    )
      return;
    (
      popup.querySelector<HTMLElement>(".columnSelector button.selected") ||
      popup.querySelector<HTMLElement>(
        ".react-calendar__tile--active:not(:disabled)",
      ) ||
      popup.querySelector<HTMLElement>("button:not(:disabled)") ||
      popup
    ).focus({ preventScroll: true });
  }, [open, currentView, !!coords, usePortal]);

  const calendarChange = (value: DateTime | null) => {
    onChange(value);

    if (mode === "all") {
      setCurrentView("time");
    }
    if (mode === "date" && onClose) {
      onClose();
    }
  };

  const closeSelector = () => {
    if (onClose) {
      onClose();
    }
  };

  if (usePortal && !open) {
    return null;
  }

  const picker = (
    <DateTimeContainer
      ref={panel}
      role="dialog"
      aria-label={
        label || (mode === "date" ? labels.chooseDate : labels.chooseDateTime)
      }
      tabIndex={-1}
      data-silo-popup="true"
      data-popup-anchor={anchorEl?.id}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
        }
        if (event.key === "Tab") {
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              "button:not(:disabled), [tabindex='0']",
            ),
          );
          const first = controls[0];
          const last = controls.at(-1);
          if (
            (event.shiftKey && document.activeElement === first) ||
            (!event.shiftKey && document.activeElement === last)
          ) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
          }
        }
      }}
      onKeyUp={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          closeSelector();
        }
      }}
      mode={mode}
      onClick={(e) => e.stopPropagation()}
      id={`timeSelector-${id}`}
      isPortal={usePortal}
      sx={{
        ...sx,
        ...coords,
        visibility: usePortal && !coords ? "hidden" : undefined,
      }}
    >
      {mode === "all" && value && (
        <Box className={"modeBar"}>
          <OptionChangeButton
            type="button"
            className={currentView === "calendar" ? "selected" : ""}
            onClick={() => setCurrentView("calendar")}
          >
            <CalendarIcon />
            <span>
              {value
                ?.setLocale(labels.calendarLocale)
                .toLocaleString(DateTime.DATE_MED) || ""}
            </span>
          </OptionChangeButton>
          <OptionChangeButton
            type="button"
            className={currentView === "time" ? "selected" : ""}
            onClick={() => setCurrentView("time")}
          >
            <TimeIcon />
            <span>
              {value?.toFormat(
                `${timeFormat === "24h" ? "HH" : "hh"}:mm${
                  secondsSelector ? ":ss" : ""
                }${timeFormat === "12h" ? " a" : ""}`,
              ) || ""}
            </span>
          </OptionChangeButton>
        </Box>
      )}
      {currentView === "calendar" && (
        <DateSelector
          minDate={minDate}
          maxDate={maxDate}
          value={value}
          onChange={calendarChange}
        />
      )}
      {currentView === "time" && (
        <TimeSelector
          secondsSelector={secondsSelector}
          timeFormat={timeFormat}
          value={value}
          onChange={onChange}
          completeCallback={closeSelector}
        />
      )}
    </DateTimeContainer>
  );

  if (usePortal) {
    return createPortal(
      <SelectorContainer onClick={closeSelector}>{picker}</SelectorContainer>,
      anchorEl?.closest("dialog") || document.body,
    );
  }

  return picker;
};

export default DateTimeSelector;
