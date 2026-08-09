export type EquipmentTypeStatus = "active" | "inactive";

export type EquipmentFieldKey =
  | "equipmentNo"
  | "equipmentName"
  | "suppliers"
  | "mounting"
  | "driveWeight"
  | "drop"
  | "manufacturer"
  | "model"
  | "energyTransferRatio"
  | "hammerEfficiencyCorrection"
  | "netAreaRatio"
  | "tipArea"
  | "frictionRatio"
  | "porePressureTransducerLocation"
  | "frictionReducerType"
  | "frictionReducer"
  | "calibratedBy"
  | "dateOfCalibration"
  | "bucketWidth";

export type EquipmentFieldConfig = Record<EquipmentFieldKey, boolean>;

export type EquipmentFieldDefinition = {
  key: EquipmentFieldKey;
  label: string;
  sortOrder: number;
};

export type EquipmentType = {
  id: number;
  name: string;
  description: string;
  status: EquipmentTypeStatus;
  isDefault: boolean;
  fieldConfig: EquipmentFieldConfig;
  createdAt: string;
  updatedAt: string;
};

export type EquipmentTypeFormState = {
  name: string;
  description: string;
  status: EquipmentTypeStatus;
  fieldConfig: EquipmentFieldConfig;
};

export type EquipmentTypePayload = {
  name: string;
  description?: string;
  status?: EquipmentTypeStatus;
  fieldConfig?: Partial<EquipmentFieldConfig>;
};

export type PaginatedEquipmentTypes = {
  data: EquipmentType[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const DEFAULT_EQUIPMENT_TYPE_NAMES = ["Drill Rig", "Excavator", "CPT"] as const;

export { ACTIVE_INACTIVE_OPTIONS as EQUIPMENT_TYPE_STATUS_OPTIONS } from "../data/statusOptions";

export function createEmptyFieldConfig(
  definitions: readonly Pick<EquipmentFieldDefinition, "key">[]
): EquipmentFieldConfig {
  return Object.fromEntries(
    definitions.map(({ key }) => [key, false])
  ) as EquipmentFieldConfig;
}
