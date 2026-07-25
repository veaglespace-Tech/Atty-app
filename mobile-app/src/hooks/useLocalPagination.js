import { useMemo, useState, useEffect, useRef } from "react";

const normalizePage = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

export default function useLocalPagination(
  items,
  { initialPage = 1, initialPageSize = 10, dependencies = [] } = {}
) {
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const [page, setPageState] = useState(() => normalizePage(initialPage));
  const [pageSize, setPageSizeState] = useState(() => normalizePage(initialPageSize, 10));

  const depKey = useMemo(() => JSON.stringify(dependencies), [dependencies]);
  const isFirstRender = useRef(true);

  // Reset page to 1 when filters/search/period change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPageState(1);
  }, [depKey]);

  const totalItems = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return safeItems.slice(start, start + pageSize);
  }, [currentPage, pageSize, safeItems]);

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  const setPage = (nextPage) => {
    const target = typeof nextPage === "function" ? nextPage(currentPage) : nextPage;
    setPageState(normalizePage(target, 1));
  };

  const setPageSize = (nextPageSize) => {
    setPageSizeState(normalizePage(nextPageSize, initialPageSize));
    setPageState(1);
  };

  return {
    page: currentPage,
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
