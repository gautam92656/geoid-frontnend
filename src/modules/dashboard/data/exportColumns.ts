import { formatDisplayDate } from "@/shared/utils/formatDate";
import type { ExportColumnDef } from "@/shared/utils/exportCsv";
import type { Client } from "../types/client";
import type { Equipment } from "../types/equipment";
import type { Project } from "../types/project";
import type { Supplier } from "../types/supplier";

function formatText(value: string | null | undefined): string {
  return value?.trim() || "";
}

function formatStatus(status: "active" | "inactive"): string {
  return status === "active" ? "Active" : "Inactive";
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join("; ") : "";
}

export const SUPPLIER_EXPORT_COLUMNS: ExportColumnDef<Supplier>[] = [
  { id: "id", label: "ID", getValue: (row) => String(row.id) },
  { id: "businessName", label: "Business Name", getValue: (row) => row.businessName },
  { id: "supplierType", label: "Supplier Type", getValue: (row) => row.supplierType },
  {
    id: "supplierRelationship",
    label: "Supplier Relationship",
    getValue: (row) => formatText(row.supplierRelationship),
  },
  {
    id: "supplierExternalId",
    label: "Supplier External ID",
    getValue: (row) => formatText(row.supplierExternalId),
  },
  {
    id: "labTestTypes",
    label: "Lab Test Types",
    getValue: (row) => formatList(row.labTestTypes),
  },
  { id: "firstName", label: "First Name", getValue: (row) => formatText(row.firstName) },
  { id: "lastName", label: "Last Name", getValue: (row) => formatText(row.lastName) },
  { id: "address", label: "Address", getValue: (row) => formatText(row.address) },
  { id: "email", label: "Email", getValue: (row) => formatText(row.email) },
  { id: "phone", label: "Phone", getValue: (row) => formatText(row.phone) },
  { id: "abn", label: "ABN", getValue: (row) => formatText(row.abn) },
  { id: "status", label: "Status", getValue: (row) => formatStatus(row.status) },
  {
    id: "createdAt",
    label: "Created At",
    getValue: (row) => formatDisplayDate(row.createdAt),
  },
  {
    id: "updatedAt",
    label: "Updated At",
    getValue: (row) => formatDisplayDate(row.updatedAt),
  },
];

export const CLIENT_EXPORT_COLUMNS: ExportColumnDef<Client>[] = [
  { id: "id", label: "ID", getValue: (row) => String(row.id) },
  { id: "companyName", label: "Company Name", getValue: (row) => row.companyName },
  {
    id: "companyContact",
    label: "Company Contact",
    getValue: (row) => formatText(row.companyContact),
  },
  { id: "email", label: "Email", getValue: (row) => formatText(row.email) },
  { id: "phone", label: "Phone", getValue: (row) => formatText(row.phone) },
  { id: "externalId", label: "External ID", getValue: (row) => formatText(row.externalId) },
  { id: "status", label: "Status", getValue: (row) => formatStatus(row.status) },
  {
    id: "createdAt",
    label: "Created At",
    getValue: (row) => formatDisplayDate(row.createdAt),
  },
  {
    id: "updatedAt",
    label: "Updated At",
    getValue: (row) => formatDisplayDate(row.updatedAt),
  },
];

export const PROJECT_EXPORT_COLUMNS: ExportColumnDef<Project>[] = [
  { id: "id", label: "ID", getValue: (row) => String(row.id) },
  { id: "projectNo", label: "Project Number", getValue: (row) => row.projectNo },
  { id: "name", label: "Project Name", getValue: (row) => row.name },
  { id: "location", label: "Location", getValue: (row) => formatText(row.location) },
  { id: "client", label: "Client", getValue: (row) => formatText(row.client) },
  { id: "assignee", label: "Assignee", getValue: (row) => formatText(row.assignee) },
  { id: "status", label: "Status", getValue: (row) => row.status },
  { id: "office", label: "Office", getValue: (row) => formatText(row.office) },
  { id: "startDate", label: "Start Date", getValue: (row) => formatText(row.startDate) },
  { id: "endDate", label: "End Date", getValue: (row) => formatText(row.endDate) },
  {
    id: "createdAt",
    label: "Created At",
    getValue: (row) => formatDisplayDate(row.createdAt),
  },
  {
    id: "updatedAt",
    label: "Updated At",
    getValue: (row) => formatDisplayDate(row.updatedAt),
  },
  {
    id: "archivedAt",
    label: "Archived At",
    getValue: (row) => (row.archivedAt ? formatDisplayDate(row.archivedAt) : ""),
  },
  {
    id: "deletedAt",
    label: "Deleted At",
    getValue: (row) => (row.deletedAt ? formatDisplayDate(row.deletedAt) : ""),
  },
];

export const EQUIPMENT_EXPORT_COLUMNS: ExportColumnDef<Equipment>[] = [
  { id: "id", label: "ID", getValue: (row) => String(row.id) },
  { id: "equipmentType", label: "Equipment Type", getValue: (row) => formatText(row.equipmentType) },
  { id: "equipmentNo", label: "Equipment No", getValue: (row) => formatText(row.equipmentNo) },
  {
    id: "equipmentName",
    label: "Equipment Name",
    getValue: (row) => formatText(row.equipmentName),
  },
  { id: "suppliers", label: "Supplier(s)", getValue: (row) => formatList(row.suppliers) },
  { id: "mounting", label: "Mounting", getValue: (row) => formatText(row.mounting) },
  { id: "driveWeight", label: "Drive Weight", getValue: (row) => formatText(row.driveWeight) },
  { id: "drop", label: "Drop", getValue: (row) => formatText(row.drop) },
  { id: "manufacturer", label: "Manufacturer", getValue: (row) => formatText(row.manufacturer) },
  { id: "model", label: "Model", getValue: (row) => formatText(row.model) },
  {
    id: "energyTransferRatio",
    label: "Energy Transfer Ratio",
    getValue: (row) => formatText(row.energyTransferRatio),
  },
  {
    id: "hammerEfficiencyCorrection",
    label: "Hammer Efficiency Correction",
    getValue: (row) => formatText(row.hammerEfficiencyCorrection),
  },
  { id: "netAreaRatio", label: "Net Area Ratio", getValue: (row) => formatText(row.netAreaRatio) },
  { id: "tipArea", label: "Tip Area", getValue: (row) => formatText(row.tipArea) },
  {
    id: "frictionRatio",
    label: "Friction Ratio",
    getValue: (row) => formatText(row.frictionRatio),
  },
  {
    id: "porePressureTransducerLocation",
    label: "Pore Pressure Transducer Location",
    getValue: (row) => formatText(row.porePressureTransducerLocation),
  },
  {
    id: "frictionReducerType",
    label: "Friction Reducer Type",
    getValue: (row) => formatText(row.frictionReducerType),
  },
  {
    id: "frictionReducer",
    label: "Friction Reducer",
    getValue: (row) => formatText(row.frictionReducer),
  },
  { id: "calibratedBy", label: "Calibrated By", getValue: (row) => formatText(row.calibratedBy) },
  {
    id: "dateOfCalibration",
    label: "Date of Calibration",
    getValue: (row) => (row.dateOfCalibration ? formatDisplayDate(row.dateOfCalibration) : ""),
  },
  { id: "bucketWidth", label: "Bucket Width", getValue: (row) => formatText(row.bucketWidth) },
  {
    id: "createdAt",
    label: "Created At",
    getValue: (row) => formatDisplayDate(row.createdAt),
  },
  {
    id: "updatedAt",
    label: "Updated At",
    getValue: (row) => formatDisplayDate(row.updatedAt),
  },
];
