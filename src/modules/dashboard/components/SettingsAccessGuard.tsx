"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/store/hooks";

type SettingsAccessGuardProps = {
  children: ReactNode;
};

/** Settings is platform-only; regular tenant users are redirected away. */
export function SettingsAccessGuard({ children }: SettingsAccessGuardProps) {
  const router = useRouter();
  const { hydrated, isAuthenticated, user } = useAppSelector((state) => state.auth);
  const canAccessSettings = user?.role === "super_admin";

  useEffect(() => {
    if (hydrated && isAuthenticated && !canAccessSettings) {
      router.replace("/dashboard");
    }
  }, [canAccessSettings, hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated || !canAccessSettings) {
    return null;
  }

  return children;
}
