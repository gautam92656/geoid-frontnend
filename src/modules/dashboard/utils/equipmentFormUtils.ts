import { isEmptyTrimmed, requiredFieldMessage } from "@/shared/utils/formValidation";
import type { EquipmentFieldKey } from "../types/equipmentType";
import type { Equipment, EquipmentFormState } from "../types/equipment";
import type { EquipmentType } from "../types/equipmentType";

export type EquipmentFormErrors = Partial<
  Record<keyof EquipmentFormState | "equipmentTypeId", string>
>;

export type EquipmentFormInputType = "text" | "number" | "date" | "multiselect";

export type EquipmentFormFieldDefinition = {
  key: EquipmentFieldKey;
  label: string;
  inputType: EquipmentFormInputType;
  required: boolean;
  placeholder: string;
  fullWidth?: boolean;
};

export const EQUIPMENT_FORM_FIELDS: readonly EquipmentFormFieldDefinition[] = [
  { key: "equipmentNo", label: "Equipment No.", inputType: "text", required: false, placeholder: "Equipment No." },
  {
    key: "equipmentName",
    label: "Equipment Name",
    inputType: "text",
    required: true,
    placeholder: "Equipment Name",
    fullWidth: true,
  },
  {
    key: "suppliers",
    label: "Supplier",
    inputType: "multiselect",
    required: true,
    placeholder: "Select suppliers",
    fullWidth: true,
  },
  { key: "mounting", label: "Mounting", inputType: "text", required: false, placeholder: "Mounting" },
  { key: "driveWeight", label: "Drive Weight", inputType: "text", required: false, placeholder: "Drive Weight" },
  { key: "drop", label: "Drop", inputType: "text", required: false, placeholder: "Drop" },
  {
    key: "manufacturer",
    label: "Equipment Manufacturer",
    inputType: "text",
    required: false,
    placeholder: "Equipment Manufacturer",
  },
  { key: "model", label: "Equipment Model", inputType: "text", required: false, placeholder: "Equipment Model" },
  {
    key: "energyTransferRatio",
    label: "Energy Transfer Ratio",
    inputType: "number",
    required: false,
    placeholder: "0.00",
  },
  {
    key: "hammerEfficiencyCorrection",
    label: "Hammer Efficiency Correction",
    inputType: "number",
    required: false,
    placeholder: "0.00",
  },
  { key: "netAreaRatio", label: "Net Area Ratio", inputType: "number", required: false, placeholder: "0.00" },
  { key: "tipArea", label: "Tip Area", inputType: "number", required: false, placeholder: "0.00" },
  {
    key: "porePressureTransducerLocation",
    label: "Pore Pressure Transducer Location",
    inputType: "text",
    required: false,
    placeholder: "Pore Pressure Transducer Location",
    fullWidth: true,
  },
  {
    key: "frictionReducerType",
    label: "Friction Reducer Type",
    inputType: "text",
    required: false,
    placeholder: "Friction Reducer Type",
  },
  { key: "frictionReducer", label: "Friction Reducer", inputType: "text", required: false, placeholder: "Friction Reducer" },
  { key: "frictionRatio", label: "Friction Ratio", inputType: "number", required: false, placeholder: "0.00" },
  { key: "calibratedBy", label: "Calibrated By", inputType: "text", required: false, placeholder: "Calibrated By" },
  {
    key: "dateOfCalibration",
    label: "Date of Calibration",
    inputType: "date",
    required: false,
    placeholder: "",
  },
  { key: "bucketWidth", label: "Bucket Width", inputType: "text", required: false, placeholder: "Bucket Width" },
] as const;

export function getVisibleEquipmentFormFields(
  equipmentType: EquipmentType | null
): EquipmentFormFieldDefinition[] {
  if (!equipmentType) return [];

  return EQUIPMENT_FORM_FIELDS.filter((field) => equipmentType.fieldConfig[field.key]);
}

export function equipmentToForm(equipment: Equipment): EquipmentFormState {
  return {
    equipmentTypeId: String(equipment.equipmentTypeId),
    equipmentNo: equipment.equipmentNo,
    equipmentName: equipment.equipmentName,
    suppliers: [...equipment.suppliers],
    mounting: equipment.mounting,
    driveWeight: equipment.driveWeight,
    drop: equipment.drop,
    manufacturer: equipment.manufacturer,
    model: equipment.model,
    energyTransferRatio: equipment.energyTransferRatio,
    hammerEfficiencyCorrection: equipment.hammerEfficiencyCorrection,
    netAreaRatio: equipment.netAreaRatio,
    tipArea: equipment.tipArea,
    frictionRatio: equipment.frictionRatio,
    porePressureTransducerLocation: equipment.porePressureTransducerLocation,
    frictionReducerType: equipment.frictionReducerType,
    frictionReducer: equipment.frictionReducer,
    calibratedBy: equipment.calibratedBy,
    dateOfCalibration: equipment.dateOfCalibration,
    bucketWidth: equipment.bucketWidth,
  };
}

export function canSubmitEquipmentForm(
  form: EquipmentFormState,
  equipmentType: EquipmentType | null
): boolean {
  return Object.keys(validateEquipmentForm(form, equipmentType)).length === 0;
}

export function validateEquipmentForm(
  form: EquipmentFormState,
  equipmentType: EquipmentType | null
): EquipmentFormErrors {
  const errors: EquipmentFormErrors = {};

  if (isEmptyTrimmed(form.equipmentTypeId) || !equipmentType) {
    errors.equipmentTypeId = requiredFieldMessage("Equipment type");
    return errors;
  }

  const visibleFields = getVisibleEquipmentFormFields(equipmentType);

  for (const field of visibleFields) {
    if (!field.required) continue;

    if (field.key === "suppliers") {
      if (form.suppliers.length === 0) {
        errors.suppliers = requiredFieldMessage(field.label);
      }
      continue;
    }

    const value = form[field.key as keyof EquipmentFormState];
    if (typeof value === "string" && isEmptyTrimmed(value)) {
      errors[field.key] = requiredFieldMessage(field.label);
    }
  }

  return errors;
}

export function formToEquipment(
  form: EquipmentFormState,
  equipmentTypes: readonly EquipmentType[]
): Equipment {
  const now = new Date().toISOString();
  const selectedType =
    equipmentTypes.find((type) => String(type.id) === form.equipmentTypeId) ?? null;
  const equipmentType = selectedType?.name ?? "";

  return {
    id: 0,
    equipmentTypeId: selectedType?.id ?? 0,
    equipmentType,
    equipmentNo: form.equipmentNo.trim(),
    equipmentName: form.equipmentName.trim(),
    suppliers: [...form.suppliers],
    mounting: form.mounting.trim(),
    driveWeight: form.driveWeight.trim(),
    drop: form.drop.trim(),
    manufacturer: form.manufacturer.trim(),
    model: form.model.trim(),
    energyTransferRatio: form.energyTransferRatio.trim(),
    hammerEfficiencyCorrection: form.hammerEfficiencyCorrection.trim(),
    netAreaRatio: form.netAreaRatio.trim(),
    tipArea: form.tipArea.trim(),
    frictionRatio: form.frictionRatio.trim(),
    porePressureTransducerLocation: form.porePressureTransducerLocation.trim(),
    frictionReducerType: form.frictionReducerType.trim(),
    frictionReducer: form.frictionReducer.trim(),
    calibratedBy: form.calibratedBy.trim(),
    dateOfCalibration: form.dateOfCalibration,
    bucketWidth: form.bucketWidth.trim(),
    createdAt: now,
    updatedAt: now,
  };
}
