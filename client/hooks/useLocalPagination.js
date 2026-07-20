"use client";

import { useMemo, useState } from "react";

const normalizePage = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

export default function useLocalPagination(
  items,
  { initialPage = 1, initialPageSize = 12, dependencies = [] } = {}
) {
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const resetToken = JSON.stringify(dependencies);
  const [state, setState] = useState(() => ({
    page: normalizePage(initialPage),
    pageSize: normalizePage(initialPageSize, 12),
    token: resetToken,
  }));

  const pageSize = normalizePage(state.pageSize, initialPageSize);
  const requestedPage =
    state.token === resetToken ? normalizePage(state.page, initialPage) : normalizePage(initialPage);
  const totalItems = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return safeItems.slice(start, start + pageSize);
  }, [page, pageSize, safeItems]);

  const startIndex = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = totalItems === 0 ? 0 : Math.min(page * pageSize, totalItems);

  const setPage = (nextPage) => {
    setState((current) => ({
      ...current,
      page: normalizePage(nextPage, initialPage),
      token: resetToken,
    }));
  };

  const setPageSize = (nextPageSize) => {
    setState((current) => ({
      ...current,
      page: normalizePage(initialPage),
      pageSize: normalizePage(nextPageSize, initialPageSize),
      token: resetToken,
    }));
  };

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setPage,
    setPageSize,
  };
}
