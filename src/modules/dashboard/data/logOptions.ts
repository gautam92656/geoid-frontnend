import type { LogTypeOption, ProposedBorelogOption } from "../types/log";

/** Statuses shown when creating a new log. */
export const LOG_CREATION_STATUSES = [
  "To do",
  "In progress",
  "Field",
  "Lab",
  "Completed",
] as const;

/** @deprecated Use LOG_CREATION_STATUSES */
export const LOG_STATUSES = LOG_CREATION_STATUSES;

/** Statuses used in the log table and update-log workflow. */
export const LOG_WORKFLOW_STATUSES = [
  "To do",
  "Field",
  "Preliminary",
  "Draft",
  "Final",
  "In Active",
] as const;

export const DEFAULT_LOG_STATUS = "To do" as const;

export const LOG_LIST_TABS = [
  { id: "logs", label: "Logs" },
  { id: "deleted", label: "Deleted" },
] as const;

export type LogListTabId = (typeof LOG_LIST_TABS)[number]["id"];
export type LogCreationStatus = (typeof LOG_CREATION_STATUSES)[number];
export type LogWorkflowStatus = (typeof LOG_WORKFLOW_STATUSES)[number];

export const LOG_TYPES: LogTypeOption[] = [
  { id: "borelog", name: "Borelog", supportsInclination: true },
  { id: "test-pit", name: "Test Pit", supportsInclination: false },
];

export const FINISHING_REASONS = [
  "Target depth reached",
  "Refusal",
  "Water encountered",
  "Equipment failure",
  "Client request",
  "Other",
] as const;

/** Searchable options for Logged By / Reviewed By fields. */
export const LOG_PERSON_OPTIONS = [
  "Geo User",
  "Gurram Praveen",
  "Sarah Mitchell",
] as const;

export const PROPOSED_BORELOGS: ProposedBorelogOption[] = [];
