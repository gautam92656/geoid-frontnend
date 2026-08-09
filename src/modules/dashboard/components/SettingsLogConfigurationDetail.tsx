"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogConfigurationDetailPage } from "@/modules/dashboard/components/LogConfigurationDetailPage";
import { LogConfigurationOwnerProvider } from "@/modules/dashboard/context/LogConfigurationOwnerContext";
import { SettingsSidebar } from "@/modules/dashboard/components/SettingsSidebar";

const SETTINGS_LOG_CONFIGURATIONS_PATH = "/dashboard/settings/log-configurations";

type SettingsLogConfigurationDetailProps = Readonly<{
  configurationId: string;
}>;

function parseUserId(value: string | null): number | undefined {
  if (!value) return undefined;
  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

function SettingsLogConfigurationDetailInner({
  configurationId,
}: SettingsLogConfigurationDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ownerUserId = parseUserId(searchParams.get("userId"));

  useEffect(() => {
    if (ownerUserId == null) {
      router.replace(SETTINGS_LOG_CONFIGURATIONS_PATH);
    }
  }, [ownerUserId, router]);

  if (ownerUserId == null) {
    return null;
  }

  return (
    <LogConfigurationOwnerProvider value={ownerUserId}>
      <LogConfigurationDetailPage
        configurationId={configurationId}
        listBasePath={SETTINGS_LOG_CONFIGURATIONS_PATH}
        renderSidebar={({ mobileOpen, onCloseMobile }) => (
          <SettingsSidebar
            activeSection="log-configurations"
            mobileOpen={mobileOpen}
            onCloseMobile={onCloseMobile}
          />
        )}
      />
    </LogConfigurationOwnerProvider>
  );
}

export function SettingsLogConfigurationDetail({
  configurationId,
}: SettingsLogConfigurationDetailProps) {
  return (
    <Suspense fallback={<p>Loading configuration…</p>}>
      <SettingsLogConfigurationDetailInner configurationId={configurationId} />
    </Suspense>
  );
}
