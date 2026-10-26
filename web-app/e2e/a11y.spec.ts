// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import AxeBuilder from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";
import { stat } from "node:fs/promises";
import { test, expect } from "./fixtures/guiTest";
import { guiDemo } from "./fixtures/guiResources";
import {
  attachGuiEvidence,
  guiObjectRow,
  guiScreens,
  guiVisualVariants,
  openGuiScreen,
} from "./fixtures/guiScreens";

async function audit(page: Page, info: TestInfo) {
  const result = await new AxeBuilder({ page }).analyze();
  await info.attach("whole-page-axe", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  expect(
    result.violations.filter(
      (violation) =>
        violation.impact === "moderate" ||
        violation.impact === "serious" ||
        violation.impact === "critical",
    ),
  ).toEqual([]);
}

for (const variant of guiVisualVariants)
  for (const screen of guiScreens) {
    // The dark matrix also exercises the complete Chinese interface.
    const language = variant.theme === "dark" ? "zh" : "en";
    test(`whole-page axe ${screen.id} ${variant.id} ${language}`, async ({
      browser,
    }, info) => {
      const { context, page, pageErrors } = await openGuiScreen(
        browser,
        screen,
        variant,
        language,
      );
      try {
        await audit(page, info);
        await attachGuiEvidence(page, info, pageErrors);
      } finally {
        await context.close();
      }
    });
  }

const screenNamed = (id: string) => {
  const screen = guiScreens.find((candidate) => candidate.id === id);
  if (!screen) throw new Error(`Missing GUI screen ${id}`);
  return screen;
};

type DetailTabScreen = {
  id: string;
  screen: Parameters<typeof openGuiScreen>[1];
  tabs: readonly RegExp[];
  heading: RegExp;
  path?: string;
  api?: readonly string[];
  ready: (page: Page) => Promise<void>;
};

const groupScreen: DetailTabScreen["screen"] = {
  id: "group-details",
  account: "admin",
  path: "/identity/groups/analysts",
  api: ["/group/analysts"],
  ready: async (page) => {
    await expect(
      page.getByRole("heading", { name: "analysts", exact: true, level: 1 }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("grid", { name: /^(Users|用户)$/ })
        .getByText(guiDemo.user, {
          exact: true,
        }),
    ).toBeVisible();
  },
};
const bucketAdminPath = `/buckets/${guiDemo.bucket}/admin`;
const accessAuditAPI = [
  `/bucket-policy/${guiDemo.bucket}`,
  `/bucket-users/${guiDemo.bucket}`,
];

// These existing demo subjects are only read. Each state selects the real tab;
// inactive panels cannot accidentally supply a missing heading for its content.
// This separate matrix does not change the 36 approved visual comparisons.
const detailTabScreens: readonly DetailTabScreen[] = [
  {
    id: "user-groups",
    screen: screenNamed("user-overview"),
    tabs: [/^(Groups|用户组)$/],
    heading: /^(Groups|用户组)$/,
    ready: async (page) => {
      await expect(
        page
          .getByRole("grid", { name: /^(Groups|用户组)$/ })
          .getByText("analysts", { exact: true }),
      ).toBeVisible();
    },
  },
  {
    id: "user-policies",
    screen: screenNamed("user-overview"),
    tabs: [/^(Policies|策略)$/],
    heading: /^(Policies|策略)$/,
    ready: async (page) => {
      await expect(
        page
          .getByRole("grid", { name: /^(Policies|策略)$/ })
          .getByText("readwrite", { exact: true }),
      ).toBeVisible();
    },
  },
  {
    id: "user-access-keys",
    screen: screenNamed("user-overview"),
    tabs: [/^(Service Accounts|服务账号)$/],
    heading: /^(Access Keys|访问密钥)$/,
    api: [`/user/${guiDemo.user}/service-accounts`],
    ready: async (page) => {
      await expect(
        page.getByRole("heading", {
          name: /^(No access keys yet|暂无访问密钥)$/,
          level: 3,
        }),
      ).toBeVisible();
    },
  },
  {
    id: "group-members",
    screen: groupScreen,
    tabs: [/^(Members|成员)$/],
    heading: /^(Members|成员)$/,
    ready: groupScreen.ready,
  },
  {
    id: "group-policies",
    screen: groupScreen,
    tabs: [/^(Policies|策略)$/],
    heading: /^(Policies|策略)$/,
    ready: async (page) => {
      await expect(
        page
          .getByRole("grid", { name: /^(Policies|策略)$/ })
          .getByText("readonly", { exact: true }),
      ).toBeVisible();
    },
  },
  ...(["policies", "users"] as const).map((tab) => ({
    id: `bucket-access-${tab}`,
    screen: screenNamed("bucket-summary"),
    tabs: [
      /^(Access|访问权限)$/,
      tab === "policies" ? /^(Policies|策略)$/ : /^(Users|用户)$/,
    ],
    heading: /^(Access Audit|访问审计)$/,
    path: `${bucketAdminPath}/access`,
    api: accessAuditAPI,
    ready: async (page: Page) => {
      await expect(
        page
          .getByRole("grid", {
            name: tab === "policies" ? /^(Policies|策略)$/ : /^(Users|用户)$/,
          })
          .getByText(tab === "policies" ? "readwrite" : guiDemo.user, {
            exact: true,
          }),
      ).toBeVisible();
    },
  })),
  {
    id: "bucket-anonymous",
    screen: screenNamed("bucket-summary"),
    tabs: [/^(Anonymous|匿名)$/],
    heading: /^(Anonymous Access|匿名访问)$/,
    path: `${bucketAdminPath}/prefix`,
    api: [`/bucket/${guiDemo.bucket}/access-rules`],
    ready: async (page) => {
      await expect(
        page.getByRole("heading", {
          name: /^(No anonymous access rules|暂无匿名访问规则)$/,
          level: 3,
        }),
      ).toBeVisible();
    },
  },
  {
    id: "bucket-events",
    screen: screenNamed("bucket-summary"),
    tabs: [/^(Events|事件)$/],
    heading: /^(Events|事件)$/,
    path: `${bucketAdminPath}/events`,
    api: [`/buckets/${guiDemo.bucket}/events`],
    ready: async (page) => {
      await expect(
        page.getByRole("heading", {
          name: /^(No event subscriptions yet|暂无事件订阅)$/,
          level: 3,
        }),
      ).toBeVisible();
    },
  },
  {
    id: "bucket-lifecycle",
    screen: screenNamed("bucket-summary"),
    tabs: [/^(Lifecycle|生命周期)$/],
    heading: /^(Lifecycle Rules|生命周期规则)$/,
    path: `${bucketAdminPath}/lifecycle`,
    api: [`/buckets/${guiDemo.bucket}/lifecycle`],
    ready: async (page) => {
      await expect(
        page.getByRole("heading", {
          name: /^(No lifecycle rules yet|暂无生命周期规则)$/,
          level: 3,
        }),
      ).toBeVisible();
    },
  },
  {
    id: "bucket-replication",
    screen: screenNamed("bucket-summary"),
    tabs: [/^(Replication|复制)$/],
    heading: /^(Replication|复制)$/,
    path: `${bucketAdminPath}/replication`,
    api: [`/buckets/${guiDemo.bucket}/replication`],
    ready: async (page) => {
      await expect(
        page.getByRole("heading", {
          name: /^(No replication rules yet|暂无复制规则)$/,
          level: 3,
        }),
      ).toBeVisible();
    },
  },
];

for (const variant of guiVisualVariants)
  for (const screen of detailTabScreens) {
    const language = variant.theme === "dark" ? "zh" : "en";
    test(`whole-page axe detail tab ${screen.id} ${variant.id} ${language}`, async ({
      browser,
    }, info) => {
      const { context, page, pageErrors } = await openGuiScreen(
        browser,
        screen.screen,
        variant,
        language,
      );
      const writes: { method: string; path: string }[] = [];
      page.on("request", (request) => {
        const path = new URL(request.url()).pathname;
        if (
          path.startsWith("/api/") &&
          !["GET", "HEAD", "OPTIONS"].includes(request.method())
        )
          writes.push({ method: request.method(), path });
      });
      try {
        const responses = (screen.api ?? []).map((path) =>
          page.waitForResponse(
            (response) =>
              response.request().method() === "GET" &&
              new URL(response.url()).pathname === `/api/v1${path}`,
          ),
        );
        for (const name of screen.tabs) {
          const tab = page.getByRole("tab", { name, exact: true });
          await expect(tab).toBeEnabled();
          await tab.click();
          await expect(tab).toHaveAttribute("aria-selected", "true");
        }
        const apiResponses = await Promise.all(
          responses.map(async (pending) => {
            const response = await pending;
            const path = new URL(response.url()).pathname;
            const status = response.status();
            if (screen.id === "bucket-lifecycle") {
              expect(path).toBe(`/api/v1/buckets/${guiDemo.bucket}/lifecycle`);
              expect(status).toBe(404);
              const body = await response.json();
              expect(body).toEqual({
                detailedMessage:
                  "error bucket life cycle configuration not found",
                message: "The lifecycle configuration does not exist",
              });
              return { path, status, body };
            }
            expect(status).toBe(200);
            return { path, status };
          }),
        );
        await info.attach("detail-tab-api-responses", {
          contentType: "application/json",
          body: JSON.stringify(apiResponses, null, 2),
        });
        if (screen.path) expect(new URL(page.url()).pathname).toBe(screen.path);
        await screen.ready(page);
        if (screen.id === "bucket-lifecycle")
          await expect(page.getByRole("alert")).toHaveCount(0);
        await expect(
          page.getByRole("heading", { name: screen.heading, level: 2 }),
        ).toBeVisible();
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        const headings = await page.getByRole("heading").evaluateAll((nodes) =>
          nodes.map((node) => ({
            text: node.textContent,
            level: Number(
              node.getAttribute("aria-level") || node.tagName.slice(1),
            ),
          })),
        );
        expect(headings[0].level).toBe(1);
        for (let index = 1; index < headings.length; index++)
          expect(
            headings[index].level,
            JSON.stringify(headings),
          ).toBeLessThanOrEqual(headings[index - 1].level + 1);
        // Match responsive.spec.ts: measure the page and main content, while
        // allowing wider tables to scroll within their own containers.
        const bounds = await page.evaluate(() => ({
          document: document.documentElement.scrollWidth,
          viewport: innerWidth,
          main: [...document.querySelectorAll<HTMLElement>(".mainPage")].map(
            (node) => ({ scroll: node.scrollWidth, width: node.clientWidth }),
          ),
        }));
        await info.attach("detail-tab-layout-bounds", {
          body: JSON.stringify(bounds, null, 2),
          contentType: "application/json",
        });
        expect(bounds.document).toBeLessThanOrEqual(bounds.viewport);
        expect(bounds.main.length).toBeGreaterThan(0);
        for (const main of bounds.main)
          expect(main.scroll).toBeLessThanOrEqual(main.width + 1);
        await audit(page, info);
        expect(writes, "Opening detail tabs must remain read-only").toEqual([]);
        await info.attach("detail-tab-heading-order", {
          body: JSON.stringify({ headings, writes }, null, 2),
          contentType: "application/json",
        });
        await info.attach("detail-tab-screenshot", {
          body: await page.screenshot({ fullPage: true }),
          contentType: "image/png",
        });
        await attachGuiEvidence(page, info, pageErrors);
      } finally {
        await context.close();
      }
    });
  }

test("whole-page axe: mobile Inspect help with its mounted toolbar", async ({
  browser,
}, info) => {
  const { context, page, pageErrors } = await openGuiScreen(
    browser,
    screenNamed("inspect"),
    guiVisualVariants[2],
  );
  try {
    await page.getByRole("button", { name: "Open help", exact: true }).click();
    const panel = page.locator(".help-menu-panel");
    await expect(panel).toBeVisible();
    await expect(panel.locator("#keyboard-shortcuts-help")).toBeFocused();
    await audit(page, info);
    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible();
    await attachGuiEvidence(page, info, pageErrors);
  } finally {
    await context.close();
  }
});

test("whole-page axe: Chinese object context menu in dark mode", async ({
  browser,
}, info) => {
  const { context, page, pageErrors } = await openGuiScreen(
    browser,
    screenNamed("objects-prefix"),
    guiVisualVariants[1],
    "zh",
  );
  try {
    const row = guiObjectRow(page, guiDemo.readme.key);
    await row.focus();
    await row.press("Shift+F10");
    const menu = page.getByRole("menu", { name: "对象操作", exact: true });
    await expect(menu).toBeVisible();
    await audit(page, info);
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
    await expect(row).toBeFocused();
    await attachGuiEvidence(page, info, pageErrors);
  } finally {
    await context.close();
  }
});

test("whole-page axe: Chinese native mobile navigation drawer", async ({
  browser,
}, info) => {
  const { context, page, pageErrors } = await openGuiScreen(
    browser,
    screenNamed("buckets"),
    guiVisualVariants[2],
    "zh",
  );
  try {
    const trigger = page.getByRole("button", { name: "打开菜单", exact: true });
    await trigger.click();
    const drawer = page.locator("dialog#console-mobile-menu");
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveJSProperty("open", true);
    await audit(page, info);
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await attachGuiEvidence(page, info, pageErrors);
  } finally {
    await context.close();
  }
});

test("whole-page axe: mobile Tasks after a real read-only download", async ({
  browser,
}, info) => {
  const { context, page, pageErrors } = await openGuiScreen(
    browser,
    screenNamed("objects-prefix"),
    guiVisualVariants[2],
  );
  try {
    const row = guiObjectRow(page, guiDemo.readme.key);
    await row.focus();
    await row.press("Shift+F10");
    const download = page.waitForEvent("download");
    await page
      .getByRole("menu", { name: "Object actions", exact: true })
      .getByRole("menuitem", { name: "Download", exact: true })
      .click();
    const file = await download;
    const path = info.outputPath("README.md");
    await file.saveAs(path);
    expect((await stat(path)).size).toBe(guiDemo.readme.size);
    const tasks = page.getByRole("dialog", { name: "Tasks", exact: true });
    if (!(await tasks.isVisible()))
      await page.locator("#object-manager-toggle").click();
    await expect(tasks).toBeVisible();
    await expect(tasks.getByText(/README\.md/)).toBeVisible();
    await audit(page, info);
    await tasks
      .getByRole("button", { name: "Close Tasks", exact: true })
      .click();
    await expect(tasks).not.toBeVisible();
    await attachGuiEvidence(page, info, pageErrors);
  } finally {
    await context.close();
  }
});

for (const language of ["en", "zh"] as const)
  for (const width of [1440, 390]) {
    for (const screen of [
      { path: "/access-keys", heading: /No access keys yet|暂无访问密钥/ },
      { path: "/tools/logs", heading: /Logs are not running|尚未开始收集日志/ },
      {
        path: "/settings/event-destinations",
        heading: /No event destinations yet|暂无事件目标/,
      },
    ])
      test(`shared UI empty state ${screen.path} ${language} ${width}`, async ({
        page,
      }, info) => {
        await page.addInitScript((locale) => {
          localStorage.setItem("language", locale);
          localStorage.setItem("dark-mode", locale === "zh" ? "on" : "off");
        }, language);
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(screen.path);
        await expect(
          page.getByRole("heading", { name: screen.heading, level: 2 }),
        ).toBeVisible();
        await audit(page, info);
        await page.locator("#search-resource").fill("no-match-ui-regression");
        await expect(
          page.getByRole("heading", {
            name: /No matching results|没有匹配项/,
            level: 2,
          }),
        ).toBeVisible();
        await audit(page, info);
      });
    test(`shared UI Speedtest initial ${language} ${width}`, async ({
      page,
    }, info) => {
      await page.addInitScript((locale) => {
        localStorage.setItem("language", locale);
        localStorage.setItem("dark-mode", locale === "zh" ? "on" : "off");
      }, language);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/support/speedtest");
      await expect(page.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "0",
      );
      await audit(page, info);
    });
  }
