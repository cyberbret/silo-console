// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from "react";
import { useSelector } from "react-redux";
import { AppState, useAppDispatch } from "../../../../store";
import { setLanguage } from "../../../../systemSlice";
import { Lang, storeLanguage } from "../../../../i18n/lang";
import LanguageToggleIcon from "../../../../icons/LanguageToggleIcon";
import HeaderIconButton from "../PageHeaderWrapper/HeaderIconButton";

export const useLanguageAction = () => {
  const dispatch = useAppDispatch();

  const language = useSelector((state: AppState) => state.system.language);

  const toggleLanguage = () => {
    const next: Lang = language === "zh" ? "en" : "zh";

    dispatch(setLanguage(next));
    storeLanguage(next);
  };

  return {
    label: language === "zh" ? "Switch to English" : "切换到中文",
    onClick: toggleLanguage,
  };
};

const LanguageActivator = () => {
  const action = useLanguageAction();
  return (
    <HeaderIconButton
      id={"language-activator"}
      // Deliberately in the target language so speakers of the other
      // language can find their way back; not dictionary-driven.
      aria-label={action.label}
      onClick={action.onClick}
    >
      <LanguageToggleIcon />
    </HeaderIconButton>
  );
};

export default LanguageActivator;
