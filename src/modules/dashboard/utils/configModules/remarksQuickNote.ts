import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

export const REMARKS_QUICK_NOTES_DATA_TYPE_ID = "remarks-quick-notes" as const;
export const REMARK_TYPES_DATA_TYPE_ID = "remark-types" as const;

export type RemarksQuickNoteOption = ModuleNamedOption & {
  /** Remark type this quick note belongs to. */
  remarkTypeId: string;
};

export function createBlankRemarksQuickNoteOption(
  partial?: Partial<RemarksQuickNoteOption>
): RemarksQuickNoteOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    remarkTypeId: partial?.remarkTypeId ?? "",
  };
}

export function parseRemarksQuickNoteOption(
  value: unknown,
  index: number
): RemarksQuickNoteOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const remarkTypeId =
    typeof value.remarkTypeId === "string" && value.remarkTypeId.trim()
      ? value.remarkTypeId.trim()
      : typeof value.remark_type_id === "string" && value.remark_type_id.trim()
        ? value.remark_type_id.trim()
        : "";

  if (!remarkTypeId) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `remarks-quick-note-${index + 1}`;

  return createBlankRemarksQuickNoteOption({ id, name, remarkTypeId });
}

export function parseRemarksQuickNoteOptions(
  value: unknown,
  fallback: readonly RemarksQuickNoteOption[] = []
): RemarksQuickNoteOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: RemarksQuickNoteOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseRemarksQuickNoteOption(entry, index);
    if (!parsed) continue;
    const key = `${parsed.remarkTypeId}::${parsed.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options;
}

export function cloneRemarksQuickNoteOption(
  option: RemarksQuickNoteOption
): RemarksQuickNoteOption {
  return { ...option };
}

export function toRemarksQuickNoteModuleNamedOption(
  option: RemarksQuickNoteOption
): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    remarkTypeId: option.remarkTypeId,
  };
}

export function filterQuickNotesByRemarkType(
  options: readonly RemarksQuickNoteOption[],
  remarkTypeId: string
): RemarksQuickNoteOption[] {
  if (!remarkTypeId) return [];
  return options.filter((entry) => entry.remarkTypeId === remarkTypeId);
}

export function reorderQuickNotesWithinRemarkType(
  entries: RemarksQuickNoteOption[],
  remarkTypeId: string,
  sourceId: string,
  targetId: string
): RemarksQuickNoteOption[] {
  if (sourceId === targetId || !remarkTypeId) return entries;

  const typed = entries.filter((entry) => entry.remarkTypeId === remarkTypeId);
  const sourceIndex = typed.findIndex((entry) => entry.id === sourceId);
  const targetIndex = typed.findIndex((entry) => entry.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return entries;

  const reordered = [...typed];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);

  let typedIndex = 0;
  return entries.map((entry) =>
    entry.remarkTypeId === remarkTypeId ? reordered[typedIndex++]! : entry
  );
}
