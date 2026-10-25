// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { expect, test } from "@playwright/test";
import {
  appRoute,
  forgetRememberedRoute,
  handleExpiredSession,
  isExpiredSessionResponse,
  isInvalidSessionResponse,
  isLoginEndpoint,
  isReturnableRoute,
  isSessionProbe,
  rememberRoute,
  RouteStorage,
  sessionExpiryTarget,
  settleWithSessionCheck,
  shouldRedirectExpiredSession,
  takeRememberedRoute,
} from "../src/api/sessionExpiry";
import { Api, HttpClient, HttpResponse } from "../src/api/consoleApi";
import { readApiError, errorToHandler } from "../src/api/errors";

class MemoryStorage implements RouteStorage {
  items = new Map<string, string>();
  getItem(key: string) {
    return this.items.has(key) ? (this.items.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

test.describe("session expiry routing", () => {
  test("builds root and subpath-aware login targets", () => {
    expect(sessionExpiryTarget("/")).toBe("/login");
    expect(sessionExpiryTarget("/console")).toBe("/console/login");
    expect(sessionExpiryTarget("/console/subpath/")).toBe(
      "/console/subpath/login",
    );
  });

  test("does not redirect when the browser is already on login", () => {
    expect(shouldRedirectExpiredSession("/login", "/")).toBe(false);
    expect(shouldRedirectExpiredSession("/console/login", "/console/")).toBe(
      false,
    );
    expect(shouldRedirectExpiredSession("/console/buckets", "/console/")).toBe(
      true,
    );
  });

  test("recognizes only invalid-session responses", () => {
    expect(isInvalidSessionResponse(401, "invalid session")).toBe(true);
    expect(isInvalidSessionResponse(403, "invalid session")).toBe(true);
    expect(isInvalidSessionResponse(401, "Access Denied")).toBe(false);
    // A wrong current password on change-password is 401 "invalid Login".
    expect(isInvalidSessionResponse(401, "invalid Login")).toBe(false);
    expect(isInvalidSessionResponse(401, undefined)).toBe(false);
    expect(isInvalidSessionResponse(500, "invalid session")).toBe(false);
  });

  test("never treats login calls as an expiry", () => {
    expect(isLoginEndpoint("api/v1/login")).toBe(true);
    expect(isLoginEndpoint("/api/v1/login/oauth2/auth")).toBe(true);
    expect(isLoginEndpoint("http://localhost:9090/api/v1/login")).toBe(true);
    expect(isLoginEndpoint("api/v1/logout")).toBe(false);
    expect(isLoginEndpoint("api/v1/buckets")).toBe(false);
  });

  test("the session probe is how the app learns there is no session", () => {
    expect(isSessionProbe("http://console/api/v1/session")).toBe(true);
    expect(isSessionProbe("/console/api/v1/session?x=1")).toBe(true);
    expect(isSessionProbe("api/v1/login")).toBe(true);
    expect(isSessionProbe("api/v1/session-policies")).toBe(false);
    expect(isSessionProbe("api/v1/buckets")).toBe(false);
  });
});

test.describe("return route", () => {
  test("appRoute strips the base path of subpath deployments", () => {
    expect(appRoute("/buckets/x", "/")).toBe("/buckets/x");
    expect(appRoute("/console/buckets/x", "/console/")).toBe("/buckets/x");
    expect(appRoute("/console/buckets/x", "/console")).toBe("/buckets/x");
    expect(appRoute("/console", "/console/")).toBe("/");
    expect(appRoute("/other/buckets", "/console/")).toBe("/other/buckets");
  });

  test("only in-app, non-auth routes are returnable", () => {
    expect(isReturnableRoute("/buckets/b/objects")).toBe(true);
    expect(isReturnableRoute("/browser/b?prefix=x")).toBe(true);
    expect(isReturnableRoute("/")).toBe(false);
    expect(isReturnableRoute("")).toBe(false);
    expect(isReturnableRoute("//evil.example/x")).toBe(false);
    expect(isReturnableRoute("https://evil.example/x")).toBe(false);
    expect(isReturnableRoute("/\\evil.example")).toBe(false);
    expect(isReturnableRoute("/login")).toBe(false);
    expect(isReturnableRoute("/login/")).toBe(false);
    expect(isReturnableRoute("/login#form")).toBe(false);
    expect(isReturnableRoute("/logout")).toBe(false);
    expect(isReturnableRoute("/oauth_callback?code=x")).toBe(false);
    expect(isReturnableRoute("/sso")).toBe(false);
    expect(isReturnableRoute("/logs")).toBe(true);
    expect(isReturnableRoute(null)).toBe(false);
    expect(isReturnableRoute(42)).toBe(false);
  });

  test("expiry preserves encoded object prefixes, queries and fragments through login", () => {
    const storage = new MemoryStorage();
    const target = "/browser/demo-data/docs%2F?view=test&literal=a%2Bb#details";
    const navigated: string[] = [];
    expect(
      handleExpiredSession({
        pathname: "/console/browser/demo-data/docs%2F",
        search: "?view=test&literal=a%2Bb",
        hash: "#details",
        basePath: "/console/",
        storage,
        anonymous: false,
        clearSession: () => {},
        navigate: (path) => navigated.push(path),
      }),
    ).toBe(true);
    expect(navigated).toEqual(["/console/login"]);
    expect(takeRememberedRoute(storage, "/")).toBe(target);
    expect(takeRememberedRoute(storage, "/")).toBe("/");
  });

  test("remember/take round-trips once and falls back on junk", () => {
    const storage = new MemoryStorage();
    rememberRoute("/login", storage);
    expect(takeRememberedRoute(storage, "/browser")).toBe("/browser");

    rememberRoute("/buckets/b", storage);
    expect(takeRememberedRoute(storage, "/browser")).toBe("/buckets/b");
    expect(takeRememberedRoute(storage, "/browser")).toBe("/browser");

    storage.setItem("redirect-path", "https://evil.example/");
    expect(takeRememberedRoute(storage, "/")).toBe("/");
    expect(storage.getItem("redirect-path")).toBeNull();

    rememberRoute("/buckets/b", storage);
    forgetRememberedRoute(storage);
    expect(takeRememberedRoute(storage, "/")).toBe("/");
  });
});

test.describe("handleExpiredSession", () => {
  const run = (pathname: string, basePath: string, anonymous = false) => {
    const storage = new MemoryStorage();
    const calls: string[] = [];
    const handled = handleExpiredSession({
      pathname,
      basePath,
      storage,
      anonymous,
      clearSession: () => calls.push("clear"),
      navigate: (target) => calls.push(`navigate:${target}`),
    });
    return { calls, handled, storage };
  };

  test("remembers the app route, clears the session and loads login", () => {
    const { calls, handled, storage } = run("/console/buckets/b", "/console/");
    expect(handled).toBe(true);
    expect(storage.getItem("redirect-path")).toBe("/buckets/b");
    expect(calls).toEqual(["clear", "navigate:/console/login"]);
  });

  test("does nothing on the login page, so nothing loops", () => {
    const { calls, handled, storage } = run("/login", "/");
    expect(handled).toBe(false);
    expect(calls).toEqual([]);
    expect(storage.getItem("redirect-path")).toBeNull();
  });

  test("does nothing while browsing anonymously", () => {
    const { calls, handled, storage } = run(
      "/browser/public-bucket",
      "/",
      true,
    );
    expect(handled).toBe(false);
    expect(calls).toEqual([]);
    expect(storage.getItem("redirect-path")).toBeNull();
  });

  test("does not remember the root or auth pages but still ends the session", () => {
    const root = run("/", "/");
    expect(root.handled).toBe(true);
    expect(root.storage.getItem("redirect-path")).toBeNull();
    expect(root.calls).toEqual(["clear", "navigate:/login"]);

    const callback = run("/oauth_callback", "/");
    expect(callback.storage.getItem("redirect-path")).toBeNull();
  });
});

// A transport that answers every call with one canned response, served from
// the given URL (or the requested URL when none is given).
const cannedFetch =
  (
    status: number,
    body: unknown,
    url?: string,
    contentType = "application/json",
  ) =>
  async (input: RequestInfo | URL) => {
    const response = new Response(
      body === null
        ? null
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
      { status, headers: { "content-type": contentType } },
    );
    Object.defineProperty(response, "url", { value: url ?? String(input) });
    return response;
  };

// A generated client whose transport answers every call with one canned
// response, served from the given URL.
const clientAnswering = (status: number, body: unknown, url: string) =>
  new HttpClient({
    baseUrl: "http://console/api/v1",
    customFetch: cannedFetch(status, body, url),
  });

// The production wiring of src/api/index.ts applied to a generated Api
// instance: every request settles through the session check.
const apiAnswering = (
  status: number,
  body: unknown,
  onExpired: () => void,
  contentType?: string,
) => {
  const instance = new Api({
    baseUrl: "http://console/api/v1",
    customFetch: cannedFetch(status, body, undefined, contentType),
  });
  const original = instance.request;
  instance.request = (params) =>
    settleWithSessionCheck(
      original(params).catch(async (reason: unknown) => {
        await readApiError(reason);
        throw reason;
      }),
      onExpired,
    );
  return instance;
};

const settle = async (
  client: HttpClient,
): Promise<{
  expired: number;
  outcome: "fulfilled" | "rejected";
  response: HttpResponse<unknown, unknown>;
}> => {
  let expired = 0;
  try {
    const response = await settleWithSessionCheck(
      client.request({ path: "/buckets", method: "GET", format: "json" }),
      () => expired++,
    );
    return { expired, outcome: "fulfilled", response };
  } catch (reason) {
    return {
      expired,
      outcome: "rejected",
      response: reason as HttpResponse<unknown, unknown>,
    };
  }
};

test.describe("generated client session check", () => {
  const buckets = "http://console/api/v1/buckets";

  test("a rejected 401 invalid session expires and still rejects for the caller", async () => {
    const result = await settle(
      clientAnswering(401, { message: "invalid session" }, buckets),
    );
    expect(result.outcome).toBe("rejected");
    expect(result.expired).toBe(1);
    expect(result.response.status).toBe(401);
    expect((result.response.error as { message: string }).message).toBe(
      "invalid session",
    );
  });

  test("a rejected 403 invalid session expires too", async () => {
    const result = await settle(
      clientAnswering(403, { message: "invalid session" }, buckets),
    );
    expect(result.outcome).toBe("rejected");
    expect(result.expired).toBe(1);
  });

  test("a wrong current password is a 401 that keeps the session", async () => {
    const result = await settle(
      clientAnswering(
        401,
        { message: "invalid Login" },
        "http://console/api/v1/account/change-password",
      ),
    );
    expect(result.outcome).toBe("rejected");
    expect(result.expired).toBe(0);
  });

  test("the unauthenticated session probe never expires the session", async () => {
    const result = await settle(
      clientAnswering(
        401,
        { message: "invalid session" },
        "http://console/api/v1/session",
      ),
    );
    expect(result.outcome).toBe("rejected");
    expect(result.expired).toBe(0);
  });

  test("login calls never expire the session", async () => {
    const result = await settle(
      clientAnswering(
        401,
        { message: "invalid session" },
        "http://console/api/v1/login/oauth2/auth",
      ),
    );
    expect(result.outcome).toBe("rejected");
    expect(result.expired).toBe(0);
  });

  test("other errors and successes pass through untouched", async () => {
    const denied = await settle(
      clientAnswering(403, { message: "Access Denied." }, buckets),
    );
    expect(denied.outcome).toBe("rejected");
    expect(denied.expired).toBe(0);

    const ok = await settle(clientAnswering(200, { status: "ok" }, buckets));
    expect(ok.outcome).toBe("fulfilled");
    expect(ok.expired).toBe(0);
    expect((ok.response.data as { status: string }).status).toBe("ok");
  });

  test("generated void methods (no response format) still detect an expiry", async () => {
    let expired = 0;
    const instance = apiAnswering(
      401,
      { message: "invalid session" },
      () => expired++,
    );
    const rejection = await instance.user
      .removeUser("alice")
      .then(() => null)
      .catch((reason) => reason as HttpResponse<void, unknown>);
    expect(rejection?.status).toBe(401);
    // Error handlers can read the parsed error without consuming the body.
    expect(rejection?.error).toEqual({ message: "invalid session" });
    expect(await rejection?.text()).toBe(
      JSON.stringify({ message: "invalid session" }),
    );
    expect(expired).toBe(1);
  });

  test("generated raw-response methods detect an expiry and keep their body", async () => {
    let expired = 0;
    const instance = apiAnswering(
      403,
      { message: "invalid session" },
      () => expired++,
    );
    const rejection = await instance.buckets
      .downloadObject("b", { prefix: "k" })
      .then(() => null)
      .catch((reason) => reason as HttpResponse<Blob, unknown>);
    expect(rejection?.status).toBe(403);
    expect(rejection?.bodyUsed).toBe(false);
    expect(expired).toBe(1);
  });

  test("a wrong current password through a void method keeps the session", async () => {
    let expired = 0;
    const instance = apiAnswering(
      401,
      { message: "invalid Login" },
      () => expired++,
    );
    await instance.account
      .accountChangePassword({ current_secret_key: "a", new_secret_key: "b" })
      .catch(() => undefined);
    expect(expired).toBe(0);
  });

  test("non-JSON and unreadable 401 bodies are not treated as an expiry", async () => {
    let expired = 0;
    const instance = apiAnswering(
      401,
      "invalid session",
      () => expired++,
      "text/plain",
    );
    await instance.user.removeUser("alice").catch(() => undefined);
    expect(expired).toBe(0);

    let expiredBroken = 0;
    const broken = apiAnswering(401, "{not json", () => expiredBroken++);
    await broken.user.removeUser("alice").catch(() => undefined);
    expect(expiredBroken).toBe(0);
  });

  test("non-response rejections are rethrown without a session check", async () => {
    let expired = 0;
    await expect(
      settleWithSessionCheck(
        Promise.reject(new Error("network down")),
        () => expired++,
      ),
    ).rejects.toThrow("network down");
    expect(expired).toBe(0);
    expect(
      isExpiredSessionResponse({
        status: 401,
        error: { message: "invalid session" },
      }),
    ).toBe(true);
    expect(
      isExpiredSessionResponse({ status: 401, error: "invalid session" }),
    ).toBe(false);
  });
});

test.describe("generated client errors", () => {
  test("a denied object tag write exposes the server error without expiring the session", async () => {
    let expired = 0;
    const body = {
      message: "Access Denied.",
      detailedMessage: "Access Denied.",
    };
    const instance = apiAnswering(403, body, () => expired++);
    const response = await instance.buckets
      .putObjectTags(
        "demo",
        { prefix: "a.txt", version_id: "v1" },
        { tags: { category: "example" } },
      )
      .then(() => null)
      .catch((reason) => reason as HttpResponse<void, typeof body>);
    expect(response).toBeInstanceOf(Response);
    expect(response?.status).toBe(403);
    expect(response?.error).toEqual(body);
    expect(errorToHandler(response!.error)).toEqual({
      errorMessage: "Access Denied.",
      detailedError: "Access Denied.",
    });
    expect(response?.bodyUsed).toBe(false);
    expect(await response?.json()).toEqual(body);
    expect(expired).toBe(0);
  });

  test("successful empty and raw responses retain their status and bodies", async () => {
    let expired = 0;
    const empty = await apiAnswering(
      204,
      null,
      () => expired++,
    ).user.removeUser("alice");
    expect(empty.status).toBe(204);
    expect(empty.error).toBeNull();
    const raw = await apiAnswering(
      200,
      "object contents",
      () => expired++,
      "text/plain",
    ).buckets.downloadObject("demo", { prefix: "a.txt" });
    expect(raw.bodyUsed).toBe(false);
    expect(await raw.text()).toBe("object contents");
    expect(expired).toBe(0);
  });

  test("already parsed errors keep their identity", async () => {
    const response = await clientAnswering(
      403,
      { message: "Access Denied." },
      "http://console/api/v1/buckets",
    )
      .request({ path: "/buckets", method: "GET", format: "json" })
      .catch((reason) => reason as HttpResponse<unknown, unknown>);
    const original = response.error;
    await readApiError(response);
    expect(response.error).toBe(original);
  });

  test("malformed, non-JSON and network failures retain the original rejection", async () => {
    for (const [body, contentType] of [
      ["{broken", "application/json"],
      ["unavailable", "text/plain"],
    ]) {
      const response = await apiAnswering(503, body, () => {}, contentType)
        .user.removeUser("alice")
        .then(() => null)
        .catch((reason) => reason as HttpResponse<void, unknown>);
      expect(response?.status).toBe(503);
      expect(response?.error).toBeNull();
      expect(await response?.text()).toBe(body);
    }
    const failure = new TypeError("network down");
    const response = await Promise.reject(failure)
      .catch(async (reason) => {
        await readApiError(reason);
        throw reason;
      })
      .catch((reason) => reason);
    expect(response).toBe(failure);
  });
});
