import { LogTemplateBuilderPage } from "@/modules/dashboard/components/logTemplateBuilder/LogTemplateBuilderPage";

type PageProps = Readonly<{
  params: Promise<{ templateId: string }>;
}>;

export default async function SuperAdminLogReportTemplateBuilderRoute({ params }: PageProps) {
  const { templateId } = await params;
  return <LogTemplateBuilderPage templateId={templateId} />;
}
