export type EquipmentFormState = {
  equipmentTypeId: string;
  equipmentNo: string;
  equipmentName: string;
  suppliers: string[];
  mounting: string;
  driveWeight: string;
  drop: string;
  manufacturer: string;
  model: string;
  energyTransferRatio: string;
  hammerEfficiencyCorrection: string;
  netAreaRatio: string;
  tipArea: string;
  frictionRatio: string;
  porePressureTransducerLocation: string;
  frictionReducerType: string;
  frictionReducer: string;
  calibratedBy: string;
  dateOfCalibration: string;
  bucketWidth: string;
};

export type Equipment = {
  id: number;
  equipmentTypeId: number;
  equipmentType: string;
  equipmentNo: string;
  equipmentName: string;
  suppliers: string[];
  mounting: string;
  driveWeight: string;
  drop: string;
  manufacturer: string;
  model: string;
  energyTransferRatio: string;
  hammerEfficiencyCorrection: string;
  netAreaRatio: string;
  tipArea: string;
  frictionRatio: string;
  porePressureTransducerLocation: string;
  frictionReducerType: string;
  frictionReducer: string;
  calibratedBy: string;
  dateOfCalibration: string;
  bucketWidth: string;
  createdAt: string;
  updatedAt: string;
};

export type EquipmentPayload = {
  equipmentTypeId: number;
  equipmentNo?: string;
  equipmentName?: string;
  suppliers?: string[];
  mounting?: string;
  driveWeight?: string;
  drop?: string;
  manufacturer?: string;
  model?: string;
  energyTransferRatio?: string;
  hammerEfficiencyCorrection?: string;
  netAreaRatio?: string;
  tipArea?: string;
  frictionRatio?: string;
  porePressureTransducerLocation?: string;
  frictionReducerType?: string;
  frictionReducer?: string;
  calibratedBy?: string;
  dateOfCalibration?: string;
  bucketWidth?: string;
};

export type PaginatedEquipment = {
  data: Equipment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const EMPTY_EQUIPMENT_FORM: EquipmentFormState = {
  equipmentTypeId: "",
  equipmentNo: "",
  equipmentName: "",
  suppliers: [],
  mounting: "",
  driveWeight: "",
  drop: "",
  manufacturer: "",
  model: "",
  energyTransferRatio: "",
  hammerEfficiencyCorrection: "",
  netAreaRatio: "",
  tipArea: "",
  frictionRatio: "",
  porePressureTransducerLocation: "",
  frictionReducerType: "",
  frictionReducer: "",
  calibratedBy: "",
  dateOfCalibration: "",
  bucketWidth: "",
};
