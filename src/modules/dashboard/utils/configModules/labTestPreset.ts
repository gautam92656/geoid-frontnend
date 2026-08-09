import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

export type LabTestPresetOption = ModuleNamedOption & {
  /** Lab test type ids included in this preset. */
  labTestTypeIds: string[];
};

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseLabTestTypeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry === "string") {
      const id = entry.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
      continue;
    }
    if (isRecord(entry)) {
      const id = asNullableString(entry.id) ?? asNullableString(entry.value);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function createLabTestPresetOption(
  id: string,
  name: string,
  partial?: Partial<LabTestPresetOption>
): LabTestPresetOption {
  return {
    id,
    name: name.trim(),
    labTestTypeIds: [...(partial?.labTestTypeIds ?? [])],
  };
}

export function createBlankLabTestPresetOption(
  partial?: Partial<LabTestPresetOption>
): LabTestPresetOption {
  return createLabTestPresetOption(partial?.id ?? "", partial?.name ?? "", {
    labTestTypeIds: partial?.labTestTypeIds ?? [],
  });
}

export function parseLabTestPresetOptions(
  value: unknown,
  fallback: LabTestPresetOption[] = []
): LabTestPresetOption[] {
  if (!Array.isArray(value)) return fallback.map((entry) => ({ ...entry, labTestTypeIds: [...entry.labTestTypeIds] }));

  const options: LabTestPresetOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) continue;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const id =
      typeof entry.id === "string" && entry.id.trim()
        ? entry.id.trim()
        : `lab-test-preset-${index + 1}`;

    const labTestTypeIds = parseLabTestTypeIds(
      entry.labTestTypeIds ?? entry.lab_test_type_ids ?? entry.labTestTypes ?? entry.lab_test_types
    );

    options.push(createLabTestPresetOption(id, name, { labTestTypeIds }));
  }

  return options.length > 0
    ? options
    : fallback.map((entry) => ({ ...entry, labTestTypeIds: [...entry.labTestTypeIds] }));
}

export function toLabTestPresetModuleNamedOption(option: LabTestPresetOption): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    labTestTypeIds: [...option.labTestTypeIds],
  };
}

/** Presets start empty — users add via Manage Lab Test Presets. */
export const DEFAULT_LAB_TEST_PRESET_OPTIONS: LabTestPresetOption[] = [];
