import {
  intervalParamLabel,
  type InsituTestOtherSetting,
  type InsituTestTypeOption,
  type InsituTestUnitSettingField,
} from "./configModules/insituTestType";
import type { InsituTestResultValues } from "../types/logInsituTest";

export type InsituIntervalRow = {
  id: string;
  depthFromMm: string;
  depthToMm: string;
  value: string;
};

export type InsituSptDrive = {
  id: string;
  blows: string;
  lengthMm: string;
};

export type InsituFormFieldKind = "text" | "number" | "select" | "textarea";

export type InsituFormField = {
  key: string;
  label: string;
  kind: InsituFormFieldKind;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  help?: string;
};

export type InsituFormKind =
  | "penetration-rows"
  | "spt"
  | "unit-fields"
  | "result-rows"
  | "ass"
  | "simple";

export type InsituResultRow = {
  id: string;
  depthFrom: string;
  depthTo: string;
  values: Record<string, string>;
  comments: string;
};

export type InsituIntervalOption = {
  value: string;
  label: string;
  /** For DCP-style: spacing in mm. For SPT: number of drives. */
  interval: number | null;
};

export type InsituFormDescriptor = {
  kind: InsituFormKind;
  commentsLabel: string;
  showComments: boolean;
  intervalOptions: InsituIntervalOption[];
  defaultIntervalValue: string;
  /** Penetration table value column */
  valueColumnLabel: string;
  showEndDepth: boolean;
  showStartDepth: boolean;
  /** Unit / simple depth fields */
  depthFromLabel: string;
  depthFromRequired: boolean;
  showDepthTo: boolean;
  depthToLabel: string;
  depthToRequired: boolean;
  commentsPerRow: boolean;
  /** SPT */
  driveLengthMm: number;
  showNValue: boolean;
  showNLabel: boolean;
  showRecovery: boolean;
  showHammer: boolean;
  autoCalculateN: boolean;
  nCorrectionEnabled: boolean;
  nCorrectionFactor: number | null;
  nLabelOverrideAt: number | null;
  refusalLabel: string | null;
  /** Unit / simple fields */
  fields: InsituFormField[];
  emptyStateTitle?: string;
  emptyStateMessage?: string;
};

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function findSetting(
  option: InsituTestTypeOption | null,
  name: string
): InsituTestOtherSetting | undefined {
  return option?.settings?.otherSettings?.find(
    (entry) => entry.name.trim().toLowerCase() === name.trim().toLowerCase()
  );
}

export function isSettingEnabled(
  option: InsituTestTypeOption | null,
  name: string
): boolean {
  return findSetting(option, name)?.enabled === true;
}

function settingValue(option: InsituTestTypeOption | null, name: string): string | number | null {
  const setting = findSetting(option, name);
  return setting?.value ?? null;
}

function findIntervalsSetting(option: InsituTestTypeOption | null) {
  return findSetting(option, "Intervals");
}

export function getNormalizedTypeName(option: InsituTestTypeOption | null): string {
  return option?.name.trim().toUpperCase() ?? "";
}

export function getIntervalOptions(option: InsituTestTypeOption | null): InsituIntervalOption[] {
  const intervals = findIntervalsSetting(option);
  const params = (intervals?.params ?? []).filter((param) => param.active !== false);
  return params.map((param) => {
    const label = intervalParamLabel(param);
    const value =
      param.interval != null
        ? String(param.interval)
        : param.value != null
          ? String(param.value)
          : label;
    return {
      value,
      label,
      interval: param.interval != null && Number.isFinite(param.interval) ? param.interval : null,
    };
  });
}

export function defaultIntervalValue(option: InsituTestTypeOption | null): string {
  const options = getIntervalOptions(option);
  const name = getNormalizedTypeName(option);
  if (name === "SPT" || name === "MOD CAL" || name === "CAL" || name === "DMRS") {
    return options.find((entry) => entry.interval === 3)?.value ?? options[0]?.value ?? "3";
  }
  return (
    options.find((entry) => entry.interval === 100)?.value ??
    options.find((entry) => entry.interval != null)?.value ??
    options[0]?.value ??
    ""
  );
}

export function parseIntervalNumber(
  option: InsituTestTypeOption | null,
  intervalValue: string
): number | null {
  const match = getIntervalOptions(option).find((entry) => entry.value === intervalValue);
  if (match?.interval != null) return match.interval;
  const numeric = Number(intervalValue);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function formatMm(value: number): string {
  return value.toFixed(2);
}

export function mmToMeters(mm: string | number): string {
  const numeric = typeof mm === "number" ? mm : Number(mm);
  if (!Number.isFinite(numeric)) return "";
  const meters = numeric / 1000;
  if (Number.isInteger(meters)) return String(meters);
  return meters.toFixed(3).replace(/\.?0+$/, "");
}

export function metersToMm(meters: string | number): string {
  const numeric = typeof meters === "number" ? meters : Number(meters);
  if (!Number.isFinite(numeric)) return "0.00";
  return formatMm(numeric * 1000);
}

let rowIdCounter = 0;
export function createIntervalRowId(): string {
  rowIdCounter += 1;
  return `insitu-row-${Date.now().toString(36)}-${rowIdCounter}`;
}

export function createIntervalRow(
  depthFromMm: number,
  intervalMm: number | null,
  value = ""
): InsituIntervalRow {
  const to = intervalMm != null ? depthFromMm + intervalMm : depthFromMm;
  return {
    id: createIntervalRowId(),
    depthFromMm: formatMm(depthFromMm),
    depthToMm: formatMm(to),
    value,
  };
}

export function createDefaultIntervalRows(
  option: InsituTestTypeOption | null,
  intervalValue: string,
  count = 3
): InsituIntervalRow[] {
  const intervalMm = parseIntervalNumber(option, intervalValue);
  const rows: InsituIntervalRow[] = [];
  let from = 0;
  for (let index = 0; index < count; index += 1) {
    rows.push(createIntervalRow(from, intervalMm));
    from = intervalMm != null ? from + intervalMm : from;
  }
  return rows;
}

export function recalculateIntervalRows(
  rows: readonly InsituIntervalRow[],
  intervalMm: number | null
): InsituIntervalRow[] {
  if (intervalMm == null) return rows.map((row) => ({ ...row }));

  let from = 0;
  const firstFrom = Number(rows[0]?.depthFromMm);
  if (Number.isFinite(firstFrom) && firstFrom >= 0) from = firstFrom;

  return rows.map((row) => {
    const next = createIntervalRow(from, intervalMm, row.value);
    from += intervalMm;
    return { ...next, id: row.id };
  });
}

export function appendIntervalRow(
  rows: readonly InsituIntervalRow[],
  intervalMm: number | null
): InsituIntervalRow[] {
  const last = rows[rows.length - 1];
  const lastTo = Number(last?.depthToMm);
  const from = Number.isFinite(lastTo) ? lastTo : 0;
  return [...rows, createIntervalRow(from, intervalMm)];
}

export function createSptDrive(lengthMm: number, blows = ""): InsituSptDrive {
  return {
    id: createIntervalRowId(),
    blows,
    lengthMm: String(lengthMm),
  };
}

export function createSptDrives(count: number, lengthMm: number): InsituSptDrive[] {
  return Array.from({ length: Math.max(1, count) }, () => createSptDrive(lengthMm));
}

export function resizeSptDrives(
  drives: readonly InsituSptDrive[],
  count: number,
  lengthMm: number
): InsituSptDrive[] {
  const next = drives.slice(0, count).map((drive) => ({
    ...drive,
    lengthMm: String(lengthMm),
  }));
  while (next.length < count) {
    next.push(createSptDrive(lengthMm));
  }
  return next;
}

function unitFieldKey(field: InsituTestUnitSettingField, index: number): string {
  if (field.dataField?.trim()) return field.dataField.trim();
  if (field.column?.trim()) return field.column.trim();
  return `unit_field_${index}`;
}

function unitFieldLabel(field: InsituTestUnitSettingField): string {
  return field.displayName?.trim() || field.dataField?.trim() || field.column?.trim() || "Value";
}

function buildUnitFields(option: InsituTestTypeOption | null): InsituFormField[] {
  const units = option?.settings?.unitSettings ?? [];
  return units.map((field, index) => ({
    key: unitFieldKey(field, index),
    label: unitFieldLabel(field),
    kind: "number" as const,
    required: index === units.length - 1 || units.length === 1,
  }));
}

function commentsLabelFor(option: InsituTestTypeOption | null): string {
  const rename = findSetting(option, "Rename Comment Field");
  if (rename?.enabled && rename.value != null && String(rename.value).trim()) {
    return String(rename.value).trim();
  }
  return "Comments";
}

export function getInsituFormDescriptor(
  option: InsituTestTypeOption | null
): InsituFormDescriptor {
  const name = getNormalizedTypeName(option);
  const intervalOptions = getIntervalOptions(option);
  const commentsLabel = commentsLabelFor(option);
  const base: InsituFormDescriptor = {
    kind: "simple",
    commentsLabel,
    showComments: true,
    intervalOptions,
    defaultIntervalValue: defaultIntervalValue(option),
    valueColumnLabel: "Blow Count",
    showEndDepth: false,
    showStartDepth: false,
    depthFromLabel: "Depth (m)",
    depthFromRequired: true,
    showDepthTo: true,
    depthToLabel: "Depth To (m)",
    depthToRequired: false,
    commentsPerRow: false,
    driveLengthMm: 150,
    showNValue: true,
    showNLabel: false,
    showRecovery: false,
    showHammer: false,
    autoCalculateN: false,
    nCorrectionEnabled: false,
    nCorrectionFactor: null,
    nLabelOverrideAt: null,
    refusalLabel: null,
    fields: [],
  };

  if (name === "DCP" || name === "PSP" || name === "DPSH" || name === "DCP - SOWERS") {
    return {
      ...base,
      kind: "penetration-rows",
      valueColumnLabel: "Blow Count",
      showEndDepth:
        isSettingEnabled(option, `${name.split(" ")[0]} end depth`) ||
        isSettingEnabled(option, "DCP end depth") ||
        isSettingEnabled(option, "PSP end depth") ||
        isSettingEnabled(option, "DPSH end depth"),
      showStartDepth:
        isSettingEnabled(option, `${name.split(" ")[0]} start Depth`) ||
        isSettingEnabled(option, "DCP start Depth") ||
        isSettingEnabled(option, "PSP start Depth"),
    };
  }

  if (name === "SPT" || name === "MOD CAL" || name === "CAL" || name === "DMRS") {
    const sixDrives = isSettingEnabled(option, "SPT 6 Drives of 75mm");
    const correctionEnabled = isSettingEnabled(option, "SPT N Value Correction");
    const correctionRaw = settingValue(option, "SPT N Value Correction");
    const overrideRaw = settingValue(option, "N Value for Label override");
    const refusal = settingValue(option, "Default refusal SPT N Value label");
    return {
      ...base,
      kind: "spt",
      driveLengthMm: sixDrives ? 75 : 150,
      showNValue: true,
      showNLabel: isSettingEnabled(option, "Include SPT N Value text field"),
      showRecovery: isSettingEnabled(option, "SPT Recovery Calculation"),
      showHammer: isSettingEnabled(option, "Hammer and Weights"),
      autoCalculateN: isSettingEnabled(option, "N-Value Auto Calculation"),
      nCorrectionEnabled: correctionEnabled,
      nCorrectionFactor:
        typeof correctionRaw === "number"
          ? correctionRaw
          : correctionRaw != null
            ? Number(correctionRaw)
            : null,
      nLabelOverrideAt:
        typeof overrideRaw === "number"
          ? overrideRaw
          : overrideRaw != null
            ? Number(overrideRaw)
            : null,
      refusalLabel:
        isSettingEnabled(option, "Default refusal SPT N Value label") && refusal != null
          ? String(refusal)
          : null,
    };
  }

  if (name === "ASS") {
    return {
      ...base,
      kind: "ass",
      depthFromLabel: "Depth From",
      depthToLabel: "Depth To",
      showDepthTo: true,
      fields: [
        { key: "deltaPh", label: "ΔpH", kind: "text" },
        { key: "phf", label: "PHF", kind: "text" },
        { key: "phfox", label: "PHFOX", kind: "text" },
      ],
      emptyStateTitle: "No results found",
      emptyStateMessage:
        "",
    };
  }

  if (name === "PID") {
    const unitFields = buildUnitFields(option);
    return {
      ...base,
      kind: "result-rows",
      fields:
        unitFields.length > 0
          ? unitFields.map((field) => ({ ...field, required: false }))
          : [{ key: "other_comment", label: "PPM", kind: "number" }],
      depthFromLabel: "Depth From (m)",
      depthFromRequired: true,
      showDepthTo: true,
      depthToLabel: "Depth To (m)",
      depthToRequired: true,
      commentsPerRow: true,
      showComments: true,
    };
  }

  const unitFields = buildUnitFields(option);
  if (unitFields.length > 0) {
    const hideDepthTo = name === "PP" || name === "UCS";
    const useDepthFromLabel = name === "SV" || name === "TORVANE" || name === "EC";
    return {
      ...base,
      kind: "unit-fields",
      fields: unitFields,
      depthFromLabel: useDepthFromLabel ? "Depth From (m)" : "Depth (m)",
      showDepthTo: !hideDepthTo,
    };
  }

  return {
    ...base,
    kind: "simple",
    fields: [{ key: "result", label: "Result", kind: "text" }],
  };
}

export function emptyResultRowValues(fields: readonly InsituFormField[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) values[field.key] = "0";
  return values;
}

export function createResultRow(
  fields: readonly InsituFormField[],
  patch?: Partial<InsituResultRow>
): InsituResultRow {
  const { values: patchValues, ...rest } = patch ?? {};
  return {
    id: createIntervalRowId(),
    depthFrom: "0",
    depthTo: "0",
    comments: "",
    ...rest,
    values: {
      ...emptyResultRowValues(fields),
      ...(patchValues ?? {}),
    },
  };
}

export function createDefaultResultRows(
  fields: readonly InsituFormField[],
  count = 2
): InsituResultRow[] {
  return Array.from({ length: count }, () => createResultRow(fields));
}

export function appendResultRowSameDepth(
  rows: readonly InsituResultRow[],
  fields: readonly InsituFormField[]
): InsituResultRow[] {
  const last = rows[rows.length - 1];
  return [
    ...rows,
    createResultRow(fields, {
      depthFrom: last?.depthFrom ?? "0",
      depthTo: last?.depthTo ?? "0",
      comments: "",
      values: emptyResultRowValues(fields),
    }),
  ];
}

export function parseResultRowsFromTest(
  test: {
    depthFrom: string;
    depthTo: string;
    comments: string;
    results: string;
    resultValues: InsituTestResultValues;
  },
  fields: readonly InsituFormField[]
): InsituResultRow[] {
  if (Array.isArray(test.resultValues.resultRows) && test.resultValues.resultRows.length > 0) {
    return (test.resultValues.resultRows as InsituResultRow[]).map((row) =>
      createResultRow(fields, {
        id: row.id || createIntervalRowId(),
        depthFrom: asString(row.depthFrom),
        depthTo: asString(row.depthTo),
        comments: asString(row.comments),
        values: {
          ...emptyResultRowValues(fields),
          ...(row.values ?? {}),
        },
      })
    );
  }

  const values = emptyResultRowValues(fields);
  for (const field of fields) {
    if (test.resultValues[field.key] != null) {
      values[field.key] = asString(test.resultValues[field.key]);
    }
  }
  if (fields.length === 1 && (!values[fields[0].key] || values[fields[0].key] === "0") && test.results) {
    const numeric = test.results.replace(/\s*ppm$/i, "").trim();
    if (numeric) values[fields[0].key] = numeric;
  }

  return [
    createResultRow(fields, {
      depthFrom: test.depthFrom || "0",
      depthTo: test.depthTo || "0",
      comments: test.comments,
      values,
    }),
  ];
}

export function formatResultRowSummary(
  row: InsituResultRow,
  fields: readonly InsituFormField[]
): string {
  const parts: string[] = [];
  for (const field of fields) {
    const value = asString(row.values[field.key]).trim();
    if (!value) continue;
    if (field.label.toUpperCase() === "PPM") {
      parts.push(`${value} ppm`);
      continue;
    }
    parts.push(fields.length === 1 ? value : `${field.label} ${value}`);
  }
  return parts.join(" · ");
}

export function usesIntervalRowForm(option: InsituTestTypeOption | null): boolean {
  return getInsituFormDescriptor(option).kind === "penetration-rows";
}

export function getIntervalRowValueLabel(option: InsituTestTypeOption | null): string {
  return getInsituFormDescriptor(option).valueColumnLabel;
}

export function calculateSptNValue(
  drives: readonly InsituSptDrive[],
  descriptor: InsituFormDescriptor
): string {
  const blows = drives.map((drive) => {
    const numeric = Number(drive.blows);
    return Number.isFinite(numeric) ? numeric : null;
  });

  const filled = blows.map((entry) => (entry == null ? 0 : entry));
  const allEmpty = drives.every((drive) => !drive.blows.trim());
  if (allEmpty) return "";

  let n = 0;
  if (descriptor.driveLengthMm === 75 || drives.length >= 6) {
    const start = Math.max(0, filled.length - 4);
    n = filled.slice(start).reduce((sum, value) => sum + value, 0);
  } else if (filled.length >= 3) {
    n = (filled[1] ?? 0) + (filled[2] ?? 0);
  } else if (filled.length === 2) {
    n = (filled[0] ?? 0) + (filled[1] ?? 0);
  } else {
    n = filled[0] ?? 0;
  }

  if (
    descriptor.nCorrectionEnabled &&
    descriptor.nCorrectionFactor != null &&
    Number.isFinite(descriptor.nCorrectionFactor)
  ) {
    n = n * descriptor.nCorrectionFactor;
  }

  if (!Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatIntervalRowsSummary(rows: readonly InsituIntervalRow[]): string {
  if (!rows.length) return "";
  return rows.map((row) => asString(row.value).trim()).join(", ");
}

export function formatSptResultsSummary(
  drives: readonly InsituSptDrive[],
  nValue: string,
  nLabel: string
): string {
  const parts: string[] = [];
  const driveText = drives
    .map((drive) => {
      const blows = drive.blows.trim();
      if (!blows) return "";
      return `${blows}/${drive.lengthMm || "150"}`;
    })
    .filter(Boolean);
  if (driveText.length) parts.push(driveText.join(", "));
  if (nLabel.trim()) parts.push(nLabel.trim());
  else if (nValue.trim()) parts.push(`N=${nValue.trim()}`);
  return parts.join(" · ");
}

export function formatInsituResultsSummary(
  testTypeName: string,
  values: InsituTestResultValues
): string {
  const name = testTypeName.trim().toUpperCase();
  const parts: string[] = [];

  if (Array.isArray(values.sptDrives)) {
    return formatSptResultsSummary(
      values.sptDrives as InsituSptDrive[],
      asString(values.nValue),
      asString(values.nLabel)
    );
  }

  if (Array.isArray(values.rows)) {
    const rowSummary = formatIntervalRowsSummary(values.rows as InsituIntervalRow[]);
    if (rowSummary) parts.push(rowSummary);
    return parts.join(" · ");
  }

  if (values.blowCount != null && asString(values.blowCount).trim()) {
    return asString(values.blowCount).trim();
  }

  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = values[key];
      if (value != null && asString(value).trim()) return asString(value).trim();
    }
    return "";
  };

  if (name === "PP") {
    const reading = pick("pp_reading", "reading", "pp_reading_raw", "rawReading");
    if (reading) parts.push(reading);
  } else if (name === "UCS") {
    const reading = pick("ucs_reading", "ucsReading");
    if (reading) parts.push(reading);
  } else if (name === "SV" || name === "TORVANE") {
    const peak = pick("sv_peak", "peak", "raw_sv_peak");
    const residual = pick("sv_residual", "residual", "raw_sv_residual");
    if (peak) parts.push(`Peak ${peak}`);
    if (residual) parts.push(`Res ${residual}`);
  } else if (name === "CPT") {
    const result = pick("cpt_data", "cptResult", "result");
    if (result) parts.push(result);
  } else if (name === "PID") {
    const ppm = pick("other_comment", "ppm");
    if (ppm) parts.push(`${ppm} ppm`);
  } else {
    const nValue = pick("nValue");
    const result = pick("result", "value", "other_comment", "generic_value");
    if (nValue) parts.push(`N=${nValue}`);
    if (result) parts.push(result);
  }

  return parts.join(" · ");
}

export function parseRowsFromResultValues(
  values: InsituTestResultValues | null | undefined,
  fallbackDepthFromM = "",
  fallbackDepthToM = "",
  fallbackResult = ""
): InsituIntervalRow[] {
  if (values && Array.isArray(values.rows) && values.rows.length > 0) {
    return (values.rows as InsituIntervalRow[]).map((row) => ({
      id: row.id || createIntervalRowId(),
      depthFromMm: asString(row.depthFromMm),
      depthToMm: asString(row.depthToMm),
      value: asString(row.value),
    }));
  }

  const commaSeparated = asString(fallbackResult);
  if (commaSeparated.includes(",")) {
    const parts = commaSeparated.split(",").map((part) => part.trim());
    const fromMm =
      asString(values?.depthFromMm).trim() ||
      (fallbackDepthFromM ? metersToMm(fallbackDepthFromM) : "0.00");
    const toMm =
      asString(values?.depthToMm).trim() ||
      (fallbackDepthToM ? metersToMm(fallbackDepthToM) : fromMm);
    const start = Number(fromMm);
    const end = Number(toMm);
    const span =
      Number.isFinite(start) && Number.isFinite(end) && parts.length > 1
        ? (end - start) / parts.length
        : null;

    return parts.map((value, index) => {
      const rowFrom =
        span == null || !Number.isFinite(start)
          ? fromMm
          : (start + span * index).toFixed(2);
      const rowTo =
        span == null || !Number.isFinite(start)
          ? toMm
          : (start + span * (index + 1)).toFixed(2);
      return {
        id: createIntervalRowId(),
        depthFromMm: rowFrom,
        depthToMm: rowTo,
        value,
      };
    });
  }

  const blowCount = asString(
    values?.blowCount || values?.blows || values?.value || fallbackResult
  ).trim();
  const fromMm =
    asString(values?.depthFromMm).trim() ||
    (fallbackDepthFromM ? metersToMm(fallbackDepthFromM) : "0.00");
  const toMm =
    asString(values?.depthToMm).trim() ||
    (fallbackDepthToM ? metersToMm(fallbackDepthToM) : fromMm);

  return [
    {
      id: createIntervalRowId(),
      depthFromMm: fromMm,
      depthToMm: toMm,
      value: blowCount,
    },
  ];
}

export function parseSptDrivesFromResultValues(
  values: InsituTestResultValues | null | undefined,
  count: number,
  lengthMm: number
): InsituSptDrive[] {
  if (values && Array.isArray(values.sptDrives) && values.sptDrives.length > 0) {
    return resizeSptDrives(values.sptDrives as InsituSptDrive[], count, lengthMm);
  }
  return createSptDrives(count, lengthMm);
}

export function emptyResultValuesFromFields(
  fields: readonly InsituFormField[]
): InsituTestResultValues {
  const values: InsituTestResultValues = {};
  for (const field of fields) {
    values[field.key] = "";
  }
  return values;
}

/** @deprecated Prefer getInsituFormDescriptor */
export function buildInsituTestFormFields(option: InsituTestTypeOption | null): InsituFormField[] {
  return getInsituFormDescriptor(option).fields;
}

/** @deprecated Prefer getInsituFormDescriptor */
export function buildSimpleFormFields(option: InsituTestTypeOption | null): InsituFormField[] {
  return getInsituFormDescriptor(option).fields;
}
