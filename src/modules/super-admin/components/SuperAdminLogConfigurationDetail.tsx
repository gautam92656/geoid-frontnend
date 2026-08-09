"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogConfigurationDetailPage } from "@/modules/dashboard/components/LogConfigurationDetailPage";
import { LogConfigurationOwnerProvider } from "@/modules/dashboard/context/LogConfigurationOwnerContext";
import { SuperAdminSidebar } from "@/modules/super-admin/components/SuperAdminSidebar";
import {
  SUPER_ADMIN_LOG_CONFIGURATIONS_PATH,
} from "@/modules/super-admin/utils/paths";

type SuperAdminLogConfigurationDetailProps = Readonly<{
  configurationId: string;
}>;

function parseUserId(value: string | null): number | undefined {
  if (!value) return undefined;
  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

function SuperAdminLogConfigurationDetailInner({
  configurationId,
}: SuperAdminLogConfigurationDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ownerUserId = parseUserId(searchParams.get("userId"));

  useEffect(() => {
    if (ownerUserId == null) {
      router.replace(SUPER_ADMIN_LOG_CONFIGURATIONS_PATH);
    }
  }, [ownerUserId, router]);

  if (ownerUserId == null) {
    return null;
  }

  return (
    <LogConfigurationOwnerProvider value={ownerUserId}>
      <LogConfigurationDetailPage
        configurationId={configurationId}
        listBasePath={SUPER_ADMIN_LOG_CONFIGURATIONS_PATH}
        menuButtonAriaLabel="Open admin menu"
        renderSidebar={({ mobileOpen, onCloseMobile }) => (
          <SuperAdminSidebar
            activeSection="log-configurations"
            mobileOpen={mobileOpen}
            onCloseMobile={onCloseMobile}
          />
        )}
      />
    </LogConfigurationOwnerProvider>
  );
}

export function SuperAdminLogConfigurationDetail({
  configurationId,
}: SuperAdminLogConfigurationDetailProps) {
  return (
    <Suspense fallback={<p>Loading configuration…</p>}>
      <SuperAdminLogConfigurationDetailInner configurationId={configurationId} />
    </Suspense>
  );
}
