"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/store/hooks";

type SettingsAccessGuardProps = {
  children: ReactNode;
};

const ACCOUNT_PATH = "/dashboard/settings/account";

function isAccountSettingsPath(pathname: string) {
  return pathname === ACCOUNT_PATH || pathname.startsWith(`${ACCOUNT_PATH}/`);
}

/** Platform settings stay super-admin only. Account/profile is available to every signed-in user. */
export function SettingsAccessGuard({ children }: SettingsAccessGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, isAuthenticated, user } = useAppSelector((state) => state.auth);
  const isSuperAdmin = user?.role === "super_admin";
  const canAccess = isSuperAdmin || isAccountSettingsPath(pathname);

  useEffect(() => {
    if (hydrated && isAuthenticated && !canAccess) {
      router.replace("/dashboard");
    }
  }, [canAccess, hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated || !canAccess) {
    return null;
  }

  return children;
}
