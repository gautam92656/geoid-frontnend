"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthGuard } from "@/modules/auth/components/AuthGuard";
import { useAppSelector } from "@/store/hooks";

type SuperAdminGuardProps = {
  children: ReactNode;
};

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const router = useRouter();
  const { hydrated, isAuthenticated, user } = useAppSelector((state) => state.auth);
  const isSuperAdmin = user?.role === "super_admin";

  useEffect(() => {
    if (hydrated && isAuthenticated && !isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [hydrated, isAuthenticated, isSuperAdmin, router]);

  return (
    <AuthGuard>
      {!hydrated || !isAuthenticated || !isSuperAdmin ? null : children}
    </AuthGuard>
  );
}
