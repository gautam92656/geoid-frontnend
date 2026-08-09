import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

export type FinishingReasonOption = ModuleNamedOption & {
  /** Short abbreviation shown beside the finishing reason. */
  abbreviation?: string | null;
  /** When true, show the auto-scale option for this finishing reason. */
  showAutoScale?: boolean;
};

export const DEFAULT_FINISHING_REASON_OPTIONS: FinishingReasonOption[] = [
  {
    id: "terminated",
    name: "Terminated",
    abbreviation: "",
    showAutoScale: true,
  },
  {
    id: "refusal",
    name: "Refusal",
    abbreviation: "",
    showAutoScale: true,
  },
];

export function createBlankFinishingReasonOption(
  partial?: Partial<FinishingReasonOption>
): FinishingReasonOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    abbreviation: partial?.abbreviation ?? "",
    showAutoScale: partial?.showAutoScale ?? true,
  };
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return fallback;
}

export function parseFinishingReasonOption(
  value: unknown,
  index: number
): FinishingReasonOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `finish-reason-${index + 1}`;

  const abbreviation =
    asNullableString(value.abbreviation) ??
    asNullableString(value.code) ??
    "";

  return {
    id,
    name,
    abbreviation,
    showAutoScale: asBoolean(
      value.showAutoScale ?? value.show_auto_scale,
      true
    ),
  };
}

export function parseFinishingReasonOptions(
  value: unknown,
  fallback: FinishingReasonOption[] = DEFAULT_FINISHING_REASON_OPTIONS
): FinishingReasonOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: FinishingReasonOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseFinishingReasonOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneFinishingReasonOption(
  entry: FinishingReasonOption
): FinishingReasonOption {
  return { ...entry };
}

export function toFinishingReasonModuleNamedOption(
  entry: FinishingReasonOption
): ModuleNamedOption {
  return {
    id: entry.id,
    name: entry.name,
    abbreviation: entry.abbreviation ?? "",
    showAutoScale: entry.showAutoScale ?? true,
  };
}
