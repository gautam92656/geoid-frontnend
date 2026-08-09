"use client";

import type {
  LogTemplateColumn,
  LogTemplateDataSource,
  LogTemplateSelectionGroup,
} from "../../types/logTemplate";

export type BoundSelectDataKind = "remarks" | "samples" | "testing" | "preset" | "generic";

const MULTI_SOURCE_BY_CODE: Record<string, { group: string; kind: BoundSelectDataKind }> = {
  remarks: { group: "all_remarks", kind: "remarks" },
  samples: { group: "all_samples", kind: "samples" },
  testing: { group: "all_testings", kind: "testing" },
};

/** Tablogs stores multi Select Data as a comma-separated string ("," in names → "+++"). */
export function encodeMultiDataSource(values: string[]): string {
  return values.map((value) => value.replaceAll(",", "+++")).join(",");
}

export function decodeMultiDataSource(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry).replaceAll("+++", ",")).filter(Boolean);
  }
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(",")
    .map((entry) => entry.replaceAll("+++", ",").trim())
    .filter(Boolean);
}

export function asDataSourceObject(
  raw: LogTemplateColumn["column_data_source"] | unknown
): LogTemplateDataSource {
  if (typeof raw === "string") {
    return { group: "", value: raw };
  }
  if (raw && typeof raw === "object") {
    const source = raw as LogTemplateDataSource;
    return {
      group: String(source.group ?? ""),
      value: String(source.value ?? ""),
    };
  }
  return { group: "", value: "" };
}

export function getDataSourceGroup(column: LogTemplateColumn): string {
  const raw = column.column_data_source;
  if (typeof raw === "string") {
    const code = String(column.code ?? "").toLowerCase();
    return MULTI_SOURCE_BY_CODE[code]?.group ?? "";
  }
  return asDataSourceObject(raw).group;
}

export function getDataSourceValue(column: LogTemplateColumn): string {
  return asDataSourceObject(column.column_data_source).value;
}

export function dedupeSelectionGroups(
  groups: LogTemplateSelectionGroup[]
): LogTemplateSelectionGroup[] {
  const seen = new Set<string>();
  const result: LogTemplateSelectionGroup[] = [];
  for (const group of groups) {
    const code = String(group.code ?? "");
    if (!code || seen.has(code)) continue;
    seen.add(code);
    result.push(group);
  }
  return result;
}

/**
 * Column Type / code drives which Select Data options appear (HAR / Tablogs parity).
 * - remarks / samples / testing → module list for that group (multi)
 * - Choose Column Type preset with a group → that group's fields
 * - Configurable / generic → full list (or empty when string builders own Select Data)
 */
export function getBoundSelectDataKind(column: LogTemplateColumn): BoundSelectDataKind | null {
  if (["scale", "photo", "chart"].includes(column.column_type)) return null;

  const code = String(column.code ?? "").toLowerCase();
  if (MULTI_SOURCE_BY_CODE[code]) return MULTI_SOURCE_BY_CODE[code].kind;

  const copy = String(column.copy_default_column ?? "").trim().toLowerCase();
  if (copy && copy !== "configurable" && MULTI_SOURCE_BY_CODE[copy]) {
    return MULTI_SOURCE_BY_CODE[copy].kind;
  }

  const group = getDataSourceGroup(column);
  if (group === "all_remarks") return "remarks";
  if (group === "all_samples") return "samples";
  if (group === "all_testings") return "testing";
  if (group) return "preset";

  return "generic";
}

export function getBoundSelectDataGroupCode(column: LogTemplateColumn): string {
  const code = String(column.code ?? "").toLowerCase();
  if (MULTI_SOURCE_BY_CODE[code]) return MULTI_SOURCE_BY_CODE[code].group;

  const copy = String(column.copy_default_column ?? "").trim().toLowerCase();
  if (MULTI_SOURCE_BY_CODE[copy]) return MULTI_SOURCE_BY_CODE[copy].group;

  return getDataSourceGroup(column);
}

export function getBoundSelectOptions(
  column: LogTemplateColumn,
  selectionGroups: LogTemplateSelectionGroup[],
  overrides?: Partial<Record<BoundSelectDataKind, Array<{ value: string; label: string }>>>
): Array<{ value: string; label: string }> {
  const groups = dedupeSelectionGroups(selectionGroups);
  const kind = getBoundSelectDataKind(column);
  const lockedGroup = getBoundSelectDataGroupCode(column);

  if (kind === "remarks" || kind === "samples" || kind === "testing" || kind === "preset") {
    const override = kind !== "preset" ? overrides?.[kind] : undefined;
    if (override && override.length > 0) return override;

    const group = groups.find((entry) => entry.code === lockedGroup);
    if (!group) return [];
    return group.data.map((item) => ({ value: item.code, label: item.name }));
  }

  return groups.flatMap((group) =>
    group.data.map((item) => ({
      value: `${group.code}::${item.code}`,
      label: `${group.name} — ${item.name}`,
    }))
  );
}

export function readBoundMultiValues(column: LogTemplateColumn): string[] {
  const fromFilter = decodeMultiDataSource(column.selectedFilterOptions);
  if (fromFilter.length > 0) return fromFilter;
  return decodeMultiDataSource(column.column_data_source);
}

export function buildBoundMultiPatch(
  column: LogTemplateColumn,
  values: string[]
): Partial<LogTemplateColumn> {
  const group = getBoundSelectDataGroupCode(column);
  return {
    selectedFilterOptions: values,
    column_data_source: values.length
      ? encodeMultiDataSource(values)
      : group
        ? { group, value: "" }
        : { group: "", value: "" },
  };
}
