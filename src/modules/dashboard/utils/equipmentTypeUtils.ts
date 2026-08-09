import type {
  EquipmentFieldConfig,
  EquipmentFieldDefinition,
  EquipmentType,
  EquipmentTypeFormState,
} from "../types/equipmentType";
import { createEmptyFieldConfig } from "../types/equipmentType";

export const NAME_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 500;

export function sortEquipmentTypesAlphabetically(types: readonly EquipmentType[]): EquipmentType[] {
  return [...types].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export function getActiveEquipmentTypeOptions(
  types: readonly EquipmentType[]
): { value: string; label: string }[] {
  return sortEquipmentTypesAlphabetically(types.filter((type) => type.status === "active")).map(
    (type) => ({
      value: String(type.id),
      label: type.name,
    })
  );
}

export function isDuplicateEquipmentTypeName(
  types: readonly EquipmentType[],
  name: string,
  excludeId?: number
): boolean {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return false;

  return types.some(
    (type) => type.id !== excludeId && type.name.trim().toLowerCase() === normalized
  );
}

export function validateEquipmentTypeForm(
  form: EquipmentTypeFormState,
  types: readonly EquipmentType[],
  excludeId?: number,
  nameLocked = false
): { name?: string; description?: string } {
  const errors: { name?: string; description?: string } = {};
  const trimmedName = form.name.trim();

  if (!nameLocked) {
    if (!trimmedName) {
      errors.name = "Name is required.";
    } else if (trimmedName.length > NAME_MAX_LENGTH) {
      errors.name = `Name must be ${NAME_MAX_LENGTH} characters or fewer.`;
    } else if (isDuplicateEquipmentTypeName(types, trimmedName, excludeId)) {
      errors.name = "An equipment type with this name already exists.";
    }
  }

  if (form.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }

  return errors;
}

export function equipmentTypeToForm(type: EquipmentType): EquipmentTypeFormState {
  return {
    name: type.name,
    description: type.description,
    status: type.status,
    fieldConfig: { ...type.fieldConfig },
  };
}

export function createNewEquipmentTypeForm(
  fieldDefinitions: readonly EquipmentFieldDefinition[]
): EquipmentTypeFormState {
  return {
    name: "",
    description: "",
    status: "active",
    fieldConfig: createEmptyFieldConfig(fieldDefinitions),
  };
}

export function ensureFieldConfig(
  config: EquipmentFieldConfig,
  fieldDefinitions: readonly EquipmentFieldDefinition[]
): EquipmentFieldConfig {
  const next = createEmptyFieldConfig(fieldDefinitions);
  for (const { key } of fieldDefinitions) {
    if (key in config) {
      next[key] = Boolean(config[key]);
    }
  }
  return next;
}
