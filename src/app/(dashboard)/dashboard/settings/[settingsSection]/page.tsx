import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettingsPage } from "@/modules/dashboard/components";
import type { SettingsSectionId } from "@/modules/dashboard/components/SettingsSidebar";

const SECTION_CONTENT: Record<SettingsSectionId, { title: string }> = {
  account: { title: "Account" },
  "user-management": { title: "User Management" },
  "log-configurations": { title: "Log Configurations" },
  "header-footer-templates": { title: "Header & Footer Templates" },
};

const VALID_SECTIONS = new Set<string>(Object.keys(SECTION_CONTENT));

type PageProps = {
  params: Promise<{ settingsSection: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { settingsSection } = await params;
  const content = SECTION_CONTENT[settingsSection as SettingsSectionId];
  return { title: content?.title ?? "Settings" };
}

export default async function DashboardSettingsSectionPage({ params }: PageProps) {
  const { settingsSection } = await params;

  if (!VALID_SECTIONS.has(settingsSection)) {
    notFound();
  }

  return <SettingsPage section={settingsSection as SettingsSectionId} />;
}
