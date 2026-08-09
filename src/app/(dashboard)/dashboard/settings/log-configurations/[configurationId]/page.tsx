import type { Metadata } from "next";
import { SettingsLogConfigurationDetail } from "@/modules/dashboard/components/SettingsLogConfigurationDetail";

export const metadata: Metadata = {
  title: "Manage Log Configuration",
  description: "Update log configuration settings for a user.",
};

type PageProps = {
  params: Promise<{ configurationId: string }>;
};

export default async function LogConfigurationDetailRoute({ params }: PageProps) {
  const { configurationId } = await params;
  return <SettingsLogConfigurationDetail configurationId={configurationId} />;
}
