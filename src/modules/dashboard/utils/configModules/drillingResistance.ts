import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

export type DrillingResistanceOption = ModuleNamedOption & {
  /** Optional Tablogs alias key for import/export mapping. */
  tablogsAlias?: string | null;
};

/** Optional alias choices shown in Manage Drilling Resistances. */
export const DRILLING_RESISTANCE_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "", label: "Select Tablogs alias" },
  { value: "vibration", label: "Vibration" },
  { value: "chatter", label: "Chatter" },
  { value: "rig-standup", label: "Rig Stand-up" },
  { value: "hard-drilling", label: "Hard Drilling" },
  { value: "soft-drilling", label: "Soft Drilling" },
  { value: "refusal", label: "Refusal" },
];

export const DEFAULT_DRILLING_RESISTANCE_OPTIONS: DrillingResistanceOption[] = [
  { id: "chatter", name: "Chatter", tablogsAlias: "chatter" },
  { id: "vibration", name: "Vibration", tablogsAlias: "vibration" },
  { id: "rig-standup", name: "Rig Stand-up", tablogsAlias: "rig-standup" },
];

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function createBlankDrillingResistanceOption(
  partial?: Partial<DrillingResistanceOption>
): DrillingResistanceOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    tablogsAlias: partial?.tablogsAlias ?? null,
  };
}

export function parseDrillingResistanceOption(
  value: unknown,
  index: number
): DrillingResistanceOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `drilling-resistance-${index + 1}`;

  return createBlankDrillingResistanceOption({
    id,
    name,
    tablogsAlias:
      asNullableString(value.tablogsAlias) ??
      asNullableString(value.tablogs_alias) ??
      asNullableString(value.alias),
  });
}

export function parseDrillingResistanceOptions(
  value: unknown,
  fallback: readonly DrillingResistanceOption[] = DEFAULT_DRILLING_RESISTANCE_OPTIONS
): DrillingResistanceOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: DrillingResistanceOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseDrillingResistanceOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneDrillingResistanceOption(
  option: DrillingResistanceOption
): DrillingResistanceOption {
  return { ...option };
}

export function toDrillingResistanceModuleNamedOption(
  option: DrillingResistanceOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    tablogsAlias: option.tablogsAlias ?? null,
  };
}

export function createDrillingResistanceOption(
  id: string,
  name: string,
  partial?: Partial<DrillingResistanceOption>
): DrillingResistanceOption {
  return createBlankDrillingResistanceOption({ id, name, ...partial });
}
