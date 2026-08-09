import type { Metadata } from "next";
import { SuperAdminLogConfigurationDetail } from "@/modules/super-admin/components/SuperAdminLogConfigurationDetail";

export const metadata: Metadata = {
  title: "Manage Log Configuration",
  description: "Update log configuration settings for a user from the super admin panel.",
};

type PageProps = {
  params: Promise<{ configurationId: string }>;
};

export default async function SuperAdminLogConfigurationDetailRoute({ params }: PageProps) {
  const { configurationId } = await params;

  return <SuperAdminLogConfigurationDetail configurationId={configurationId} />;
}
