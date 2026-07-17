"use client";
import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { hydrateFromStorage } from "@/store/slices/authSlice";

export function StoreProvider({ children }) {
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;

    hydratedRef.current = true;
    store.dispatch(hydrateFromStorage());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
