import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SuperAdminPage } from "@/modules/super-admin/components";
import type { SuperAdminSectionId } from "@/modules/super-admin/components/SuperAdminSidebar";

const SECTION_CONTENT: Record<SuperAdminSectionId, { title: string }> = {
  users: { title: "User Management" },
  "log-configurations": { title: "Log Configurations" },
  "log-templates": { title: "Log Templates" },
};

const VALID_SECTIONS = new Set<string>(Object.keys(SECTION_CONTENT));

type PageProps = {
  params: Promise<{ section: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { section } = await params;
  const content = SECTION_CONTENT[section as SuperAdminSectionId];
  return { title: content?.title ?? "Super Admin" };
}

export default async function SuperAdminSectionPage({ params }: PageProps) {
  const { section } = await params;

  if (!VALID_SECTIONS.has(section)) {
    notFound();
  }

  return <SuperAdminPage section={section as SuperAdminSectionId} />;
}
