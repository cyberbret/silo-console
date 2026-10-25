// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { ThemeDefinitionProps } from "../../packages/mds/src/global/global.types";

// Both themes resolve the same semantic keys; :root[data-theme] selects values.
// Explicit complete subtrees prevent inherited MDS colors from leaking through.
const fg = "var(--foreground)";
const muted = "var(--muted-foreground)";
const floor = "var(--surface-1)";
const card = "var(--surface-3)";
const border = "var(--border)";
const hover = "var(--hover)";
const active = "var(--active)";
const danger = "var(--destructive)";
const dangerText = "var(--destructive-text)";
const brand = "var(--brand)";
const disabled = {
  border,
  text: muted,
  background: "var(--muted)",
  iconColor: muted,
};
const neutral = (background: string) => ({
  border: "transparent",
  text: fg,
  background,
  iconColor: fg,
});
const primary = {
  border: "transparent",
  text: floor,
  background: fg,
  iconColor: floor,
};
const regular = {
  enabled: { ...neutral("transparent"), border },
  disabled,
  hover: { ...neutral(hover), border },
  pressed: { ...neutral(active), border },
};
const badge = (color: string) => ({
  backgroundColor: `color-mix(in srgb, ${color} 15%, var(--background))`,
  textColor: fg,
});
const tag = (color: string) => ({
  background: badge(color).backgroundColor,
  label: fg,
  deleteColor: muted,
});
const notice = (color: string) => ({
  backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
  labelColor: fg,
});
const message = (color: string) => ({
  backgroundColor: notice(color).backgroundColor,
  borderColor: "transparent",
  textColor: fg,
});
const tabButtons = {
  labelColor: muted,
  backgroundColor: "transparent",
  hoverBackground: hover,
  hoverLabelColor: fg,
  selectedBackground: card,
  selectedLabelColor: fg,
  disabledBackgroundColor: "transparent",
  disabledColor: muted,
};
const menu = {
  textColor: muted,
  iconBorderColor: "transparent",
  iconBGColor: "transparent",
  hoverSelectedIconBorder: "transparent",
  hoverSelectedBackground: active,
  hoverSelectedColor: fg,
  sectionDividerColor: border,
  notificationColor: "var(--info)",
  dropArrowBackground: "transparent",
  dropArrowColor: muted,
};
const wizardStep = {
  stepLabelColor: muted,
  selectedStepBG: active,
  selectedStepLabelColor: fg,
  disabledLabelColor: muted,
};

const siloTheme = {
  bgColor: floor,
  fontColor: fg,
  borderColor: border,
  bulletColor: fg,
  logoColor: brand,
  logoLabelColor: fg,
  logoLabelInverse: floor,
  logoContrast: fg,
  logoContrastInverse: floor,
  loaderColor: fg,
  linkColor: fg,
  boxBackground: card,
  mutedText: muted,
  secondaryText: muted,
  signalColors: {
    main: fg,
    danger,
    good: "var(--success)",
    info: "var(--info)",
    warning: "var(--warning)",
    disabled: muted,
    dark: fg,
    clear: floor,
  },
  buttons: {
    regular,
    callAction: {
      enabled: primary,
      disabled,
      hover: primary,
      pressed: primary,
    },
    secondary: {
      enabled: {
        ...neutral("var(--tint)"),
        text: dangerText,
        iconColor: danger,
      },
      disabled,
      hover: {
        ...neutral("var(--tint-hover)"),
        text: dangerText,
        iconColor: danger,
      },
      pressed: { ...neutral(active), text: dangerText, iconColor: danger },
    },
    text: {
      enabled: neutral("transparent"),
      disabled: { ...disabled, background: "transparent" },
      hover: neutral(hover),
      pressed: neutral(active),
    },
    subAction: {
      enabled: neutral("var(--tint)"),
      disabled,
      hover: neutral("var(--tint-hover)"),
      pressed: neutral(active),
    },
  },
  login: {
    formBG: floor,
    bgFilter: "transparent",
    promoBG: "var(--surface-2)",
    promoHeader: fg,
    promoText: muted,
    footerElements: muted,
    footerDivider: border,
  },
  pageHeader: { background: floor, border, color: fg },
  tooltip: { background: fg, color: floor },
  commonInput: { labelColor: fg },
  checkbox: {
    checkBoxBorder: "var(--input)",
    checkBoxColor: fg,
    disabledBorder: border,
    disabledColor: muted,
  },
  iconButton: {
    buttonBG: "transparent",
    hoverBG: hover,
    activeBG: active,
    disabledBG: "transparent",
    color: muted,
  },
  dataTable: {
    border,
    disabledBorder: border,
    disabledBG: "var(--muted)",
    selected: fg,
    deletedDisabled: muted,
    hoverColor: hover,
  },
  backLink: { color: muted, arrow: muted, hover },
  inputBox: {
    border: "var(--input)",
    hoverBorder: border,
    color: fg,
    backgroundColor: card,
    placeholderColor: muted,
    error: dangerText,
    disabledBorder: border,
    disabledBackground: "var(--muted)",
    disabledText: muted,
    disabledPlaceholder: muted,
  },
  breadcrumbs: {
    border,
    backgroundColor: floor,
    linksColor: muted,
    textColor: fg,
    backButton: { border: "transparent", backgroundColor: "transparent" },
  },
  actionsList: {
    titleColor: fg,
    containerBorderColor: border,
    backgroundColor: card,
    optionsTextColor: muted,
    optionsBorder: border,
    optionsHoverTextColor: fg,
    disabledOptionsTextColor: muted,
  },
  screenTitle: { border, subtitleColor: muted, iconColor: muted },
  modalBox: {
    overlayColor: "rgb(0 0 0 / .32)",
    containerColor: "var(--surface-5)",
    closeColor: muted,
    closeHoverColor: fg,
    closeHoverBG: hover,
    titleColor: fg,
    iconColor: { default: muted, accept: "var(--success)", delete: danger },
  },
  switchButton: {
    onLabelColor: fg,
    offLabelColor: muted,
    switchBackground: "var(--accent)",
    onBackgroundColor: brand,
    bulletBorderColor: "transparent",
    bulletBGColor: card,
    disabledBackground: "var(--muted)",
    disabledBulletBorderColor: border,
    disabledBulletBGColor: muted,
    disabledOnBackground: "var(--accent)",
  },
  dropdownSelector: {
    backgroundColor: card,
    optionTextColor: fg,
    selectedTextColor: fg,
    selectedBGColor: active,
    hoverText: fg,
    hoverBG: hover,
    disabledText: muted,
  },
  readBox: {
    borderColor: border,
    backgroundColor: "var(--muted)",
    textColor: fg,
  },
  menu: {
    vertical: {
      ...menu,
      background: "var(--surface-2)",
      sectionLabelColor: muted,
      menuCollapseColor: muted,
      activeIndicatorColor: "transparent",
    },
    horizontal: {
      ...menu,
      menuHeaderBackground: "var(--surface-2)",
      barBackground: "var(--surface-2)",
      dropBackground: card,
      dropHoverSelectedColor: fg,
      noOptionsBar: border,
    },
  },
  tabs: {
    vertical: {
      backgroundColor: "transparent",
      buttons: tabButtons,
      borders: "transparent",
    },
    horizontal: {
      backgroundColor: "var(--muted)",
      selectedIndicatorColor: fg,
      buttons: tabButtons,
    },
  },
  codeEditor: {
    backgroundColor: "var(--muted)",
    textColor: fg,
    helpToolsBarBG: card,
    comment: muted,
    entityTag: fg,
    entity: fg,
    sublimelinterGutterMark: muted,
    constant: fg,
    string: fg,
    keyword: fg,
    markupBold: fg,
    codeEditorRegexp: fg,
  },
  tag: {
    default: tag(fg),
    secondary: tag(fg),
    warn: tag("var(--warning)"),
    alert: tag(danger),
    ok: tag("var(--success)"),
    grey: tag(fg),
  },
  badge: {
    default: badge(fg),
    secondary: badge(fg),
    warn: badge("var(--warning)"),
    alert: badge(danger),
    ok: badge("var(--success)"),
    grey: badge(fg),
  },
  snackbar: {
    default: notice("var(--info)"),
    success: notice("var(--success)"),
    warning: notice("var(--warning)"),
    error: notice(danger),
  },
  informativeMessage: {
    default: message("var(--info)"),
    success: message("var(--success)"),
    warning: message("var(--warning)"),
    error: message(danger),
  },
  wizard: {
    stepsBackground: "var(--surface-2)",
    vertical: wizardStep,
    modal: wizardStep,
  },
  slider: {
    railBG: "var(--accent)",
    bulletBG: brand,
    disabledRail: "var(--muted)",
    disabledBullet: muted,
  },
} satisfies ThemeDefinitionProps;

export const siloLightThemeOverrides = siloTheme;
export const siloDarkThemeOverrides = siloTheme;
