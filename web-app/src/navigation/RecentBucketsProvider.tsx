// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api";
import type { ListBucketsResponse } from "../api/consoleApi";
import { useAppSelector } from "../store";
import { selSession } from "../screens/Console/consoleSlice";
import {
  addRecentBucket,
  parseRecentBuckets,
  pruneRecentBuckets,
  recentBucketsKey,
} from "./recentBuckets";

interface RecentBucketsState {
  recent: string[];
  listing?: ListBucketsResponse;
  visit: (name: string) => void;
  updateListing: (listing: ListBucketsResponse) => void;
  refresh: () => void;
  objectRoute: (name: string) => string;
}
const RecentBuckets = createContext<RecentBucketsState>({
  recent: [],
  visit: () => {},
  updateListing: () => {},
  refresh: () => {},
  objectRoute: (name) => `/browser/${encodeURIComponent(name)}`,
});
export const useRecentBuckets = () => useContext(RecentBuckets);

export function RecentBucketsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = useAppSelector(selSession);
  // Remounting isolates both in-memory routes and pending requests on account changes.
  const key = recentBucketsKey(session.accountAccessKey);
  return (
    <AccountBuckets key={key} storageKey={key} ready={session.status === "ok"}>
      {children}
    </AccountBuckets>
  );
}

function AccountBuckets({
  storageKey,
  ready,
  children,
}: {
  storageKey: string;
  ready: boolean;
  children: React.ReactNode;
}) {
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return parseRecentBuckets(localStorage.getItem(storageKey));
    } catch {
      return [];
    }
  });
  const [listing, setListing] = useState<ListBucketsResponse>();
  const request = useRef<AbortController | null>(null);
  const known = useRef<string[] | undefined>(undefined);
  const activeBucket = useRef<string | undefined>(undefined);
  const routes = useRef(new Map<string, string>());
  const location = useLocation();
  const updateListing = useCallback((next: ListBucketsResponse) => {
    // A missing list is not proof that the account has zero accessible buckets.
    if (!Array.isArray(next.buckets)) return;
    known.current = next.buckets.map((bucket) => bucket.name);
    setListing(next);
    setRecent((items) =>
      pruneRecentBuckets(
        activeBucket.current
          ? addRecentBucket(items, activeBucket.current)
          : items,
        known.current,
      ),
    );
  }, []);
  const refresh = useCallback(() => {
    if (!ready) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    api.buckets
      .listBuckets({ signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) updateListing(response.data);
      })
      .catch(() => {
        // Metadata is optional. Keep the last successful list and recents on failure.
      });
  }, [ready, updateListing]);
  useEffect(() => {
    refresh();
    return () => request.current?.abort();
  }, [refresh]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(recent));
    } catch {
      /* The current session still has functional recents without storage. */
    }
  }, [recent, storageKey]);
  const visit = useCallback(
    (name: string) => {
      activeBucket.current = name;
      setRecent((items) =>
        pruneRecentBuckets(addRecentBucket(items, name), known.current),
      );
      // Revalidate a newly opened bucket, including one created since the last list.
      refresh();
    },
    [refresh],
  );
  useEffect(() => {
    const match = /^\/browser\/([^/]+)(?:\/|$)/.exec(location.pathname);
    if (!match) return;
    try {
      routes.current.set(
        decodeURIComponent(match[1]),
        `${location.pathname}${location.search}${location.hash}`,
      );
    } catch {
      /* Ignore malformed encoded routes. */
    }
  }, [location]);
  const objectRoute = useCallback(
    (name: string) =>
      routes.current.get(name) || `/browser/${encodeURIComponent(name)}`,
    [],
  );
  return (
    <RecentBuckets.Provider
      value={{ recent, listing, visit, updateListing, refresh, objectRoute }}
    >
      {children}
    </RecentBuckets.Provider>
  );
}
