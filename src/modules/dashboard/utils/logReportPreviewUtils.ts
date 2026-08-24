import type { SelectOption } from "@/shared/components/ui";
import type { HeaderFooterTemplate } from "../types/headerFooterTemplate";
import type { LogFormState } from "../types/log";
import type { LogTemplateRecord } from "../types/logTemplate";
import type { Project } from "../types/project";
import type { ReportPreviewTypeId } from "../data/logReportOptions";
import {
  DEFAULT_LOG_BUILDER_VERSION,
  DEFAULT_REPORT_ORIENTATION,
  DEFAULT_REPORT_PAGE_SIZE,
} from "../data/logReportOptions";
import type { PageOrientation, PageSize } from "../components/headerFooterBuilder/contentSchema";
import { COMPANY_LOGO_PATH } from "../data/branding";
import {
  getClassificationGraphicUrl,
  getModuleDataTypeOptions,
  matchPreviewClassification,
  type ClassificationCode,
  type ModuleNamedOption,
  type StoredModuleSettings,
  type WorkflowPreviewValues,
  type WorkflowStep,
} from "./configModuleSettings";
import {
  buildSubsurfacePreviewDescription,
  resolvePreviewClassificationDisplay,
} from "./configModules/subsurfaceDescription";
import { parseRowsFromResultValues } from "./insituTestForm";
import type { LogInsituTest } from "../types/logInsituTest";
import { getDrillingGraphicUrl, normalizeDrillingGraphicFilename } from "./configModules/drillingType";
import {
  DEFAULT_WATER_OBSERVATION_GRAPHIC,
  getWaterObservationGraphicUrl,
} from "./configModules/waterObservationType";
import {
  DEFAULT_WELL_BACKFILL_GRAPHIC,
  DEFAULT_WELL_BACKFILL_TYPE_OPTIONS,
  getWellBackfillGraphicUrl,
  normalizeWellBackfillGraphicFilename,
} from "./configModules/wellBackfillType";
import {
  DEFAULT_WELL_CASING_GRAPHIC,
  DEFAULT_WELL_CASING_TYPE_OPTIONS,
  getWellCasingGraphicUrl,
  normalizeWellCasingGraphicFilename,
} from "./configModules/wellCasingType";
import {
  DEFAULT_WELL_TYPE_OPTIONS,
  getWellTypeGraphicUrl,
  normalizeWellTypeGraphicFilename,
} from "./configModules/wellType";
import {
  groupForWorkflowStep,
  resolveLogReportFieldCode,
} from "./logReportFieldCodes";

function workflowStepKey(step: WorkflowStep): string {
  return step.fieldName?.trim() || step.name.trim();
}

function findWorkflowStepByLabels(
  steps: readonly WorkflowStep[],
  labels: readonly string[]
): WorkflowStep | undefined {
  const normalized = new Set(labels.map((label) => label.toLowerCase()));
  return steps.find((entry) => normalized.has(workflowStepKey(entry).toLowerCase()));
}

function splitWorkflowSelections(raw: unknown): string[] {
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (Array.isArray(raw)) {
    return raw
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Prefers a workflow option's abbreviation/code for report columns
 * (e.g. Consistency "Stiff" → "St"). Falls back to the stored value/name.
 */
function resolveWorkflowOptionCode(
  step: WorkflowStep | undefined,
  selection: string
): string {
  const token = selection.trim();
  if (!token) return "";
  if (!step?.options?.length) return token;

  const normalized = token.toLowerCase();
  const option = step.options.find((entry) => {
    const value = entry.value?.trim().toLowerCase() ?? "";
    const name = entry.name?.trim().toLowerCase() ?? "";
    const abbreviation = entry.abbreviation?.trim().toLowerCase() ?? "";
    const id = entry.id?.trim().toLowerCase() ?? "";
    return (
      value === normalized ||
      name === normalized ||
      abbreviation === normalized ||
      id === normalized
    );
  });

  const code = option?.abbreviation?.trim() || option?.value?.trim() || option?.name?.trim();
  const grouped = step ? groupForWorkflowStep(step) : null;
  return resolveLogReportFieldCode(code || token, grouped);
}

function readWorkflowFieldCode(
  values: WorkflowPreviewValues,
  steps: readonly WorkflowStep[],
  labels: readonly string[],
  storedFallback = ""
): string {
  // Prefer labels in caller order (e.g. Consistency before Density).
  for (const label of labels) {
    const step = findWorkflowStepByLabels(steps, [label]);
    if (!step) continue;
    const key = workflowStepKey(step);
    const selections = splitWorkflowSelections(values[key]);
    if (selections.length === 0) continue;
    return selections
      .map((selection) => resolveWorkflowOptionCode(step, selection))
      .filter(Boolean)
      .join(", ");
  }

  // Map a previously saved name/value through the first matching step's options.
  const fallbackSelections = splitWorkflowSelections(storedFallback);
  if (fallbackSelections.length === 0) {
    return resolveLogReportFieldCode(String(storedFallback ?? "").trim());
  }

  const fallbackStep =
    labels.map((label) => findWorkflowStepByLabels(steps, [label])).find(Boolean) ?? undefined;
  return fallbackSelections
    .map((selection) => resolveWorkflowOptionCode(fallbackStep, selection))
    .filter(Boolean)
    .join(", ");
}

function readWorkflowStepSelection(
  values: WorkflowPreviewValues,
  step: WorkflowStep
): string {
  const key = workflowStepKey(step);
  const raw = values[key];
  if (Array.isArray(raw)) {
    const first = raw.find((entry) => typeof entry === "string" && entry.trim());
    return typeof first === "string" ? first.trim() : "";
  }
  if (typeof raw === "string") return raw.trim();
  return "";
}

function isRockTypeStep(step: WorkflowStep): boolean {
  return step.optionSet === "rock_type" || step.databaseField === "rock_type";
}

function isNonSoilTypeStep(step: WorkflowStep): boolean {
  return step.optionSet === "non_soil_type" || step.databaseField === "non_soil_type";
}

function isOriginStep(step: WorkflowStep): boolean {
  const label = workflowStepKey(step).toLowerCase();
  return step.optionSet === "origin" || step.databaseField === "origin" || label === "origin";
}

function findNamedModuleOption(
  options: readonly ModuleNamedOption[],
  selected: string
): ModuleNamedOption | undefined {
  const normalized = selected.trim().toLowerCase();
  return options.find(
    (entry) =>
      entry.name.trim().toLowerCase() === normalized ||
      entry.id.trim().toLowerCase() === normalized ||
      (entry.code?.trim().toLowerCase() ?? "") === normalized
  );
}

function resolveManagedGraphicFilename(
  steps: readonly WorkflowStep[],
  values: WorkflowPreviewValues,
  subsurfaceSettings: StoredModuleSettings | undefined,
  optionSet: string,
  matchesStep: (step: WorkflowStep) => boolean,
  allowGraphic?: (option: ModuleNamedOption) => boolean
): string | null {
  if (!subsurfaceSettings) return null;
  const step = steps.find(matchesStep);
  if (!step) return null;
  const selected = readWorkflowStepSelection(values, step);
  if (!selected) return null;
  const option = findNamedModuleOption(
    getModuleDataTypeOptions(subsurfaceSettings, optionSet),
    selected
  );
  if (!option?.graphic?.trim()) return null;
  if (allowGraphic && !allowGraphic(option)) return null;
  return option.graphic.trim();
}

/** Classification graphic first, then origin / rock / non-soil managed options. */
function resolveStratumGraphicFilename(
  matched: ClassificationCode | null,
  steps: readonly WorkflowStep[],
  values: WorkflowPreviewValues,
  subsurfaceSettings: StoredModuleSettings | undefined
): string | null {
  if (matched?.graphic?.trim()) return matched.graphic.trim();

  const originGraphic = resolveManagedGraphicFilename(
    steps,
    values,
    subsurfaceSettings,
    "origin",
    isOriginStep,
    (option) => Boolean(option.overrideGraphic)
  );
  if (originGraphic) return originGraphic;

  const rockGraphic = resolveManagedGraphicFilename(
    steps,
    values,
    subsurfaceSettings,
    "rock_type",
    isRockTypeStep
  );
  if (rockGraphic) return rockGraphic;

  const nonSoilGraphic = resolveManagedGraphicFilename(
    steps,
    values,
    subsurfaceSettings,
    "non_soil_type",
    isNonSoilTypeStep
  );
  if (nonSoilGraphic) return nonSoilGraphic;

  return null;
}

export type LogReportSelection = {
  templateId: string;
  headerId: string;
  footerId: string;
  orientation: string;
  pageSize: string;
  metresPerPage: string;
  builderVersion: string;
};

export const EMPTY_LOG_REPORT_SELECTION: LogReportSelection = {
  templateId: "",
  headerId: "",
  footerId: "",
  orientation: DEFAULT_REPORT_ORIENTATION,
  pageSize: DEFAULT_REPORT_PAGE_SIZE,
  metresPerPage: "2",
  builderVersion: DEFAULT_LOG_BUILDER_VERSION,
};

export type PreviewStratum = {
  fromDepth: number;
  toDepth: number;
  /** Original subsurface row depth (before splitting duplicate-depth bands). */
  recordStartDepth: number;
  origin: string;
  classification: string;
  description: string;
  consistency: string;
  moisture: string;
  remarks: string;
  hatch: "concrete" | "fill" | "clay" | "silt" | "sand" | "empty";
  /** Real classification-code graphic (from the workflow's Classification Codes config), when resolved. */
  graphicUrl?: string;
  graphicColorOverlay?: string | null;
  fillOverrideColor?: string | null;
};

/**
 * Finish-log end depth in metres, when set and valid.
 * Used to cap the report so only depths within the finished hole are shown.
 */
export function parseFinishEndDepthMetres(
  endDepth: string | null | undefined
): number | null {
  const value = Number(String(endDepth ?? "").trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Keep subsurface intervals whose recorded bottom depth is inside the finish
 * end depth (e.g. depths 0.5, 1, 2 with end 1.5 → keep 0.5 and 1 only).
 */
export function clipStrataToEndDepth(
  strata: readonly PreviewStratum[],
  endDepthM: number | null
): PreviewStratum[] {
  if (endDepthM == null) return strata.map((entry) => ({ ...entry }));

  return strata
    .filter((stratum) => stratum.toDepth <= endDepthM + 1e-9)
    .map((stratum) => ({ ...stratum }));
}

/**
 * Report depth extent: finish end depth when set, otherwise deepest stratum.
 * Vertical track length per page still comes from Metres/Page.
 */
export function resolveReportDeepestMetres(
  strata: readonly PreviewStratum[],
  endDepth: string | null | undefined
): number {
  const endDepthM = parseFinishEndDepthMetres(endDepth);
  const strataDeepest = strata.reduce((max, stratum) => Math.max(max, stratum.toDepth), 0);
  if (endDepthM != null) return endDepthM;
  return strataDeepest;
}

/** Resolves a layer's classification-code graphic via the project's workflow config. */
export type StrataClassificationContext = {
  codes: readonly ClassificationCode[];
  steps: readonly WorkflowStep[];
  applyRules: boolean;
  subsurfaceSettings?: StoredModuleSettings;
};

const SEEDED_HEADER_NAMES: Record<ReportPreviewTypeId, string[]> = {
  borelog: ["Borelog Header Template 1"],
  corelog: ["Borelog Header Template 1", "Corelog Header Template 1"],
};

const SEEDED_FOOTER_NAMES: Record<ReportPreviewTypeId, string[]> = {
  borelog: ["Borelog Footer Template 1"],
  corelog: ["Borelog Footer Template 1", "Corelog Footer Template 1"],
};

export function filterHfForReportType(
  templates: HeaderFooterTemplate[],
  previewType: ReportPreviewTypeId
): HeaderFooterTemplate[] {
  if (previewType === "corelog") {
    return templates.filter(
      (template) =>
        template.reportType === "corelog" ||
        template.reportType === "borelog" ||
        template.reportType == null
    );
  }
  return templates.filter(
    (template) => template.reportType === previewType || template.reportType == null
  );
}

export function toTemplateOptions(
  templates: Array<{ id: string | number; name: string }>
): SelectOption[] {
  return templates.map((template) => ({
    value: String(template.id),
    label: template.name,
  }));
}

function pickBySeededName(
  templates: HeaderFooterTemplate[],
  seededNames: string[]
): HeaderFooterTemplate | undefined {
  for (const name of seededNames) {
    const match = templates.find(
      (template) => template.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (match) return match;
  }
  return undefined;
}

export function pickDefaultLogTemplate(
  templates: LogTemplateRecord[]
): LogTemplateRecord | undefined {
  return templates.find((template) => template.isDefault) ?? templates[0];
}

/**
 * Prefer the Log Config → Log Report module template (by id, then name),
 * then fall back to the user's default / first template.
 */
export function pickPreferredLogTemplate(
  templates: LogTemplateRecord[],
  preferredId?: string | null
): LogTemplateRecord | undefined {
  const preferred = preferredId?.trim();
  if (preferred) {
    const byId = templates.find((template) => String(template.id) === preferred);
    if (byId) return byId;
    const normalized = preferred.toLowerCase();
    const byName = templates.find(
      (template) => template.name.trim().toLowerCase() === normalized
    );
    if (byName) return byName;
  }
  return pickDefaultLogTemplate(templates);
}

export function pickPreferredHeader(
  templates: HeaderFooterTemplate[],
  previewType: ReportPreviewTypeId,
  preferredId?: string | null
): HeaderFooterTemplate | undefined {
  const preferred = preferredId?.trim();
  if (preferred) {
    const byId = templates.find((template) => String(template.id) === preferred);
    if (byId) return byId;
  }
  return pickDefaultHeader(templates, previewType);
}

export function pickPreferredFooter(
  templates: HeaderFooterTemplate[],
  previewType: ReportPreviewTypeId,
  preferredId?: string | null
): HeaderFooterTemplate | undefined {
  const preferred = preferredId?.trim();
  if (preferred) {
    const byId = templates.find((template) => String(template.id) === preferred);
    if (byId) return byId;
  }
  return pickDefaultFooter(templates, previewType);
}

/** Map builder column_data_source / label heuristics onto preview stratum fields. */
export function resolveStratumFieldForColumn(
  column: {
    text?: string;
    code?: string;
    column_data_source?: { group?: string; value?: string } | string;
    stringBuilder?: Array<{ text?: string; type?: string; code?: string }>;
  },
  stratum: PreviewStratum
): string | null {
  const dataSource = column.column_data_source;
  const sourceValue =
    typeof dataSource === "string"
      ? dataSource.toLowerCase()
      : String(dataSource?.value ?? "").toLowerCase();
  const sourceGroup =
    typeof dataSource === "string"
      ? ""
      : String(dataSource?.group ?? "").toLowerCase();
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase();
  const blob = `${sourceGroup} ${sourceValue} ${label}`;

  const fieldMatchers: Array<{ field: keyof PreviewStratum; needles: string[] }> = [
    { field: "origin", needles: ["soil_origin", "soil origin", "origin"] },
    {
      field: "classification",
      needles: ["classification_code", "classification code", "classif"],
    },
    {
      field: "description",
      needles: ["materialdescription", "material_description", "material description", "description"],
    },
    { field: "consistency", needles: ["consistency", "consist"] },
    { field: "moisture", needles: ["moisture"] },
    { field: "remarks", needles: ["remark"] },
  ];

  for (const { field, needles } of fieldMatchers) {
    if (needles.some((needle) => blob.includes(needle))) {
      const value = stratum[field];
      return typeof value === "string" && value.trim() ? value : null;
    }
  }

  // Free-text tokens from the column string builder (builder-configured literals).
  const tokens = Array.isArray(column.stringBuilder) ? column.stringBuilder : [];
  const freeText = tokens
    .filter((token) => token.type === "freeText" || (!token.code && token.text))
    .map((token) => String(token.text ?? "").trim())
    .filter(Boolean)
    .join("");
  return freeText || null;
}

export function pickDefaultHeader(
  templates: HeaderFooterTemplate[],
  previewType: ReportPreviewTypeId
): HeaderFooterTemplate | undefined {
  if (previewType === "corelog") {
    return pickBySeededName(templates, SEEDED_HEADER_NAMES.corelog) ?? templates[0];
  }
  const typed = templates.filter((template) => template.reportType === previewType);
  const pool = typed.length > 0 ? typed : templates;
  return pickBySeededName(pool, SEEDED_HEADER_NAMES[previewType]) ?? pool[0];
}

export function pickDefaultFooter(
  templates: HeaderFooterTemplate[],
  previewType: ReportPreviewTypeId
): HeaderFooterTemplate | undefined {
  if (previewType === "corelog") {
    return pickBySeededName(templates, SEEDED_FOOTER_NAMES.corelog) ?? templates[0];
  }
  const typed = templates.filter((template) => template.reportType === previewType);
  const pool = typed.length > 0 ? typed : templates;
  return pickBySeededName(pool, SEEDED_FOOTER_NAMES[previewType]) ?? pool[0];
}

export function selectionFromLogTemplate(
  template: LogTemplateRecord | undefined,
  base: LogReportSelection = EMPTY_LOG_REPORT_SELECTION
): Pick<LogReportSelection, "orientation" | "pageSize" | "metresPerPage"> {
  if (!template) {
    return {
      orientation: base.orientation,
      pageSize: base.pageSize,
      metresPerPage: base.metresPerPage,
    };
  }

  const config = template.config;
  // Sample Tablogs borelogs are landscape multi-column sheets. When the template
  // leaves orientation unset, keep the caller's base (defaults to landscape).
  const orientation =
    config.template_orientation === "landscape" || config.template_orientation === "portrait"
      ? config.template_orientation
      : base.orientation;

  const rawPage =
    String(config.template_page_size ?? config.templatePageSizeId ?? "")
      .trim()
      .toLowerCase() || base.pageSize;
  const pageSize = normalizeReportPageSize(rawPage);

  const metres =
    config.depth_per_page != null && Number.isFinite(Number(config.depth_per_page))
      ? String(config.depth_per_page)
      : base.metresPerPage;

  return { orientation, pageSize, metresPerPage: metres };
}

export function normalizeReportPageSize(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  if (normalized === "a3") return "a3";
  if (normalized === "letter" || normalized === "usletter") return "letter";
  if (normalized === "legal") return "letter";
  return "a4";
}

export function toHfPageSize(pageSize: string): PageSize {
  const normalized = normalizeReportPageSize(pageSize);
  if (normalized === "letter") return "Letter";
  return "A4";
}

export function toHfOrientation(orientation: string): PageOrientation {
  return orientation === "landscape" ? "landscape" : "portrait";
}

function pageDimsPx(pageSize: string, orientation: string): { w: number; h: number } {
  const normalized = normalizeReportPageSize(pageSize);
  const isLandscape = toHfOrientation(orientation) === "landscape";
  if (normalized === "a3") {
    return isLandscape ? { w: 1587, h: 1123 } : { w: 1123, h: 1587 };
  }
  if (normalized === "letter") {
    return isLandscape ? { w: 1056, h: 816 } : { w: 816, h: 1056 };
  }
  return isLandscape ? { w: 1123, h: 794 } : { w: 794, h: 1123 };
}

/** Approximate CSS page width in px for the composed sheet (@96dpi). */
export function reportPageWidthPx(pageSize: string, orientation: string): number {
  return pageDimsPx(pageSize, orientation).w;
}

export function reportPageHeightPx(pageSize: string, orientation: string): number {
  return pageDimsPx(pageSize, orientation).h;
}

function formatDisplayDate(isoDate: string): string {
  const trimmed = isoDate.trim();
  if (!trimmed) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${parsed.getFullYear()}`;
}

function formatPhone(phoneCode?: string | null, phoneNumber?: string | null): string {
  const code = phoneCode?.trim() ?? "";
  const number = phoneNumber?.trim() ?? "";
  if (!code && !number) return "";
  if (!code) return number;
  if (!number) return code;
  return `${code} ${number}`.trim();
}

export function buildLogReportTokenContext(
  project: Project,
  form: LogFormState,
  extras: {
    companyName?: string | null;
    companyLogoUrl?: string | null;
    companyEmail?: string | null;
    companyPhone?: string | null;
    phoneCode?: string | null;
    phoneNumber?: string | null;
    equipmentLabel?: string | null;
    supplierLabel?: string | null;
    /** 1-based page index for {{page}} / "Page X of Y" footer tokens. */
    page?: number;
    /** Total page count for {{pages}}. */
    pages?: number;
  } = {}
): Record<string, string> {
  const elevation = formatElevationHeaderValue(form.elevation);
  const endDepth = form.endDepth.trim();
  const totalDepth = endDepth ? `${endDepth} m BGL` : "";
  const phone =
    extras.companyPhone?.trim() ||
    formatPhone(extras.phoneCode, extras.phoneNumber);
  const page = Math.max(1, Math.floor(extras.page ?? 1));
  const pages = Math.max(page, Math.floor(extras.pages ?? 1));

  const context: Record<string, string> = {
    "{{page}}": String(page),
    "{{pages}}": String(pages),
    "{{date}}": formatDisplayDate(new Date().toISOString().slice(0, 10)),
    "{{time}}": new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    "{{project.id}}": String(project.id),
    "{{project.name}}": project.name ?? "",
    "{{project.number}}": project.projectNo ?? "",
    "{{project.client}}": project.client ?? "",
    "{{project.location}}": project.location || project.address || "",
    "{{location.easting}}": form.easting || project.easting || "",
    "{{location.northing}}": form.northing || project.northing || "",
    "{{location.elevation}}": elevation,
    // Alias seen in some header templates / Tablogs exports.
    "{{location.elevation1}}": elevation,
    "{{location.utm}}": form.utmZone || "",
    "{{location.lat}}": form.latitude || project.latitude || "",
    "{{location.lng}}": form.longitude || project.longitude || "",
    "{{log.bh_no}}": form.logNumber || "",
    "{{log.title}}": form.logNumber || "",
    "{{log.date_drilled}}": formatDisplayDate(form.drillingDate),
    "{{log.logged_by}}": form.loggedBy || "",
    "{{log.reviewed_by}}": form.reviewedBy || "",
    "{{log.total_depth}}": totalDepth,
    "{{log.location_comment}}": form.locationComment || "",
    "{{log.driller}}": extras.supplierLabel?.trim() || "",
    "{{log.equipment}}": extras.equipmentLabel?.trim() || "",
    "{{log.method}}": "",
    "{{company.phone}}": phone,
  };

  const companyName = extras.companyName?.trim();
  if (companyName) context["{{company.name}}"] = companyName;
  const logo = extras.companyLogoUrl?.trim() || COMPANY_LOGO_PATH;
  context["{{company.logo}}"] = logo;
  const email = extras.companyEmail?.trim();
  if (email) context["{{company.email}}"] = email;

  return context;
}

/** Minimum visible band (m) so depth-0 / zero-thickness layers still show graphic + text. */
const ZERO_THICKNESS_BAND_M = 0.15;

/**
 * Build report strata from saved subsurface layers.
 * Each layer's `depth` is the **start** of that lithology interval; toDepth is the
 * next layer's depth, or the log finish depth for the deepest row.
 *
 * Depth 0 is valid. Zero-thickness intervals are expanded to a small visible band
 * so graphic / origin / description still render on the report.
 */
export function buildStrataFromLayers(
  layers: Array<{
    depth: string;
    origin: string;
    classification: string;
    description: string;
    consistency?: string;
    moisture?: string;
    remarks?: string;
    hatch?: PreviewStratum["hatch"];
    values?: WorkflowPreviewValues;
    sortOrder?: number;
  }>,
  classificationContext?: StrataClassificationContext,
  endDepthM: number | null = null
): PreviewStratum[] {
  const sorted = [...layers].sort((a, b) => {
    const aDepth = Number(a.depth);
    const bDepth = Number(b.depth);
    const aValid = Number.isFinite(aDepth);
    const bValid = Number.isFinite(bDepth);
    if (aValid && bValid && aDepth !== bDepth) return aDepth - bDepth;
    if (aValid && bValid) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    return a.depth.localeCompare(b.depth);
  });

  const numericDepths = sorted
    .map((layer) => Number(layer.depth))
    .filter((depth) => Number.isFinite(depth));
  const distinctDepths = Array.from(new Set(numericDepths.map((d) => Math.round(d * 1000) / 1000))).sort(
    (a, b) => a - b
  );

  const intervalEndByDepth = new Map<number, number>();
  for (const depth of distinctDepths) {
    const nextDepth = distinctDepths.find((value) => value > depth + 1e-6);
    let intervalEnd: number;
    if (nextDepth != null) {
      intervalEnd = nextDepth;
    } else if (endDepthM != null && endDepthM > depth + 1e-9) {
      intervalEnd = endDepthM;
    } else {
      intervalEnd = depth + 0.5;
    }
    intervalEndByDepth.set(depth, intervalEnd);
  }

  const countByDepth = new Map<number, number>();
  for (const depth of numericDepths) {
    const rounded = Math.round(depth * 1000) / 1000;
    countByDepth.set(rounded, (countByDepth.get(rounded) ?? 0) + 1);
  }

  const indexWithinDepth = new Map<number, number>();

  const strata = sorted.map((layer) => {
    const recordStartDepthRaw = Number(layer.depth);
    const recordStartDepth = Number.isFinite(recordStartDepthRaw)
      ? Math.round(recordStartDepthRaw * 1000) / 1000
      : 0;
    const intervalEnd = intervalEndByDepth.get(recordStartDepth) ?? recordStartDepth + 0.5;
    const countAtDepth = countByDepth.get(recordStartDepth) ?? 1;
    const sliceIndex = indexWithinDepth.get(recordStartDepth) ?? 0;
    indexWithinDepth.set(recordStartDepth, sliceIndex + 1);

    const span = Math.max(intervalEnd - recordStartDepth, ZERO_THICKNESS_BAND_M * countAtDepth);
    const sliceHeight = span / countAtDepth;
    const fromDepth = recordStartDepth + sliceIndex * sliceHeight;
    let toDepth = recordStartDepth + (sliceIndex + 1) * sliceHeight;
    if (sliceIndex === countAtDepth - 1) {
      toDepth = intervalEnd;
    }

    const hatch = layer.hatch ?? "empty";
    const savedDescription = typeof layer.description === "string" ? layer.description.trim() : "";
    const matchedResult = classificationContext
      ? matchPreviewClassification(
          classificationContext.codes,
          classificationContext.steps,
          layer.values ?? {},
          classificationContext.applyRules
        )
      : null;
    const matched = matchedResult?.code ?? null;
    const generatedDescription =
      savedDescription ||
      (classificationContext && layer.values
        ? buildSubsurfacePreviewDescription(
            classificationContext.steps,
            layer.values,
            classificationContext.subsurfaceSettings,
            resolvePreviewClassificationDisplay(
              classificationContext.steps,
              layer.values,
              classificationContext.subsurfaceSettings,
              matchedResult ?? {
                name: layer.classification.trim() || "",
                abbreviation: layer.classification.trim() || "",
                code: null,
              }
            )
          )
        : "");

    const values = layer.values ?? {};
    const consistency = classificationContext
      ? readWorkflowFieldCode(
          values,
          classificationContext.steps,
          ["consistency", "stiffness", "density"],
          layer.consistency ?? ""
        )
      : resolveLogReportFieldCode(layer.consistency?.trim() ?? "");
    const moisture = classificationContext
      ? readWorkflowFieldCode(
          values,
          classificationContext.steps,
          ["moisture", "rock moisture"],
          layer.moisture ?? ""
        )
      : resolveLogReportFieldCode(layer.moisture?.trim() ?? "", "moisture");

    return {
      fromDepth: Number(fromDepth.toFixed(3)),
      toDepth: Number(toDepth.toFixed(3)),
      recordStartDepth,
      origin: layer.origin.trim(),
      classification: layer.classification.trim(),
      description: generatedDescription,
      consistency,
      moisture,
      remarks: layer.remarks?.trim() ?? "",
      hatch:
        hatch === "concrete" ||
        hatch === "fill" ||
        hatch === "clay" ||
        hatch === "silt" ||
        hatch === "sand" ||
        hatch === "empty"
          ? hatch
          : "empty",
      graphicUrl: (() => {
        const filename = classificationContext
          ? resolveStratumGraphicFilename(
              matched,
              classificationContext.steps,
              layer.values ?? {},
              classificationContext.subsurfaceSettings
            )
          : matched?.graphic?.trim() || null;
        return filename ? getClassificationGraphicUrl(filename) : undefined;
      })(),
      graphicColorOverlay: matched?.graphicColorOverlay ?? null,
      fillOverrideColor: matched?.fillOverrideColor ?? null,
    };
  });

  return expandZeroThicknessStrata(strata);
}

/**
 * Zero-thickness strata (from === to), including a subsurface row at depth 0,
 * get a small positive depth span so the report can paint hatch and cell text.
 * When a deeper layer follows, that band is carved from the start of its interval.
 */
export function expandZeroThicknessStrata(strata: PreviewStratum[]): PreviewStratum[] {
  if (strata.length === 0) return strata;
  const result = strata.map((entry) => ({ ...entry }));

  for (let i = 0; i < result.length; i += 1) {
    const current = result[i];
    if (current.toDepth > current.fromDepth + 1e-9) continue;

    const next = result[i + 1];
    if (next && next.toDepth > current.fromDepth + 1e-9) {
      const available = next.toDepth - current.fromDepth;
      const band = Math.min(ZERO_THICKNESS_BAND_M, Math.max(available * 0.25, Math.min(0.05, available)));
      const newTo = Number((current.fromDepth + Math.min(band, available * 0.5)).toFixed(3));
      current.toDepth = newTo > current.fromDepth ? newTo : Number((current.fromDepth + available * 0.5).toFixed(3));
      next.fromDepth = current.toDepth;
    } else {
      current.toDepth = Number((current.fromDepth + ZERO_THICKNESS_BAND_M).toFixed(3));
    }
  }

  return result;
}

export type DcpPoint = { depthM: number; blows: number; testTypeId?: string };

/** Drop DCP readings past the finish end depth. */
export function clipDcpPointsToEndDepth(
  points: readonly DcpPoint[],
  endDepthM: number | null
): DcpPoint[] {
  if (endDepthM == null) return points.map((point) => ({ ...point }));
  return points.filter((point) => point.depthM <= endDepthM + 1e-9);
}

/** One drilling-method interval drawn in the report Drilling Method column. */
export type PreviewDrillingInterval = {
  fromDepth: number;
  toDepth: number;
  label: string;
  graphicUrl?: string;
};

/** Clip drilling-method intervals to the finish end depth. */
export function clipDrillingIntervalsToEndDepth(
  intervals: readonly PreviewDrillingInterval[],
  endDepthM: number | null
): PreviewDrillingInterval[] {
  if (endDepthM == null) return intervals.map((interval) => ({ ...interval }));
  return intervals
    .filter((interval) => interval.fromDepth < endDepthM - 1e-9)
    .map((interval) => ({
      ...interval,
      toDepth: Math.min(interval.toDepth, endDepthM),
    }))
    .filter((interval) => interval.toDepth > interval.fromDepth + 1e-9);
}

/**
 * Maps saved log drilling methods to depth-positioned report intervals,
 * resolving each method's configured graphic from the drilling-types catalog.
 * Default Tablogs-style graphics when a drilling type has no configured file.
 */
const FALLBACK_DRILLING_GRAPHIC_BY_KEY: Record<string, string> = {
  auger: "graphic02.jpg",
  washbore: "graphic09.jpg",
  "wash-bore": "graphic09.jpg",
  coring: "graphic03.jpg",
  "nmlc-coring": "graphic04.jpg",
  nmlc: "graphic04.jpg",
  "hq-coring": "graphic05.jpg",
  hq: "graphic05.jpg",
  "direct-push": "graphic06.jpg",
  directpush: "graphic06.jpg",
  rotary: "graphic07.jpg",
  sonic: "graphic08.jpg",
  "cable-tool": "graphic10.jpg",
  cabletool: "graphic10.jpg",
};

function resolveFallbackDrillingGraphic(
  id: string,
  name: string
): string | null {
  const keys = [id, name]
    .map((value) => value.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);
  for (const key of keys) {
    if (FALLBACK_DRILLING_GRAPHIC_BY_KEY[key]) {
      return FALLBACK_DRILLING_GRAPHIC_BY_KEY[key];
    }
    const compact = key.replace(/[^a-z0-9]+/g, "");
    if (FALLBACK_DRILLING_GRAPHIC_BY_KEY[compact]) {
      return FALLBACK_DRILLING_GRAPHIC_BY_KEY[compact];
    }
  }
  return null;
}

/** Compact method name for vertical overlay inside Tablogs-style shaft graphics. */
export function formatDrillingMethodDisplayLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "Drilling";
  return trimmed.replace(/\s+/g, "");
}

function resolveDrillingIntervalGraphic(
  type:
    | {
        graphic?: string | null;
        tablogsAlias?: string | null;
        name?: string;
      }
    | undefined,
  methodId: string,
  label: string
): string | null {
  const alias = type?.tablogsAlias?.trim().toLowerCase() ?? "";
  const fallback =
    resolveFallbackDrillingGraphic(alias, label) ||
    resolveFallbackDrillingGraphic(methodId, label) ||
    resolveFallbackDrillingGraphic(type?.name ?? "", label);

  const configured = normalizeDrillingGraphicFilename(type?.graphic);
  if (!configured) return fallback;

  const compactLabel = formatDrillingMethodDisplayLabel(label).toLowerCase();
  const isLegacyWashboreGraphic =
    configured === "graphic02.jpg" &&
    (alias === "washbore" || compactLabel === "washbore");

  if (isLegacyWashboreGraphic) {
    return fallback ?? "graphic09.jpg";
  }

  return configured || fallback;
}

export function buildDrillingIntervalsFromMethods(
  methods: ReadonlyArray<{
    depthFrom: string;
    depthTo: string;
    drillingMethodId: string;
    drillingMethodName: string;
  }>,
  drillingTypes: ReadonlyArray<{
    id: string;
    name?: string;
    tablogsAlias?: string | null;
    graphic?: string | null;
    active?: boolean;
  }> = []
): PreviewDrillingInterval[] {
  const byId = new Map(drillingTypes.map((type) => [type.id.trim().toLowerCase(), type]));

  const intervals: PreviewDrillingInterval[] = [];
  for (const method of methods) {
    const fromDepth = Number(method.depthFrom);
    const toDepth = Number(method.depthTo);
    if (!Number.isFinite(fromDepth) || !Number.isFinite(toDepth)) continue;
    if (toDepth <= fromDepth) continue;

    const type =
      byId.get(method.drillingMethodId.trim().toLowerCase()) ??
      drillingTypes.find(
        (entry) =>
          entry.name?.trim().toLowerCase() === method.drillingMethodName.trim().toLowerCase()
      );

    const label =
      method.drillingMethodName.trim() ||
      type?.name?.trim() ||
      method.drillingMethodId.trim() ||
      "Drilling";
    const displayLabel = formatDrillingMethodDisplayLabel(label);

    const graphicFilename = resolveDrillingIntervalGraphic(
      type,
      method.drillingMethodId,
      label
    );
    const graphicUrl = graphicFilename
      ? getDrillingGraphicUrl(graphicFilename)
      : undefined;

    intervals.push({
      fromDepth: Number(fromDepth.toFixed(3)),
      toDepth: Number(toDepth.toFixed(3)),
      label: displayLabel,
      graphicUrl: graphicUrl || undefined,
    });
  }

  return intervals.sort((a, b) => a.fromDepth - b.fromDepth || a.toDepth - b.toDepth);
}

const DEFAULT_DCP_TEST_TYPE_IDS = ["dcp", "psp", "dpsh"];

function normalizeTestTypeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isDcpFamilyTest(
  test: LogInsituTest,
  allowTokens: ReadonlySet<string>
): boolean {
  const id = normalizeTestTypeToken(test.testTypeId);
  const name = normalizeTestTypeToken(test.testTypeName);
  if (allowTokens.has(id) || allowTokens.has(name)) return true;
  // Chart templates often use source value "DCP" while the saved type id is "dcp".
  if (name.includes("dcp") || name.includes("psp") || name.includes("dpsh")) return true;
  if (id.includes("dcp") || id.includes("psp") || id.includes("dpsh")) return true;
  return false;
}

function isTemplateColumnVisible(column: Record<string, unknown>): boolean {
  return column.visibility !== false && !column.hidden;
}

function collectPenetrationCodesFromColumn(column: Record<string, unknown>): string[] {
  const codes: string[] = [];
  const label = `${String(column.text ?? "")} ${String(column.code ?? "")}`.toLowerCase();
  const dataSource = column.column_data_source;
  const sourceValue =
    typeof dataSource === "string"
      ? dataSource.toLowerCase()
      : String(
          dataSource && typeof dataSource === "object"
            ? (dataSource as { value?: unknown }).value ?? ""
            : ""
        ).toLowerCase();

  const push = (raw: string) => {
    const token = raw.trim();
    if (token) codes.push(token);
  };

  if (label.includes("psp") || sourceValue === "psp" || sourceValue.includes("psp")) {
    push("psp");
  }
  if (label.includes("dpsh") || sourceValue === "dpsh" || sourceValue.includes("dpsh")) {
    push("dpsh");
  }
  if (
    column.column_type === "chart" ||
    label.includes("dcp graph") ||
    label.includes("dcp") ||
    sourceValue === "dcp" ||
    sourceValue.includes("dcp")
  ) {
    push("dcp");
  }

  const seriesList = Array.isArray(column.chart_data) ? column.chart_data : [];
  for (const series of seriesList) {
    if (!series || typeof series !== "object") continue;
    const source = (series as { column_data_source?: { value?: unknown } }).column_data_source;
    push(String(source?.value ?? ""));

    const multi = (series as { selectedMultiChartOptions?: unknown }).selectedMultiChartOptions;
    if (!Array.isArray(multi)) continue;
    for (const option of multi) {
      if (!option || typeof option !== "object") continue;
      const optionSource = (option as { column_data_source?: { value?: unknown } })
        .column_data_source;
      push(String(optionSource?.value ?? ""));
      push(String((option as { name?: unknown }).name ?? ""));
    }
  }

  return codes;
}

/**
 * Reads DCP / PSP / DPSH codes from **visible** log-template columns so the
 * report only loads insitu tests that match the builder selection.
 */
export function getDcpTestTypeCodesFromLogTemplate(
  template: { config?: { columnData?: Array<Record<string, unknown>> } } | null | undefined
): string[] {
  const columns = template?.config?.columnData;
  if (!Array.isArray(columns)) return [...DEFAULT_DCP_TEST_TYPE_IDS];

  const codes = new Set<string>();
  for (const column of columns) {
    if (!column || typeof column !== "object") continue;
    if (!isTemplateColumnVisible(column)) continue;
    const label = `${String(column.text ?? "")} ${String(column.code ?? "")}`.toLowerCase();
    const columnType = String(column.column_type ?? "");
    // Standalone PSP text column uses band cells, not the DCP scatter plot.
    const isPspText =
      columnType !== "chart" &&
      (label.trim() === "psp" || label.startsWith("psp ") || label.includes(" psp"));
    if (isPspText) continue;
    const isPenetration =
      columnType === "chart" ||
      label.includes("dcp graph") ||
      label.includes("dcp") ||
      label.includes("dpsh");
    if (!isPenetration) continue;
    for (const code of collectPenetrationCodesFromColumn(column)) {
      codes.add(code);
    }
  }

  return codes.size > 0 ? [...codes] : [...DEFAULT_DCP_TEST_TYPE_IDS];
}

/** Per-column penetration codes (PSP column → PSP only; DCP graph → its series). */
export function getPenetrationTestCodesForColumn(
  column: Record<string, unknown> | null | undefined
): string[] {
  if (!column || typeof column !== "object") return [...DEFAULT_DCP_TEST_TYPE_IDS];
  const codes = collectPenetrationCodesFromColumn(column);
  return codes.length > 0 ? codes : [...DEFAULT_DCP_TEST_TYPE_IDS];
}

/** Keep only points whose test family matches the column's data source. */
export function filterDcpPointsForColumn(
  points: readonly DcpPoint[],
  column: Record<string, unknown> | null | undefined
): DcpPoint[] {
  const allow = new Set(
    getPenetrationTestCodesForColumn(column).map((id) => normalizeTestTypeToken(id)).filter(Boolean)
  );
  if (allow.size === 0) return points.map((point) => ({ ...point }));
  return points.filter((point) => {
    const token = normalizeTestTypeToken(point.testTypeId ?? "");
    if (!token) return true;
    if (allow.has(token)) return true;
    for (const code of allow) {
      if (token.includes(code) || code.includes(token)) return true;
    }
    return false;
  });
}

export type PreviewWaterObservation = {
  depthM: number;
  /** Display label in the Water column (may include comments: "Standing - test"). */
  label: string;
  /** Observation type name only (e.g. "Standing") for footer legend. */
  typeName: string;
  graphicUrl?: string;
};

export function buildWaterObservationsForPreview(
  observations: ReadonlyArray<{
    depth: string;
    observationTypeName?: string;
    observationTypeId?: string;
    comments?: string | null;
    graphicUrl?: string | null;
  }>
): PreviewWaterObservation[] {
  const points: PreviewWaterObservation[] = [];
  for (const entry of observations) {
    const depthM = Number(String(entry.depth ?? "").trim());
    if (!Number.isFinite(depthM) || depthM < 0) continue;
    const typeName =
      entry.observationTypeName?.trim() ||
      entry.observationTypeId?.trim() ||
      "Water";
    const comments = entry.comments?.trim() ?? "";
    // Tablogs-style: "Standing - test" when a comment is present.
    const label = comments ? `${typeName} - ${comments}` : typeName;
    points.push({
      depthM: Number(depthM.toFixed(3)),
      label,
      typeName,
      graphicUrl: entry.graphicUrl?.trim() || undefined,
    });
  }
  return points.sort((a, b) => a.depthM - b.depthM);
}

/** Unique water types used on the log, in first-seen depth order (footer legend). */
export function buildUsedWaterLegendItems(
  observations: readonly PreviewWaterObservation[]
): Array<{ label: string; graphicUrl: string }> {
  const seen = new Set<string>();
  const items: Array<{ label: string; graphicUrl: string }> = [];
  for (const entry of observations) {
    const typeName = (entry.typeName || entry.label).trim();
    const key = typeName.toLowerCase();
    if (!typeName || seen.has(key)) continue;
    seen.add(key);
    items.push({
      label: typeName,
      graphicUrl:
        entry.graphicUrl?.trim() ||
        getWaterObservationGraphicUrl(DEFAULT_WATER_OBSERVATION_GRAPHIC),
    });
  }
  return items;
}

export function clipWaterObservationsToEndDepth(
  observations: readonly PreviewWaterObservation[],
  endDepthM: number | null
): PreviewWaterObservation[] {
  if (endDepthM == null) return observations.map((entry) => ({ ...entry }));
  return observations.filter((entry) => entry.depthM <= endDepthM + 1e-9);
}

/** Depth-banded PSP text cells (Tablogs: bordered "PSP: n" boxes). */
export type PreviewPspBand = {
  fromDepth: number;
  toDepth: number;
  label: string;
};

function isPspInsituTest(test: LogInsituTest): boolean {
  const id = normalizeTestTypeToken(test.testTypeId);
  const name = normalizeTestTypeToken(test.testTypeName);
  return id === "psp" || name === "psp" || id.includes("psp") || name.includes("psp");
}

function penetrationDepthToMetres(raw: number, intervalMm: number): number {
  if (!Number.isFinite(raw)) return NaN;
  if (Number.isFinite(intervalMm) && intervalMm >= 10) return raw / 1000;
  if (Math.abs(raw) >= 10) return raw / 1000;
  return raw;
}

/**
 * Builds Tablogs-style PSP column bands from PSP insitu interval rows.
 * Each row becomes a bordered cell labelled "PSP: {value}" spanning its depth interval.
 */
export function buildPspBandsFromInsituTests(
  tests: readonly LogInsituTest[]
): PreviewPspBand[] {
  const bands: PreviewPspBand[] = [];

  for (const test of tests) {
    if (!isPspInsituTest(test)) continue;
    const rows = parseRowsFromResultValues(
      test.resultValues,
      test.depthFrom,
      test.depthTo,
      test.results
    );
    const intervalMm = Number(String(test.resultValues?.interval ?? "").trim());

    for (const row of rows) {
      const rawValue = String(row.value ?? "").trim();
      if (!rawValue) continue;

      const fromRaw = Number(row.depthFromMm);
      const toRaw = Number(row.depthToMm);
      let fromDepth = penetrationDepthToMetres(fromRaw, intervalMm);
      let toDepth = penetrationDepthToMetres(toRaw, intervalMm);

      if (!Number.isFinite(fromDepth) && Number.isFinite(toDepth)) {
        fromDepth = toDepth;
      }
      if (!Number.isFinite(toDepth) && Number.isFinite(fromDepth)) {
        const stepM =
          Number.isFinite(intervalMm) && intervalMm > 0
            ? intervalMm >= 10
              ? intervalMm / 1000
              : intervalMm
            : 0.1;
        toDepth = fromDepth + stepM;
      }
      if (!Number.isFinite(fromDepth) || !Number.isFinite(toDepth)) continue;
      if (toDepth < fromDepth) {
        const swap = fromDepth;
        fromDepth = toDepth;
        toDepth = swap;
      }
      if (toDepth - fromDepth < 1e-6) {
        toDepth = fromDepth + 0.05;
      }

      bands.push({
        fromDepth: Number(fromDepth.toFixed(3)),
        toDepth: Number(toDepth.toFixed(3)),
        label: `PSP: ${rawValue}`,
      });
    }
  }

  return bands.sort((a, b) => a.fromDepth - b.fromDepth || a.toDepth - b.toDepth);
}

export function clipPspBandsToEndDepth(
  bands: readonly PreviewPspBand[],
  endDepthM: number | null
): PreviewPspBand[] {
  if (endDepthM == null) return bands.map((band) => ({ ...band }));
  return bands
    .filter((band) => band.fromDepth < endDepthM - 1e-9)
    .map((band) => ({
      ...band,
      toDepth: Math.min(band.toDepth, endDepthM),
    }))
    .filter((band) => band.toDepth > band.fromDepth + 1e-9);
}

/** Well Diagram depth bands from Well Logs (pipe) and optional backfill/casing. */
export type PreviewWellInterval = {
  fromDepth: number;
  toDepth: number;
  label: string;
  kind: "well" | "backfill" | "casing";
  /**
   * How to fill the shaft segment:
   * - empty: solid/blank pipe (white interior, border only)
   * - pattern: tile `graphicUrl`
   * - hatch: CSS horizontal hatch (slotted fallback)
   */
  fill: "empty" | "pattern" | "hatch";
  graphicUrl?: string;
};

type WellTypeGraphicSource = {
  id?: string;
  name?: string;
  tablogsAlias?: string | null;
  graphic?: string | null;
};

function parseWellDepthPair(fromRaw: string, toRaw: string): { fromDepth: number; toDepth: number } | null {
  let fromDepth = Number(String(fromRaw ?? "").trim());
  let toDepth = Number(String(toRaw ?? "").trim());
  if (!Number.isFinite(fromDepth) && Number.isFinite(toDepth)) fromDepth = toDepth;
  if (!Number.isFinite(toDepth) && Number.isFinite(fromDepth)) toDepth = fromDepth;
  if (!Number.isFinite(fromDepth) || !Number.isFinite(toDepth)) return null;
  if (toDepth < fromDepth) {
    const swap = fromDepth;
    fromDepth = toDepth;
    toDepth = swap;
  }
  if (toDepth - fromDepth < 1e-6) toDepth = fromDepth + 0.05;
  return {
    fromDepth: Number(fromDepth.toFixed(3)),
    toDepth: Number(toDepth.toFixed(3)),
  };
}

function normalizeWellTypeToken(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function findWellTypeOption(
  types: ReadonlyArray<WellTypeGraphicSource>,
  typeId: string | undefined,
  typeName: string | undefined
): WellTypeGraphicSource | undefined {
  const idKey = typeId?.trim().toLowerCase() ?? "";
  const nameKey = typeName?.trim().toLowerCase() ?? "";
  const compactName = normalizeWellTypeToken(typeName);
  const compactId = normalizeWellTypeToken(typeId);

  if (idKey) {
    const byId = types.find((entry) => entry.id?.trim().toLowerCase() === idKey);
    if (byId) return byId;
  }
  if (nameKey) {
    const byName = types.find((entry) => entry.name?.trim().toLowerCase() === nameKey);
    if (byName) return byName;
  }
  if (compactName || compactId) {
    return types.find((entry) => {
      const entryName = normalizeWellTypeToken(entry.name);
      const entryAlias = normalizeWellTypeToken(entry.tablogsAlias);
      const entryId = normalizeWellTypeToken(entry.id);
      return (
        (compactName && (entryName === compactName || entryAlias === compactName)) ||
        (compactId && (entryId === compactId || entryName === compactId || entryAlias === compactId))
      );
    });
  }
  return undefined;
}

function wellPipeStyleFromType(
  type: WellTypeGraphicSource | undefined,
  typeId: string | undefined,
  typeName: string | undefined
): { fill: "empty" | "pattern" | "hatch"; graphicUrl?: string } {
  const alias = normalizeWellTypeToken(type?.tablogsAlias);
  const name = normalizeWellTypeToken(typeName || type?.name || typeId);
  const graphic = normalizeWellTypeGraphicFilename(type?.graphic).toLowerCase();
  const blob = `${alias} ${name} ${graphic}`;

  // Slotted / screen / perforated → dense horizontal hatch (matches corrected Tablogs samples).
  if (
    blob.includes("slot") ||
    blob.includes("screen") ||
    blob.includes("perforat")
  ) {
    return { fill: "hatch" };
  }

  // Solid / blank / solidBlack graphic → hollow white pipe.
  if (
    blob.includes("solid") ||
    blob.includes("blank") ||
    graphic === "solidblack.png" ||
    graphic === "solid.png" ||
    !graphic
  ) {
    return { fill: "empty" };
  }

  // Any other configured well-type graphic.
  return {
    fill: "pattern",
    graphicUrl: getWellTypeGraphicUrl(graphic) || undefined,
  };
}

function resolveWellBackfillGraphicFilename(
  type: WellTypeGraphicSource | undefined,
  typeId: string | undefined,
  typeName: string | undefined
): string {
  const configured = normalizeWellBackfillGraphicFilename(type?.graphic);
  if (configured && configured.toLowerCase() !== "01.png") return configured;

  const defaults = DEFAULT_WELL_BACKFILL_TYPE_OPTIONS;
  const fallbackType =
    findWellTypeOption(defaults, typeId, typeName) ??
    findWellTypeOption(defaults, type?.id, type?.name ?? type?.tablogsAlias ?? undefined);
  const fallbackGraphic = normalizeWellBackfillGraphicFilename(fallbackType?.graphic);
  if (fallbackGraphic && fallbackGraphic.toLowerCase() !== "01.png") return fallbackGraphic;

  return configured || fallbackGraphic || DEFAULT_WELL_BACKFILL_GRAPHIC;
}

/** True when the backfill graphic is the solid-white Blank tile (or missing). */
export function isBlankWellBackfillGraphic(filenameOrUrl: string | null | undefined): boolean {
  const raw = String(filenameOrUrl ?? "").trim();
  if (!raw) return true;
  const filename = normalizeWellBackfillGraphicFilename(raw.includes("/") ? raw.split("/").pop() : raw);
  return !filename || filename.toLowerCase() === "01.png";
}

function resolveWellCasingGraphicFilename(
  type: WellTypeGraphicSource | undefined,
  typeId: string | undefined,
  typeName: string | undefined
): string {
  const configured = normalizeWellCasingGraphicFilename(type?.graphic);
  if (configured) return configured;

  const defaults = DEFAULT_WELL_CASING_TYPE_OPTIONS;
  const fallbackType =
    findWellTypeOption(defaults, typeId, typeName) ??
    findWellTypeOption(defaults, type?.id, type?.name ?? type?.tablogsAlias ?? undefined);
  return normalizeWellCasingGraphicFilename(fallbackType?.graphic) || DEFAULT_WELL_CASING_GRAPHIC;
}

/**
 * Builds Well Diagram intervals.
 * Prefer Well Logs (pipe by well type: Solid / Slotted). Fall back to backfill/casing
 * when no well-log rows exist.
 */
export function buildWellDiagramIntervals(input: {
  wellLogs?: ReadonlyArray<{
    depthFrom: string;
    depthTo: string;
    wellTypeId?: string;
    wellTypeName?: string;
    graphicUrl?: string | null;
  }>;
  wellTypes?: ReadonlyArray<WellTypeGraphicSource>;
  backfills?: ReadonlyArray<{
    depthFrom: string;
    depthTo: string;
    backfillTypeId?: string;
    backfillTypeName?: string;
    graphicUrl?: string | null;
  }>;
  casings?: ReadonlyArray<{
    depthFrom: string;
    depthTo: string;
    casingTypeId?: string;
    casingTypeName?: string;
    graphicUrl?: string | null;
  }>;
  backfillTypes?: ReadonlyArray<WellTypeGraphicSource>;
  casingTypes?: ReadonlyArray<WellTypeGraphicSource>;
}): PreviewWellInterval[] {
  const intervals: PreviewWellInterval[] = [];
  const wellTypes = [
    ...(input.wellTypes ?? []),
    ...DEFAULT_WELL_TYPE_OPTIONS,
  ];
  const backfillTypes = input.backfillTypes ?? [];
  const casingTypes = input.casingTypes ?? [];

  for (const entry of input.wellLogs ?? []) {
    const depths = parseWellDepthPair(entry.depthFrom, entry.depthTo);
    if (!depths) continue;
    const type = findWellTypeOption(wellTypes, entry.wellTypeId, entry.wellTypeName);
    const label =
      entry.wellTypeName?.trim() || type?.name?.trim() || entry.wellTypeId?.trim() || "Well";
    const style = wellPipeStyleFromType(type, entry.wellTypeId, entry.wellTypeName);
    intervals.push({
      ...depths,
      label,
      kind: "well",
      fill: style.fill,
      graphicUrl: style.graphicUrl,
    });
  }

  // When Well Logs drive the diagram, skip backfill/casing overlays so the pipe
  // matches the reference (Solid / Slotted stack only).
  if (intervals.some((entry) => entry.kind === "well")) {
    return intervals.sort((a, b) => a.fromDepth - b.fromDepth || a.toDepth - b.toDepth);
  }

  for (const entry of input.backfills ?? []) {
    const depths = parseWellDepthPair(entry.depthFrom, entry.depthTo);
    if (!depths) continue;
    const type = findWellTypeOption(
      backfillTypes,
      entry.backfillTypeId,
      entry.backfillTypeName
    );
    const label =
      entry.backfillTypeName?.trim() || type?.name?.trim() || entry.backfillTypeId?.trim() || "Backfill";
    const graphicUrl =
      entry.graphicUrl?.trim() ||
      getWellBackfillGraphicUrl(
        resolveWellBackfillGraphicFilename(type, entry.backfillTypeId, entry.backfillTypeName)
      ) ||
      undefined;
    const blank = isBlankWellBackfillGraphic(graphicUrl);
    intervals.push({
      ...depths,
      label,
      kind: "backfill",
      fill: blank ? "hatch" : graphicUrl ? "pattern" : "hatch",
      graphicUrl: blank ? undefined : graphicUrl,
    });
  }

  for (const entry of input.casings ?? []) {
    const depths = parseWellDepthPair(entry.depthFrom, entry.depthTo);
    if (!depths) continue;
    const type = findWellTypeOption(casingTypes, entry.casingTypeId, entry.casingTypeName);
    const label =
      entry.casingTypeName?.trim() || type?.name?.trim() || entry.casingTypeId?.trim() || "Casing";
    const graphicUrl =
      entry.graphicUrl?.trim() ||
      getWellCasingGraphicUrl(
        resolveWellCasingGraphicFilename(type, entry.casingTypeId, entry.casingTypeName)
      ) ||
      undefined;
    intervals.push({
      ...depths,
      label,
      kind: "casing",
      fill: graphicUrl ? "pattern" : "empty",
      graphicUrl,
    });
  }

  return intervals.sort(
    (a, b) =>
      a.fromDepth - b.fromDepth ||
      a.toDepth - b.toDepth ||
      a.kind.localeCompare(b.kind)
  );
}

export function clipWellIntervalsToEndDepth(
  intervals: readonly PreviewWellInterval[],
  endDepthM: number | null
): PreviewWellInterval[] {
  if (endDepthM == null) return intervals.map((entry) => ({ ...entry }));
  return intervals
    .filter((entry) => entry.fromDepth < endDepthM - 1e-9)
    .map((entry) => ({
      ...entry,
      toDepth: Math.min(entry.toDepth, endDepthM),
    }))
    .filter((entry) => entry.toDepth > entry.fromDepth + 1e-9);
}

/**
 * Flattens saved DCP-family insitu test readings (penetration-row interval values)
 * into a depth-sorted point series for the report's DCP Graph column.
 * Each interval blow/count is plotted at the interval end depth (depthTo), matching Tablogs.
 */
export function buildDcpPointsFromInsituTests(
  tests: readonly LogInsituTest[],
  testTypeIds: readonly string[] = DEFAULT_DCP_TEST_TYPE_IDS
): DcpPoint[] {
  const allow = new Set(testTypeIds.map((id) => normalizeTestTypeToken(id)).filter(Boolean));
  const points: DcpPoint[] = [];

  for (const test of tests) {
    if (!isDcpFamilyTest(test, allow)) continue;
    const rows = parseRowsFromResultValues(
      test.resultValues,
      test.depthFrom,
      test.depthTo,
      test.results
    );
    const intervalMm = Number(String(test.resultValues?.interval ?? "").trim());

    for (const row of rows) {
      const rawValue = String(row.value ?? "").trim();
      // Skip empty interval slots; keep explicit zeros.
      if (!rawValue) continue;
      const blows = Number(rawValue);
      if (!Number.isFinite(blows)) continue;

      const depthM = resolvePenetrationRowDepthMeters(row, intervalMm);
      if (!Number.isFinite(depthM) || depthM < 0) continue;
      points.push({
        depthM,
        blows,
        testTypeId: test.testTypeId || test.testTypeName || undefined,
      });
    }
  }

  return points.sort((a, b) => a.depthM - b.depthM || a.blows - b.blows);
}

/**
 * Convert a penetration-row depth to metres. Rows are normally stored in mm;
 * values that already look like metres (common when interval is large) are kept as-is.
 */
function resolvePenetrationRowDepthMeters(
  row: { depthFromMm?: string; depthToMm?: string },
  intervalMm: number
): number {
  const toRaw = Number(row.depthToMm);
  const fromRaw = Number(row.depthFromMm);
  const raw =
    Number.isFinite(toRaw) && (!Number.isFinite(fromRaw) || toRaw >= fromRaw)
      ? toRaw
      : fromRaw;
  if (!Number.isFinite(raw)) return NaN;

  // Explicit mm interval from the test (e.g. 100, 300, 3000) → depths are mm.
  if (Number.isFinite(intervalMm) && intervalMm >= 10) {
    return raw / 1000;
  }

  // Heuristic: |depth| >= 10 is almost certainly millimetres.
  if (Math.abs(raw) >= 10) return raw / 1000;
  return raw;
}

/**
 * @deprecated Demo strata were removed — empty logs must show an empty report body.
 * Prefer `buildStrataFromLayers` with saved subsurface data.
 */
export function buildPreviewStrata(_form: LogFormState): PreviewStratum[] {
  return [];
}

export function buildRefusalText(form: LogFormState): string {
  const bh = form.logNumber.trim() || "Log";
  const depth = form.endDepth.trim();
  const reason = form.finishingReason.trim();
  const comment = form.finishingComment.trim();

  if (!depth && !reason && !comment) return "";

  const depthPart = depth ? ` at ${depth} m` : "";
  const reasonPart = reason || "End of borehole";
  const detail = comment ? ` (${comment})` : "";
  return `${bh} ${reasonPart}${depthPart}${detail}`;
}

/** Scale column label mode: depth ticks, reduced level, or both. */
export type ScaleDisplayMode = "depth" | "elevation" | "elevation_depth";

function scaleColumnSourceValue(column: {
  text?: string;
  code?: string;
  column_data_source?: { group?: string; value?: string } | string;
}): { source: string; code: string; text: string } {
  const source =
    typeof column.column_data_source === "string"
      ? column.column_data_source
      : String(column.column_data_source?.value ?? "");
  return {
    source: source.toLowerCase(),
    code: String(column.code ?? "").toLowerCase(),
    text: String(column.text ?? "").toLowerCase(),
  };
}

export function getScaleDisplayMode(column: {
  text?: string;
  code?: string;
  column_data_source?: { group?: string; value?: string } | string;
}): ScaleDisplayMode {
  const { source, code, text } = scaleColumnSourceValue(column);
  const blob = `${source} ${code} ${text}`;
  if (
    code === "elevation/depth" ||
    source.includes("elevation_depth") ||
    source.includes("elevation/depth") ||
    /elevation\s*\/\s*depth/.test(blob)
  ) {
    return "elevation_depth";
  }
  if (
    source.includes("elevation") ||
    code === "elevation" ||
    (text.includes("elevation") && !text.includes("depth"))
  ) {
    return "elevation";
  }
  return "depth";
}

/** Parse the log form elevation field (e.g. "1", "1.0 m") to metres. */
export function parseGroundElevationMetres(raw: string | null | undefined): number | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const match = trimmed.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  if (!Number.isFinite(value)) return null;
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/**
 * Header / token display for ground elevation.
 * Form value `1` → `1.0 m` (matches Tablogs-style log headers).
 */
export function formatElevationHeaderValue(raw: string, unit = "m"): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Not Surveyed";
  const value = parseGroundElevationMetres(trimmed);
  if (value == null) return trimmed;
  const formatted = (Math.round(value * 10) / 10).toFixed(1);
  return `${formatted} ${unit}`;
}

/** Fill bare seeded labels that lack tokens (UTM / Loc Comment / Ground Elevation). */
export function polishResolvedHfText(text: string, context: Record<string, string>): string {
  let next = text;
  const utm = context["{{location.utm}}"] ?? "";
  const locComment = context["{{log.location_comment}}"] ?? "";
  const elevation = context["{{location.elevation}}"] ?? "";
  next = next.replace(/(^|\n)UTM\s*:\s*(?=\n|$)/g, `$1UTM : ${utm}`);
  next = next.replace(/(^|\n)Loc Comment\s*:\s*(?=\n|$)/g, `$1Loc Comment : ${locComment}`);
  next = next.replace(
    /(^|\n)Ground Elevation(?:\s*\([^)]+\))?\s*:\s*(?=\n|$)/gi,
    `$1Ground Elevation : ${elevation}`
  );
  return next;
}
