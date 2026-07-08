import React, { useEffect, useRef, useState } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { hydrateFromStorage, loadPersistedSession } from "@/store/slices/authSlice";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    // Load async storage for React Native
    loadPersistedSession().then((payload) => {
      store.dispatch(hydrateFromStorage(payload));
      setHydrated(true);
    });
  }, []);

  if (!hydrated) {
    // Optionally return a loading splash screen here while Redux loads
    return null; 
  }

  return <Provider store={store}>{children}</Provider>;
}
