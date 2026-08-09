import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

export type RemarkTypeOption = ModuleNamedOption & {
  /** Optional Tablogs alias key for import/export mapping. */
  tablogsAlias?: string | null;
};

/** Optional alias choices shown in Manage Remark Types. */
export const REMARK_TYPE_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "", label: "Select Tablogs alias" },
  { value: "logged-remarks", label: "Logged Remarks" },
  { value: "unlogged-remarks", label: "Unlogged Remarks" },
  { value: "l-pile-value", label: "L-Pile Value" },
  { value: "remarks", label: "Remarks" },
];

export const DEFAULT_REMARK_TYPE_OPTIONS: RemarkTypeOption[] = [
  { id: "logged-remarks", name: "Logged Remarks", tablogsAlias: "logged-remarks" },
  { id: "unlogged-remarks", name: "Unlogged Remarks", tablogsAlias: "unlogged-remarks" },
  { id: "l-pile-value", name: "L-Pile Value", tablogsAlias: "l-pile-value" },
  { id: "remarks", name: "Remarks", tablogsAlias: "remarks" },
];

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function createBlankRemarkTypeOption(
  partial?: Partial<RemarkTypeOption>
): RemarkTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    tablogsAlias: partial?.tablogsAlias ?? null,
  };
}

export function parseRemarkTypeOption(
  value: unknown,
  index: number
): RemarkTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `remark-type-${index + 1}`;

  return createBlankRemarkTypeOption({
    id,
    name,
    tablogsAlias:
      asNullableString(value.tablogsAlias) ??
      asNullableString(value.tablogs_alias) ??
      asNullableString(value.alias),
  });
}

export function parseRemarkTypeOptions(
  value: unknown,
  fallback: readonly RemarkTypeOption[] = DEFAULT_REMARK_TYPE_OPTIONS
): RemarkTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: RemarkTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseRemarkTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options.length > 0 ? options : fallback.map((entry) => ({ ...entry }));
}

export function cloneRemarkTypeOption(option: RemarkTypeOption): RemarkTypeOption {
  return { ...option };
}

export function toRemarkTypeModuleNamedOption(option: RemarkTypeOption): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? null,
  };
}
