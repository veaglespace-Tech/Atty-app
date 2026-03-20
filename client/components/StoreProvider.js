"use client";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { hydrateFromStorage } from "@/store/slices/authSlice";

export function StoreProvider({ children }) {
  useEffect(() => {
    store.dispatch(hydrateFromStorage());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
