import type { SelectOption } from "@/shared/components/ui";

export type ActiveInactiveStatus = "active" | "inactive";

export type ActiveInactiveTab = Readonly<{
  id: ActiveInactiveStatus;
  label: string;
}>;

export const ACTIVE_INACTIVE_OPTIONS: readonly SelectOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const ACTIVE_INACTIVE_TABS: readonly ActiveInactiveTab[] = [
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

export const DEFAULT_ACTIVE_INACTIVE_STATUS: ActiveInactiveStatus = "active";
