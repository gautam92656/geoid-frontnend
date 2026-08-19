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
  matchPreviewClassification,
  type ClassificationCode,
  type WorkflowPreviewValues,
  type WorkflowStep,
} from "./configModuleSettings";
import {
  buildSubsurfacePreviewDescription,
  resolvePreviewClassificationDisplay,
} from "./configModules/subsurfaceDescription";
import { mmToMeters, parseRowsFromResultValues } from "./insituTestForm";
import type { LogInsituTest } from "../types/logInsituTest";

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

/** Resolves a layer's classification-code graphic via the project's workflow config. */
export type StrataClassificationContext = {
  codes: readonly ClassificationCode[];
  steps: readonly WorkflowStep[];
  applyRules: boolean;
};

const SEEDED_HEADER_NAMES: Record<ReportPreviewTypeId, string[]> = {
  borelog: ["Borelog Header Template 1"],
  corelog: ["Corelog Header Template 1", "Borelog Header Template 1"],
};

const SEEDED_FOOTER_NAMES: Record<ReportPreviewTypeId, string[]> = {
  borelog: ["Borelog Footer Template 1"],
  corelog: ["Corelog Footer Template 1", "Borelog Footer Template 1"],
};

export function filterHfForReportType(
  templates: HeaderFooterTemplate[],
  previewType: ReportPreviewTypeId
): HeaderFooterTemplate[] {
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

export function pickDefaultHeader(
  templates: HeaderFooterTemplate[],
  previewType: ReportPreviewTypeId
): HeaderFooterTemplate | undefined {
  const typed = templates.filter((template) => template.reportType === previewType);
  const pool = typed.length > 0 ? typed : templates;
  return pickBySeededName(pool, SEEDED_HEADER_NAMES[previewType]) ?? pool[0];
}

export function pickDefaultFooter(
  templates: HeaderFooterTemplate[],
  previewType: ReportPreviewTypeId
): HeaderFooterTemplate | undefined {
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
  } = {}
): Record<string, string> {
  const elevation = form.elevation.trim() || "Not Surveyed";
  const endDepth = form.endDepth.trim();
  const totalDepth = endDepth ? `${endDepth} m BGL` : "";
  const phone =
    extras.companyPhone?.trim() ||
    formatPhone(extras.phoneCode, extras.phoneNumber);

  const context: Record<string, string> = {
    "{{page}}": "1",
    "{{pages}}": "1",
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

/**
 * Build report strata from saved subsurface layers.
 * Each layer's `depth` is treated as the bottom of the interval; fromDepth is
 * the previous layer's depth (or 0 for the first).
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
  }>,
  classificationContext?: StrataClassificationContext
): PreviewStratum[] {
  const sorted = [...layers].sort((a, b) => {
    const aDepth = Number(a.depth);
    const bDepth = Number(b.depth);
    const aValid = Number.isFinite(aDepth);
    const bValid = Number.isFinite(bDepth);
    if (aValid && bValid) return aDepth - bDepth;
    return a.depth.localeCompare(b.depth);
  });

  let previousDepth = 0;
  return sorted.map((layer) => {
    const toDepthRaw = Number(layer.depth);
    const toDepth = Number.isFinite(toDepthRaw) && toDepthRaw > 0 ? toDepthRaw : previousDepth;
    const fromDepth = Math.min(previousDepth, toDepth);
    previousDepth = Math.max(previousDepth, toDepth);

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
            undefined,
            resolvePreviewClassificationDisplay(
              classificationContext.steps,
              layer.values,
              undefined,
              matchedResult ?? {
                name: layer.classification.trim() || "",
                abbreviation: layer.classification.trim() || "",
                code: null,
              }
            )
          )
        : "");

    return {
      fromDepth: Number(fromDepth.toFixed(3)),
      toDepth: Number(toDepth.toFixed(3)),
      origin: layer.origin.trim(),
      classification: layer.classification.trim(),
      description: generatedDescription,
      consistency: layer.consistency?.trim() ?? "",
      moisture: layer.moisture?.trim() ?? "",
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
      graphicUrl: matched?.graphic ? getClassificationGraphicUrl(matched.graphic) : undefined,
      graphicColorOverlay: matched?.graphicColorOverlay ?? null,
      fillOverrideColor: matched?.fillOverrideColor ?? null,
    };
  });
}

export type DcpPoint = { depthM: number; blows: number };

const DEFAULT_DCP_TEST_TYPE_IDS = ["dcp", "psp", "dpsh"];

/**
 * Flattens saved DCP-family insitu test readings (penetration-row intervals)
 * into a depth-sorted point series for the report's DCP Graph column.
 */
export function buildDcpPointsFromInsituTests(
  tests: readonly LogInsituTest[],
  testTypeIds: readonly string[] = DEFAULT_DCP_TEST_TYPE_IDS
): DcpPoint[] {
  const allow = new Set(testTypeIds.map((id) => id.trim().toLowerCase()));
  const points: DcpPoint[] = [];

  for (const test of tests) {
    if (!allow.has(test.testTypeId.trim().toLowerCase())) continue;
    const rows = parseRowsFromResultValues(
      test.resultValues,
      test.depthFrom,
      test.depthTo,
      test.results
    );
    for (const row of rows) {
      const blows = Number(row.value);
      const fromM = Number(mmToMeters(row.depthFromMm));
      const toM = Number(mmToMeters(row.depthToMm));
      if (!Number.isFinite(blows) || !Number.isFinite(fromM)) continue;
      const depthM = Number.isFinite(toM) ? (fromM + toM) / 2 : fromM;
      points.push({ depthM, blows });
    }
  }

  return points.sort((a, b) => a.depthM - b.depthM);
}

/**
 * Demo strata for live preview until log modules feed the PDF body.
 * Prefer `buildStrataFromLayers` when subsurface data exists.
 */
export function buildPreviewStrata(form: LogFormState): PreviewStratum[] {
  const end = Number(form.endDepth);
  const total = Number.isFinite(end) && end > 0 ? end : 1.35;
  const d1 = Math.min(0.1, total * 0.08);
  const d2 = Math.min(0.3, total * 0.22);
  const d3 = total;

  const strata: PreviewStratum[] = [
    {
      fromDepth: 0,
      toDepth: Number(d1.toFixed(2)),
      origin: "Non-soil",
      classification: "",
      description: "Concrete Slab MULCH.",
      consistency: "",
      moisture: "",
      remarks: "",
      hatch: "concrete",
    },
  ];

  if (d2 > d1) {
    strata.push({
      fromDepth: Number(d1.toFixed(2)),
      toDepth: Number(d2.toFixed(2)),
      origin: "Fill",
      classification: "MLH",
      description:
        "Silty Sandy Clay (CI-CH): stiff, medium to high plasticity, fine to medium grained sand, pale grey, w > pl.",
      consistency: "St",
      moisture: "w > PL",
      remarks: "",
      hatch: "fill",
    });
  }

  if (d3 > d2) {
    strata.push({
      fromDepth: Number(d2.toFixed(2)),
      toDepth: Number(d3.toFixed(2)),
      origin: "Natural",
      classification: "CI-CH",
      description:
        "Silty Clay (CH): stiff, high plasticity, grey to pale grey brown yellow, w > pl.",
      consistency: "St",
      moisture: "w > PL",
      remarks: "",
      hatch: "clay",
    });
  }

  return strata;
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

/** Fill bare seeded labels that lack tokens (UTM / Loc Comment). */
export function polishResolvedHfText(text: string, context: Record<string, string>): string {
  let next = text;
  const utm = context["{{location.utm}}"] ?? "";
  const locComment = context["{{log.location_comment}}"] ?? "";
  next = next.replace(/(^|\n)UTM\s*:\s*(?=\n|$)/g, `$1UTM : ${utm}`);
  next = next.replace(/(^|\n)Loc Comment\s*:\s*(?=\n|$)/g, `$1Loc Comment : ${locComment}`);
  return next;
}
