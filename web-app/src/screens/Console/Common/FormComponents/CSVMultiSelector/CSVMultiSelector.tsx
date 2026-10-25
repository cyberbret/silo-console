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
import React, {
  ChangeEvent,
  createRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  Fragment,
} from "react";
import get from "lodash/get";
import {
  AddIcon,
  Box,
  FieldHelp,
  InputBox,
  InputLabel,
  fieldLayout,
} from "mds";

interface ICSVMultiSelector {
  elements: string;
  name: string;
  label: string;
  tooltip?: string;
  commonPlaceholder?: string;
  withBorder?: boolean;
  onChange: (elements: string) => void;
}

const CSVMultiSelector = ({
  elements,
  name,
  label,
  tooltip = "",
  commonPlaceholder = "",
  onChange,
  withBorder = false,
}: ICSVMultiSelector) => {
  const [currentElements, setCurrentElements] = useState<string[]>([""]);
  const bottomList = createRef<HTMLDivElement>();

  // Use effect to get the initial values from props
  useEffect(() => {
    if (
      currentElements.length === 1 &&
      currentElements[0] === "" &&
      elements &&
      elements !== ""
    ) {
      const elementsSplit = elements.split(",");
      elementsSplit.push("");

      setCurrentElements(elementsSplit);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, currentElements]);

  // Use effect to send new values to onChange
  useEffect(() => {
    if (currentElements.length > 1) {
      const refScroll = bottomList.current;
      if (refScroll) {
        refScroll.scrollIntoView(false);
      }
    }
  }, [currentElements, bottomList]);

  const onChangeCallback = useCallback(
    (newString: string) => {
      onChange(newString);
    },
    [onChange],
  );

  // We avoid multiple re-renders / hang issue typing too fast
  const firstUpdate = useRef(true);
  useEffect(() => {
    if (firstUpdate.current) {
      firstUpdate.current = false;
      return;
    }
    const elementsString = currentElements
      .filter((element) => element.trim() !== "")
      .join(",");

    onChangeCallback(elementsString);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentElements]);

  // If the last input is not empty, we add a new one
  const addEmptyLine = (elementsUp: string[]) => {
    if (elementsUp[elementsUp.length - 1].trim() !== "") {
      const cpList = [...elementsUp];
      cpList.push("");
      setCurrentElements(cpList);
    }
  };

  // Onchange function for input box, we get the dataset-index & only update that value in the array
  const onChangeElement = (e: ChangeEvent<HTMLInputElement>) => {
    e.persist();

    let updatedElement = [...currentElements];
    const index = get(e.target, "dataset.index", "0");
    const indexNum = parseInt(index);
    updatedElement[indexNum] = e.target.value;

    setCurrentElements(updatedElement);
  };

  const inputs = currentElements.map((element, index) => {
    return (
      <InputBox
        key={`csv-multi-${name}-${index.toString()}`}
        id={`${name}-${index.toString()}`}
        label={""}
        aria-label={`${label} ${index + 1}`}
        name={`${name}-${index.toString()}`}
        value={currentElements[index]}
        onChange={onChangeElement}
        index={index}
        placeholder={commonPlaceholder}
        overlayIcon={index === currentElements.length - 1 ? <AddIcon /> : null}
        overlayAction={() => {
          addEmptyLine(currentElements);
        }}
      />
    );
  });

  return (
    <Fragment>
      <Box sx={fieldLayout} className={"inputItem"}>
        <InputLabel className="inputLabel" htmlFor={`${name}-0`}>
          <span>{label}</span>
          {tooltip !== "" && <FieldHelp text={tooltip} />}
        </InputLabel>
        <Box
          withBorders={withBorder}
          sx={{
            width: "100%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            "& > .inputItem": { flexGrow: 0 },
            overflowY: "auto",
            height: 150,
            position: "relative",
          }}
        >
          {inputs}
          <div ref={bottomList} />
        </Box>
      </Box>
    </Fragment>
  );
};
export default CSVMultiSelector;
