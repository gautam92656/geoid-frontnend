"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { rehydrate } from "./slices/authSlice";
import { makeStore, type AppStore } from "./index";
import { setAppStore } from "./storeRef";

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
    setAppStore(storeRef.current);
  }

  // Rehydrate auth from localStorage only on the client after mount so SSR HTML
  // matches the first client render (avoids hydration mismatch in AuthGuard).
  useEffect(() => {
    storeRef.current?.dispatch(rehydrate());
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
