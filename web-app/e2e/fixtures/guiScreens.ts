// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { Browser, Locator, Page, TestInfo } from "@playwright/test";
import { expect } from "./guiTest";
import { guiEnvironment, type GuiAccount } from "./guiEnvironment";
import { guiDemo } from "./guiResources";

export const guiVisualVariants = [
  { id: "1440-light", width: 1440, theme: "light" },
  { id: "1440-dark", width: 1440, theme: "dark" },
  { id: "390-light", width: 390, theme: "light" },
] as const;
type Variant = (typeof guiVisualVariants)[number];

type Mask = { locator: Locator; reason: string };
type Screen = {
  id: string;
  account: GuiAccount | null;
  path: string;
  api: readonly string[];
  stream?: boolean;
  ready: (page: Page) => Promise<void>;
  masks?: (page: Page) => Mask[];
  screenshotStyle?: { css: string; reason: string };
};
const bucketAPI = `/buckets/${guiDemo.bucket}`;
const objectsAPI = `${bucketAPI}/objects`;
const bucketPath = `/browser/${guiDemo.bucket}`;
const prefixPath = `${bucketPath}/${encodeURIComponent(guiDemo.docsPrefix)}`;

export const guiObjectRow = (page: Page, key: string) =>
  page.locator(`[role="row"][data-fluid-key=${JSON.stringify(key)}]`);

const overviewMasks = (page: Page): Mask[] => {
  const cards = page.locator(
    '[aria-label="Deployment statistics"], [aria-label="部署统计"]',
  );
  const data = cards.locator(":scope > *").nth(2);
  return [
    {
      locator: page.getByTestId("overview-used"),
      reason: "Live raw used bytes change during the fixture campaign.",
    },
    {
      locator: page.getByTestId("overview-available"),
      reason: "Live available bytes change during the fixture campaign.",
    },
    {
      locator: data.locator(":scope > div").nth(2).locator("span").first(),
      reason: "The asynchronous usage scan updates stored bytes.",
    },
    {
      locator: page.locator(
        "#overview-servers td.uptime, #overview-servers dl dd:nth-of-type(2)",
      ),
      reason: "Server uptime advances between independent runs.",
    },
    {
      locator: page.locator("#overview-servers .drive-usage > span"),
      reason: "Raw drive byte measurements change during the fixture campaign.",
    },
  ];
};

// These subjects are existing, preflighted demo resources. No mutation fixture
// name is hidden by a mask or used as a visual baseline subject.
export const guiScreens: readonly Screen[] = [
  {
    id: "login",
    account: null,
    path: "/login",
    api: ["/login"],
    ready: async (page) => {
      await expect(page.locator("#accessKey")).toBeVisible();
      await expect(page.locator("#secretKey")).toBeVisible();
      await expect(page.locator("#do-login")).toBeVisible();
    },
    screenshotStyle: {
      css: 'canvas[aria-hidden="true"] { visibility: hidden !important; }',
      reason:
        "Only the random Login canvas pixels are hidden during capture. A rectangular mask would also cover the sibling hero copy; visibility preserves that copy, the background, logo, form and layout.",
    },
  },
  {
    id: "overview-expanded",
    account: "admin",
    path: "/overview",
    api: ["/admin/info"],
    ready: async (page) => {
      await expect(page.getByTestId("overview-total")).toBeVisible();
      const server = page.locator("#overview-servers .server-row").first();
      const expand = server.getByRole("button");
      await expect(expand).toHaveAttribute("aria-expanded", "false");
      await expand.focus();
      await expand.press("Enter");
      await expect(expand).toHaveAttribute("aria-expanded", "true");
      await expect(
        page.locator("#overview-servers .drive-usage").first(),
      ).toBeVisible();
    },
    masks: overviewMasks,
  },
  {
    id: "buckets",
    account: "admin",
    path: "/buckets",
    api: ["/buckets"],
    ready: async (page) => {
      await expect(
        page.getByRole("table", { name: /^(Buckets|存储桶)$/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("row", { name: guiDemo.bucket, exact: true }),
      ).toBeVisible();
    },
  },
  {
    id: "objects-root",
    account: "admin",
    path: bucketPath,
    api: ["/buckets"],
    stream: true,
    ready: async (page) => {
      await expect(guiObjectRow(page, guiDemo.docsPrefix)).toBeVisible();
      await expect(guiObjectRow(page, "conf/")).toBeVisible();
    },
  },
  {
    id: "objects-prefix",
    account: "admin",
    path: prefixPath,
    api: ["/buckets"],
    stream: true,
    ready: async (page) => {
      await expect(guiObjectRow(page, guiDemo.readme.key)).toBeVisible();
      await expect(page.locator('[role="row"][data-fluid-key]')).toHaveCount(9);
    },
  },
  {
    id: "object-detail",
    account: "admin",
    path: guiDemo.readme.detailPath,
    api: [objectsAPI, `${objectsAPI}/metadata`],
    ready: async (page) => {
      await expect(page.locator(".ObjectDetailsTitle")).toContainText(
        guiDemo.readme.key.split("/").at(-1)!,
      );
      await expect(
        page.getByText(/^(Metadata|元数据)$/, { exact: true }),
      ).toBeVisible();
      if (page.viewportSize()!.width < 768)
        await expect(
          page.getByRole("dialog", { name: /^(Object details|对象详情)$/ }),
        ).toBeVisible();
    },
  },
  {
    id: "bucket-summary",
    account: "admin",
    path: `/buckets/${guiDemo.bucket}/admin/summary`,
    api: [bucketAPI, "/buckets"],
    ready: async (page) => {
      await expect(
        page.getByRole("tab", { name: /^(Summary|概览)$/, exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await expect(
        page.getByText(/^(Access Policy:|访问策略：)$/, { exact: true }),
      ).toBeVisible();
      await expect(
        page
          .getByText(/^(Loading…|加载中…)$/, { exact: true })
          .filter({ visible: true }),
      ).toHaveCount(0);
    },
  },
  {
    id: "users",
    account: "admin",
    path: "/identity/users",
    api: ["/users"],
    ready: async (page) => {
      await expect(
        page.getByRole("row", { name: guiDemo.user, exact: true }),
      ).toBeVisible();
      await expect(page.locator("#user-status-filter-select")).toBeVisible();
    },
  },
  {
    id: "user-overview",
    account: "admin",
    path: `/identity/users/${guiDemo.user}`,
    api: [`/user/${guiDemo.user}`, `/user/${guiDemo.user}/service-accounts`],
    ready: async (page) => {
      await expect(
        page.getByRole("heading", { name: guiDemo.user, exact: true }),
      ).toBeVisible();
      await expect(page.getByTestId("user-key-count")).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: /^(Policies inherited through groups|通过组继承的策略)$/,
        }),
      ).toBeVisible();
    },
  },
  {
    id: "policies",
    account: "admin",
    path: "/policies",
    api: ["/policies"],
    ready: async (page) => {
      await expect(
        page.getByRole("row", { name: "demo-reader", exact: true }),
      ).toBeVisible();
      await expect(page.locator("#policy-type-filter-select")).toBeVisible();
    },
  },
  {
    id: "builtin-policy",
    account: "admin",
    path: `/policies/${guiDemo.builtin}`,
    api: [`/policy/${guiDemo.builtin}`],
    ready: async (page) => {
      await page
        .getByRole("tab", { name: /^(Raw Policy|策略原文)$/, exact: true })
        .click();
      const editor = page.locator("textarea#code_wrapper");
      await expect(editor).toHaveJSProperty("readOnly", true);
      await expect(editor).toHaveValue(/"s3:\*"/);
      await expect(page.locator("#override-policy")).toBeVisible();
      await expect(page.locator("#save")).toBeDisabled();
    },
  },
  {
    id: "inspect",
    account: "admin",
    path: "/support/inspect",
    api: [],
    ready: async (page) => {
      await expect(page.locator("#inspect_volume")).toBeVisible();
      await expect(page.locator("#inspect_volume")).toHaveValue("");
      await expect(page.locator("#inspect_path")).toHaveValue("");
      await expect(page.locator("#inspect-start")).toBeVisible();
    },
  },
];

export async function openGuiScreen(
  browser: Browser,
  screen: Screen,
  variant: Variant,
  language: "en" | "zh" = "en",
  visual = false,
) {
  const env = guiEnvironment();
  const context = await browser.newContext({
    baseURL: env.url,
    storageState: screen.account
      ? env.authByAccount[screen.account]
      : undefined,
    viewport: { width: variant.width, height: 900 },
    deviceScaleFactor: 1,
    timezoneId: "Asia/Shanghai",
    reducedMotion: "reduce",
    colorScheme: variant.theme,
    locale: language === "zh" ? "zh-CN" : "en-US",
  });
  await context.addInitScript(
    ({ language, theme }) => {
      localStorage.setItem("language", language);
      localStorage.setItem("dark-mode", theme === "dark" ? "on" : "off");
      localStorage.setItem("silo.buckets.view", "table");
      localStorage.removeItem("sidebarOpen");
    },
    { language, theme: variant.theme },
  );
  const page = await context.newPage();
  const visualClock = "2026-10-24T07:00:00Z";
  const visualFields: {
    endpoint: string;
    path: string;
    before: string | number;
    after: string | number;
  }[] = [];
  if (visual) {
    // Date-only freezing leaves polling, transitions and ordinary timers live.
    // Behavioral tests and whole-page axe never opt into this fixture.
    await page.clock.setFixedTime(new Date(visualClock));
    await page.route(
      (url) => /^\/api\/v1\/(?:admin\/info|buckets)$/.test(url.pathname),
      async (route) => {
        expect(route.request().method()).toBe("GET");
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        const body = await response.json();
        const endpoint = new URL(route.request().url()).pathname;
        expect(typeof body.usageUpdatedAt).toBe("string");
        expect(Number.isFinite(Date.parse(body.usageUpdatedAt))).toBe(true);
        const updated = "2026-10-24T06:58:00Z";
        visualFields.push({
          endpoint,
          path: "usageUpdatedAt",
          before: body.usageUpdatedAt,
          after: updated,
        });
        body.usageUpdatedAt = updated;
        if (endpoint.endsWith("/admin/info")) {
          expect(Array.isArray(body.servers)).toBe(true);
          expect(body.servers.length).toBeGreaterThan(0);
          for (const [serverIndex, server] of body.servers.entries()) {
            expect(Array.isArray(server.drives)).toBe(true);
            expect(server.drives.length).toBeGreaterThan(0);
            for (const [driveIndex, drive] of server.drives.entries()) {
              for (const field of [
                "totalSpace",
                "usedSpace",
                "availableSpace",
              ]) {
                expect(typeof drive[field]).toBe("number");
                expect(Number.isFinite(drive[field])).toBe(true);
                expect(drive[field]).toBeGreaterThanOrEqual(0);
              }
              const used = 32 * 1024 * 1024;
              expect(drive.totalSpace).toBeGreaterThanOrEqual(used);
              expect(used / drive.totalSpace).toBeLessThan(0.85);
              expect(drive.availableSpace).toBeLessThanOrEqual(
                drive.totalSpace,
              );
              // A visual fixture must not normalize away an actual capacity alert.
              expect(drive.usedSpace / drive.totalSpace).toBeLessThan(0.85);
              for (const [field, value] of [
                ["usedSpace", used],
                ["availableSpace", drive.totalSpace - used],
              ] as const) {
                visualFields.push({
                  endpoint,
                  path: `servers[${serverIndex}].drives[${driveIndex}].${field}`,
                  before: drive[field],
                  after: value,
                });
                drive[field] = value;
              }
            }
          }
        } else {
          expect(Array.isArray(body.buckets)).toBe(true);
        }
        // All identities, counts, states, actions and total capacities stay live.
        await route.fulfill({ response, json: body });
      },
    );
  }
  const pageErrors: string[] = [];
  const frames: { request_end?: boolean; error?: unknown }[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  if (screen.stream)
    page.on("websocket", (socket) => {
      if (new URL(socket.url()).pathname === "/ws/objectManager")
        socket.on("framereceived", ({ payload }) =>
          frames.push(JSON.parse(payload.toString())),
        );
    });
  try {
    // Subscribe before navigation; titles can render before their data arrives.
    const responses = screen.api.map((path) =>
      page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          new URL(response.url()).pathname === `/api/v1${path}`,
      ),
    );
    await Promise.all([
      page.goto(screen.path),
      ...responses.map(async (response) =>
        expect((await response).ok()).toBe(true),
      ),
    ]);
    await screen.ready(page);
    if (visual) {
      expect(await page.evaluate(() => Date.now())).toBe(
        Date.parse(visualClock),
      );
      for (const endpoint of screen.api.filter((path) =>
        ["/admin/info", "/buckets"].includes(path),
      )) {
        const fields = visualFields.filter(
          (field) => field.endpoint === `/api/v1${endpoint}`,
        );
        expect(fields.some((field) => field.path === "usageUpdatedAt")).toBe(
          true,
        );
        if (endpoint === "/admin/info") {
          expect(
            fields.some((field) => field.path.endsWith(".usedSpace")),
          ).toBe(true);
          expect(
            fields.some((field) => field.path.endsWith(".availableSpace")),
          ).toBe(true);
        }
      }
    }
    if (screen.stream) {
      // Object collections arrive through the existing WebSocket, not the
      // REST list endpoint used by object details and version navigation.
      expect(frames.some((frame) => frame.request_end)).toBe(true);
      expect(frames.filter((frame) => frame.error)).toEqual([]);
    }
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      variant.theme,
    );
    await expect(
      page.locator('[aria-busy="true"]').filter({ visible: true }),
    ).toHaveCount(0);
    await expect(
      page.locator(".min-loader").filter({ visible: true }),
    ).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    // Keyboard expansion/tab selection can scroll their targets into view.
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document
        .querySelectorAll(".mainPage")
        .forEach((node) => node.scrollTo(0, 0));
    });
    return {
      context,
      page,
      pageErrors,
      visualEvidence: visual
        ? { clock: visualClock, fields: visualFields }
        : null,
    };
  } catch (error) {
    await context.close();
    throw error;
  }
}

export function guiScreenMasks(screen: Screen, page: Page): Mask[] {
  // Time remains visible under the visual clock. Masking background time nodes
  // can paint over a foreground mobile sheet or clipped virtualizer rows.
  return screen.masks?.(page) ?? [];
}

export async function attachGuiEvidence(
  page: Page,
  info: TestInfo,
  pageErrors: string[],
) {
  await info.attach("page-state", {
    body: JSON.stringify({
      url: page.url(),
      viewport: page.viewportSize(),
      pageErrors,
    }),
    contentType: "application/json",
  });
  expect(pageErrors, "No unexpected browser page errors").toEqual([]);
}
