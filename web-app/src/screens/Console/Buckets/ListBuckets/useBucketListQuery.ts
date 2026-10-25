// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { BucketSort, parseBucketQuery, updateBucketQuery } from "./bucketList";

export function useBucketListQuery() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const query = parseBucketQuery(params);
  const [search, setSearch] = useState(query.q);
  // A history navigation wins over a pending keystroke. Its rerender cancels
  // the old timer before it can write the prior query back into the URL.
  useEffect(() => setSearch(query.q), [location.key, query.q]);
  useEffect(() => {
    if (search === query.q) return;
    const url = window.location.href;
    const timer = window.setTimeout(() => {
      // A lazy route transition can retain this screen after the URL changes.
      // Do not let its pending search navigate back to the bucket list.
      if (window.location.href !== url) return;
      setParams((previous) => updateBucketQuery(previous, { q: search }), {
        replace: true,
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [search, query.q, location.key, setParams]);
  const sort = (field: BucketSort) =>
    setParams((previous) =>
      updateBucketQuery(previous, {
        sort: field,
        dir: query.sort === field && query.dir === "asc" ? "desc" : "asc",
        q: search,
      }),
    );
  const clear = () => {
    setSearch("");
    setParams((previous) => updateBucketQuery(previous, { q: "" }));
  };
  return { query, search, setSearch, sort, clear };
}
