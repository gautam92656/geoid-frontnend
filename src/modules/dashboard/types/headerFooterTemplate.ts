export type HeaderFooterTemplateKind = "header" | "footer";

export type HeaderFooterReportType = "borelog" | "corelog";

export type HeaderFooterTemplate = {
  id: number;
  name: string;
  kind: HeaderFooterTemplateKind;
  reportType: HeaderFooterReportType | null;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type HeaderFooterTemplateFormState = {
  name: string;
  kind: HeaderFooterTemplateKind;
  reportType: HeaderFooterReportType | "";
};

export type HeaderFooterTemplatePayload = {
  name: string;
  kind: HeaderFooterTemplateKind;
  reportType?: HeaderFooterReportType | null;
  content?: Record<string, unknown>;
};

export type PaginatedHeaderFooterTemplates = {
  data: HeaderFooterTemplate[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ListHeaderFooterTemplatesParams = {
  search?: string;
  kind?: HeaderFooterTemplateKind;
  sortBy?: "id" | "name" | "kind" | "reportType" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
};
