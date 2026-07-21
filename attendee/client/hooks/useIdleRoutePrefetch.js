"use client";

import { useEffect } from "react";

export function useIdleRoutePrefetch(router, hrefs = []) {
  const routeKey = [...new Set((Array.isArray(hrefs) ? hrefs : []).filter(Boolean))].join("|");

  useEffect(() => {
    if (!router?.prefetch || !routeKey) return;
    const routes = routeKey.split("|").filter(Boolean);

    let cancelled = false;
    let idleId = null;
    let timeoutId = null;

    const prefetchRoutes = () => {
      if (cancelled) return;
      routes.forEach((href) => {
        router.prefetch(href);
      });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(prefetchRoutes, { timeout: 1200 });
    } else if (typeof window !== "undefined") {
      timeoutId = window.setTimeout(prefetchRoutes, 250);
    }

    return () => {
      cancelled = true;

      if (typeof window !== "undefined" && idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }

      if (typeof window !== "undefined" && timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [routeKey, router]);
}
