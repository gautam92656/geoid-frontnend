import type { SelectOption } from "@/shared/components/ui";

export const PROJECT_STATUSES = [
  "Draft",
  "To do",
  "In planning",
  "Scheduled",
  "Onsite works",
  "Onsite works completed",
  "Lab testing",
  "Reporting",
  "Complete",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const DEFAULT_PROJECT_STATUS: ProjectStatus = "To do";

export const PROJECT_STATUS_FILTER_OPTIONS: readonly SelectOption[] = [
  { value: "all", label: "All statuses" },
  ...PROJECT_STATUSES.map((status) => ({ value: status, label: status })),
];

export const PROJECT_PAGE_TABS = [
  { id: "list", label: "List" },
  { id: "schedule", label: "Schedule" },
  { id: "archived", label: "Archived Projects" },
  { id: "deleted", label: "Deleted Projects" },
] as const;

export type ProjectPageTabId = (typeof PROJECT_PAGE_TABS)[number]["id"];

export type ProjectListScope = "active" | "archived" | "deleted";

export function isProjectListTab(tab: ProjectPageTabId): tab is "list" | "archived" | "deleted" {
  return tab === "list" || tab === "archived" || tab === "deleted";
}

export function getProjectListScope(tab: ProjectPageTabId): ProjectListScope | null {
  if (tab === "list") return "active";
  if (tab === "archived") return "archived";
  if (tab === "deleted") return "deleted";
  return null;
}
