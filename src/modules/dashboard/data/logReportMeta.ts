import { INITIAL_EQUIPMENT } from "./equipment";
import { INITIAL_LOG_CONFIGURATIONS } from "./logConfigurations";
import { LOG_TYPES } from "./logOptions";
import type { Project } from "../types/project";
import { INITIAL_SUPPLIERS } from "./suppliers";
import type { LogFormState } from "../types/log";

export type LogReportMetaRow = Readonly<{
  label: string;
  value: string;
}>;

function resolveLogTypeName(logType: string): string {
  return LOG_TYPES.find((type) => type.id === logType)?.name ?? logType;
}

function resolveConfigName(logConfigId: string): string {
  return INITIAL_LOG_CONFIGURATIONS.find((config) => config.id === logConfigId)?.name ?? "—";
}

function resolveSupplierName(supplierId: string): string {
  return (
    INITIAL_SUPPLIERS.find((supplier) => String(supplier.id) === supplierId)?.businessName ?? "—"
  );
}

function resolveEquipmentName(equipmentId: string): string {
  return INITIAL_EQUIPMENT.find((item) => String(item.id) === equipmentId)?.equipmentName ?? "—";
}

export function buildLogReportMetaRows(
  project: Project,
  form: LogFormState
): LogReportMetaRow[] {
  const logTypeName = resolveLogTypeName(form.logType);
  const configName = resolveConfigName(form.logConfigId);
  const supplierName = resolveSupplierName(form.supplierId);
  const equipmentName = resolveEquipmentName(form.equipmentId);

  return [
    { label: "UTM", value: form.utmZone || "—" },
    { label: "Easting", value: form.easting || "—" },
    { label: "Northing", value: form.northing || "—" },
    { label: "Elevation", value: form.elevation ? `${form.elevation} m` : "—" },
    { label: "Drill Rig", value: equipmentName },
    { label: "Supplier", value: supplierName },
    { label: "Logged By", value: form.loggedBy || "—" },
    { label: "Reviewed By", value: form.reviewedBy || "—" },
    { label: "Job Number", value: project.projectNo || String(project.id) },
    { label: "Client", value: project.client || "—" },
    { label: "Location", value: project.location },
    { label: "Log Type", value: logTypeName || "—" },
    { label: "End Depth", value: form.endDepth ? `${form.endDepth} m` : "—" },
    { label: "Status", value: form.logStatus || "—" },
    { label: "Configuration", value: configName },
    { label: "Finishing Reason", value: form.finishingReason || "—" },
  ];
}
