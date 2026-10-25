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
import * as React from "react";
import { useEffect, useRef } from "react";
import {
  ActionId,
  ActionImpl,
  KBarPortal,
  KBarPositioner,
  KBarResults,
  KBarSearch,
  useKBar,
  useMatches,
  VisualState,
} from "kbar";

import {
  Elevated,
  MenuExpandedIcon,
  useFluidHover,
  FluidHoverHighlight,
  listPopupStyle,
  useModalActive,
} from "mds";
import styled from "styled-components";
import { typography } from "../../common/ui/typography";
import { useT } from "i18n";
import {
  useOverlayIntent,
  useOverlayPending,
} from "../../common/ui/overlayIntent";

const Panel = styled(Elevated)`
  ${listPopupStyle}
  pointer-events: auto;
  width: min(600px, calc(100vw - 32px));
  overflow: hidden;
  border-radius: var(--radius-popover, 12px);
`;
const Search = styled(KBarSearch)`
  ${typography.body}
  width: 100%;
  height: calc(var(--control-height, 36px) + 16px);
  padding: 8px 16px;
  box-sizing: border-box;
  border: 0;
  border-bottom: 1px solid var(--border);
  color: var(--foreground);
  background: transparent;
  &&:focus-visible {
    outline: none;
  }
  @media (pointer: coarse) {
    font-size: 16px;
  }
`;
const Results = styled.div`
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: 4px;
  [data-fluid-highlight] {
    z-index: -1;
  }
  .commandGroup {
    ${typography.small} color: var(--muted-foreground);
    padding: 8px 12px;
  }
`;
const CommandRow = styled.div`
  ${typography.body}
  display: flex;
  align-items: center;
  gap: var(--gap, 8px);
  min-height: var(--control-height, 36px);
  padding: 0 var(--control-padding, 12px);
  border-radius: var(--radius-control, 8px);
  cursor: pointer;
  color: var(--muted-foreground);
  &[data-fluid-hover] {
    color: var(--foreground);
  }
  .commandIcon {
    display: flex;
    width: var(--icon-size, 16px);
    flex-shrink: 0;
  }
  svg {
    width: var(--icon-size, 16px);
    height: var(--icon-size, 16px);
    fill: currentColor;
  }
  .commandName {
    flex: 1;
    min-width: 0;
  }
  .commandAncestors,
  .commandSubtitle {
    ${typography.small} color: var(--muted-foreground);
  }
  .commandChevron {
    display: flex;
    transform: rotate(90deg);
  }
  kbd {
    ${typography.small} padding: 2px 4px;
    background: var(--muted);
    border-radius: 4px;
  }
`;

function CommandPopup({ children }: { children: React.ReactNode }) {
  const t = useT();
  const panel = useRef<HTMLDivElement>(null);
  const { visualState, query } = useKBar((state) => ({
    visualState: state.visualState,
  }));
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target)
      )
        query.setVisualState(VisualState.animatingOut);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [query]);
  return (
    <Panel
      ref={panel}
      offset={2}
      shadowLevel={3}
      role="dialog"
      aria-label={t("Search")}
      data-silo-popup="true"
      data-closing={visualState === VisualState.animatingOut}
    >
      {children}
    </Panel>
  );
}

const CommandBar = () => {
  const t = useT();
  const modalActive = useModalActive();
  const pendingModal = useOverlayPending("command");
  const { query, visualState } = useKBar((state) => ({
    visualState: state.visualState,
  }));
  useOverlayIntent(visualState !== VisualState.hidden, "command");
  useEffect(() => {
    query.disable(modalActive || pendingModal);
    return () => query.disable(false);
  }, [modalActive, pendingModal, query]);

  return (
    <KBarPortal>
      <KBarPositioner style={{ zIndex: 9999 }}>
        <CommandPopup>
          <Search placeholder={t("Search")} aria-label={t("Search")} />
          <RenderResults />
        </CommandPopup>
      </KBarPositioner>
    </KBarPortal>
  );
};

function RenderResults() {
  const { results, rootActionId } = useMatches();
  const list = useRef<HTMLDivElement>(null);
  const { activeIndex, query } = useKBar((state) => ({
    activeIndex: state.activeIndex,
  }));
  const hover = useFluidHover(list, {
    gapClick: { maxDistance: 8 },
    onActiveChange: (index) => {
      const item =
        index === null
          ? undefined
          : list.current?.querySelectorAll<HTMLElement>("[data-fluid-index]")[
              index
            ];
      if (item && Number(item.dataset.fluidIndex) !== activeIndex)
        query.setActiveIndex(Number(item.dataset.fluidIndex));
    },
  });
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const items = Array.from(
        list.current?.querySelectorAll<HTMLElement>("[data-fluid-index]") || [],
      );
      const index = items.findIndex(
        (item) => Number(item.dataset.fluidIndex) === activeIndex,
      );
      hover.setActiveIndex(index >= 0 ? index : null);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, results, hover]);
  return (
    <Results ref={list}>
      <FluidHoverHighlight hover={hover} />
      <KBarResults
        items={results}
        onRender={({ item }) =>
          typeof item === "string" ? (
            <div className="commandGroup">{item}</div>
          ) : (
            <ResultItem
              index={results.indexOf(item)}
              action={item}
              currentRootActionId={`${rootActionId}`}
            />
          )
        }
      />
    </Results>
  );
}

const ResultItem = React.forwardRef(
  (
    {
      action,
      index,
      currentRootActionId,
    }: {
      action: ActionImpl;
      index: number;
      currentRootActionId: ActionId;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const ancestors = React.useMemo(() => {
      if (!currentRootActionId) return action.ancestors;
      const index = action.ancestors.findIndex(
        (ancestor) => ancestor.id === currentRootActionId,
      );
      // +1 removes the currentRootAction; e.g.
      // if we are on the "Set theme" parent action,
      // the UI should not display "Set theme… > Dark"
      // but rather just "Dark"
      return action.ancestors.slice(index + 1);
    }, [action.ancestors, currentRootActionId]);

    return (
      <CommandRow
        ref={ref}
        data-fluid-index={index}
        data-fluid-key={action.id}
        data-fluid-activator="true"
      >
        <span className="commandIcon" aria-hidden="true">
          {action.icon}
        </span>
        <span className="commandName">
          {ancestors.length > 0 && (
            <span className="commandAncestors">
              {ancestors.map((ancestor) => ancestor.name).join(" › ")} ›{" "}
            </span>
          )}
          <span>{action.name}</span>
          {action.subtitle && (
            <span className="commandSubtitle"> {action.subtitle}</span>
          )}
        </span>
        {action.shortcut?.map((shortcut) => (
          <kbd key={shortcut} aria-hidden="true">
            {shortcut}
          </kbd>
        ))}
        <span className="commandChevron" aria-hidden="true">
          <MenuExpandedIcon />
        </span>
      </CommandRow>
    );
  },
);

export default CommandBar;
