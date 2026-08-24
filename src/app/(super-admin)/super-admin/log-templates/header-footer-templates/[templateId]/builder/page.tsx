import type { Metadata } from "next";
import { HeaderFooterGridBuilderPage } from "@/modules/dashboard/components/headerFooterBuilder/HeaderFooterGridBuilderPage";

export const metadata: Metadata = {
  title: "Header & Footer Template Builder",
  description: "Design header and footer template layouts for a user.",
};

type PageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function SuperAdminHeaderFooterTemplateBuilderRoute({ params }: PageProps) {
  const { templateId } = await params;
  return <HeaderFooterGridBuilderPage templateId={templateId} />;
}
