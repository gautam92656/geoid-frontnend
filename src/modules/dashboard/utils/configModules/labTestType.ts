import { LAB_TEST_TYPES } from "../../data/supplierOptions";
import { isRecord } from "./helpers";
import {
  getInsituTestTypeGraphicUrl,
  normalizeInsituGraphicFilename,
  type InsituTestTypeGraphicCatalogEntry,
  type InsituTestTypeGraphicKind,
} from "./insituTestType";
import type { ModuleNamedOption } from "./types";

/** Alias tables available when configuring a lab test type (Tablogs-aligned). */
export const LAB_TEST_ALIAS_TABLE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Select Alias Table" },
  ...LAB_TEST_TYPES.map((name) => ({ value: name, label: name })),
];

/** Common TabLogs result-field aliases for the result table design columns. */
export const LAB_TEST_RESULT_TABLOGS_ALIAS_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "", label: "Select TabLogs Alias Field" },
  { value: "Moisture Content", label: "Moisture Content" },
  { value: "Natural Moisture Content", label: "Natural Moisture Content" },
  { value: "Liquid Limit", label: "Liquid Limit" },
  { value: "Plastic Limit", label: "Plastic Limit" },
  { value: "Plasticity Index", label: "Plasticity Index" },
  { value: "Linear Shrinkage", label: "Linear Shrinkage" },
  { value: "Passing 75um", label: "Passing 75um" },
  { value: "Passing 2.36mm", label: "Passing 2.36mm" },
  { value: "Passing 4.75mm", label: "Passing 4.75mm" },
  { value: "Passing 19mm", label: "Passing 19mm" },
  { value: "D10", label: "D10" },
  { value: "D30", label: "D30" },
  { value: "D60", label: "D60" },
  { value: "Cu", label: "Cu" },
  { value: "Cc", label: "Cc" },
  { value: "Unit Weight", label: "Unit Weight" },
  { value: "Dry Unit Weight", label: "Dry Unit Weight" },
  { value: "Density", label: "Density" },
  { value: "Dry Density", label: "Dry Density" },
  { value: "Relative Density", label: "Relative Density" },
  { value: "Specific Gravity", label: "Specific Gravity" },
  { value: "Permeability", label: "Permeability" },
  { value: "UCS", label: "UCS" },
  { value: "IS50", label: "IS50" },
  { value: "Cohesion", label: "Cohesion" },
  { value: "Friction Angle", label: "Friction Angle" },
  { value: "Result", label: "Result" },
  { value: "Value", label: "Value" },
  { value: "Comment", label: "Comment" },
];

export const DEFAULT_LAB_TEST_TYPE_GRAPHIC = "graphic_00.png";
export const LAB_TEST_RESULT_FIELDS_MAX_COUNT = 30;

export type LabTestResultField = {
  id: string;
  name: string;
  externalAlias?: string | null;
  tablogsAlias?: string | null;
};

export type LabTestTypeOption = ModuleNamedOption & {
  /** Filename under insitu-test-type-pngs (plot symbol on borelogs). */
  graphic?: string | null;
  externalAlias?: string | null;
  /** Selected alias table name (often matches a lab test type). */
  aliasTable?: string | null;
  /** When true, include this type in selected data-plot borelogs. */
  addAsSelectedDataPlot?: boolean;
  /** Active in left menu (false = inactive list). */
  active?: boolean;
  /** Columns for the Test Result Table Design. */
  labTestResultFields?: LabTestResultField[];
};

export function getLabTestTypeGraphicUrl(
  filename: string | null | undefined,
  kind: InsituTestTypeGraphicKind = "test"
): string {
  return getInsituTestTypeGraphicUrl(normalizeLabTestGraphicFilename(filename, kind), kind);
}

export function normalizeLabTestGraphicFilename(
  value: string | null | undefined,
  kind: InsituTestTypeGraphicKind = "test"
): string {
  return normalizeInsituGraphicFilename(value, kind);
}

export function labTestGraphicLabel(filename: string | null | undefined): string {
  const name = normalizeLabTestGraphicFilename(filename, "test");
  if (!name) return "Select Graphic";
  const match = name.match(/^graphic_(\d+)\.(png|svg)$/i);
  return match ? `lab_test_graphic_${match[1]}` : name;
}

export function toLabTestTypeGraphicCatalog(
  entries: readonly InsituTestTypeGraphicCatalogEntry[]
): InsituTestTypeGraphicCatalogEntry[] {
  return entries.map((entry) => ({
    ...entry,
    label: labTestGraphicLabel(entry.filename),
  }));
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return fallback;
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function createResultFieldId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `lab-result-field-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createBlankLabTestResultField(
  partial?: Partial<LabTestResultField>
): LabTestResultField {
  return {
    id: partial?.id ?? createResultFieldId(),
    name: partial?.name ?? "",
    externalAlias: partial?.externalAlias ?? null,
    tablogsAlias: partial?.tablogsAlias ?? null,
  };
}

function parseLabTestResultField(value: unknown, index: number): LabTestResultField | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name : "";
  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : `lab-result-field-${index + 1}`;

  return createBlankLabTestResultField({
    id,
    name,
    externalAlias:
      asNullableString(value.externalAlias) ?? asNullableString(value.external_alias),
    tablogsAlias:
      asNullableString(value.tablogsAlias) ?? asNullableString(value.tablogs_alias),
  });
}

export function parseLabTestResultFields(value: unknown): LabTestResultField[] {
  if (!Array.isArray(value)) return [];
  const fields: LabTestResultField[] = [];
  for (const [index, entry] of value.entries()) {
    if (fields.length >= LAB_TEST_RESULT_FIELDS_MAX_COUNT) break;
    const parsed = parseLabTestResultField(entry, index);
    if (parsed) fields.push(parsed);
  }
  return fields;
}

function slugifyLabTestTypeId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function createLabTestTypeOption(
  id: string,
  name: string,
  partial?: Partial<LabTestTypeOption>
): LabTestTypeOption {
  return createBlankLabTestTypeOption({
    ...partial,
    id,
    name: name.trim(),
  });
}

export function createBlankLabTestTypeOption(
  partial?: Partial<LabTestTypeOption>
): LabTestTypeOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    graphic: partial?.graphic ?? DEFAULT_LAB_TEST_TYPE_GRAPHIC,
    externalAlias: partial?.externalAlias ?? null,
    aliasTable: partial?.aliasTable ?? null,
    addAsSelectedDataPlot: partial?.addAsSelectedDataPlot ?? false,
    active: partial?.active ?? true,
    labTestResultFields: (partial?.labTestResultFields ?? []).map((field) => ({
      ...field,
    })),
  };
}

export function parseLabTestTypeOption(value: unknown, index: number): LabTestTypeOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : slugifyLabTestTypeId(name) || `lab-test-type-${index + 1}`;

  const graphicRaw = asNullableString(value.graphic);

  const resultFieldsRaw =
    value.labTestResultFields ??
    value.lab_test_result_fields ??
    value.resultFields ??
    value.result_fields ??
    value.testResultFields ??
    value.test_result_fields;

  return createBlankLabTestTypeOption({
    id,
    name,
    graphic: graphicRaw
      ? normalizeLabTestGraphicFilename(graphicRaw, "test") || graphicRaw
      : DEFAULT_LAB_TEST_TYPE_GRAPHIC,
    externalAlias:
      asNullableString(value.externalAlias) ?? asNullableString(value.external_alias),
    aliasTable:
      asNullableString(value.aliasTable) ??
      asNullableString(value.alias_table) ??
      asNullableString(value.aliasTableName) ??
      asNullableString(value.alias_table_name),
    addAsSelectedDataPlot:
      asBool(value.addAsSelectedDataPlot) ||
      asBool(value.add_as_selected_data_plot) ||
      asBool(value.addAsSelectedDataPlotBorelogs) ||
      asBool(value.add_as_selected_data_plot_borelogs),
    active: value.active === false ? false : true,
    labTestResultFields: parseLabTestResultFields(resultFieldsRaw),
  });
}

export function parseLabTestTypeOptions(
  value: unknown,
  fallback: readonly LabTestTypeOption[] = []
): LabTestTypeOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({
      ...entry,
      labTestResultFields: (entry.labTestResultFields ?? []).map((field) => ({ ...field })),
    }));
  }

  const options: LabTestTypeOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseLabTestTypeOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options.length > 0
    ? options
    : fallback.map((entry) => ({
        ...entry,
        labTestResultFields: (entry.labTestResultFields ?? []).map((field) => ({ ...field })),
      }));
}

export function cloneLabTestTypeOption(option: LabTestTypeOption): LabTestTypeOption {
  return {
    ...option,
    labTestResultFields: (option.labTestResultFields ?? []).map((field) => ({ ...field })),
  };
}

export function toLabTestTypeModuleNamedOption(option: LabTestTypeOption): ModuleNamedOption {
  return {
    id: option.id,
    name: option.name,
    graphic: option.graphic,
    externalAlias: option.externalAlias,
    aliasTable: option.aliasTable,
    addAsSelectedDataPlot: option.addAsSelectedDataPlot,
    active: option.active !== false,
    labTestResultFields: (option.labTestResultFields ?? []).map((field) => ({
      id: field.id,
      name: field.name,
      externalAlias: field.externalAlias ?? null,
      tablogsAlias: field.tablogsAlias ?? null,
    })),
  };
}

/** Default lab test types aligned with supplier / Tablogs lists. */
export const DEFAULT_LAB_TEST_TYPE_OPTIONS: LabTestTypeOption[] = LAB_TEST_TYPES.map((name) =>
  createLabTestTypeOption(slugifyLabTestTypeId(name) || name, name, {
    aliasTable: name,
    active: true,
    graphic: DEFAULT_LAB_TEST_TYPE_GRAPHIC,
    labTestResultFields: [createBlankLabTestResultField()],
  })
);
