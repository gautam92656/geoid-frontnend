"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { COMPANY_LOGO_PATH } from "../data/branding";
import { createDefaultHeaderFooterContent } from "./headerFooterBuilder/builderDefaults";
import {
  normalizeHeaderFooterContent,
  type HfGridCell,
  type HfGridSection,
} from "./headerFooterBuilder/contentSchema";
import { mmToPx } from "./headerFooterBuilder/builderGeometry";
import { resolveRendererTokens } from "./headerFooterBuilder/rendererRegistry";
import {
  applyLegendVisibility,
  resolveLegendTypes,
  sortLegendItems,
  type LegendPreviewItem,
} from "./headerFooterBuilder/legendDataResolver";
import { defaultLegendColumnDefs } from "./headerFooterBuilder/legendOptions";
import type { HeaderFooterTemplate } from "../types/headerFooterTemplate";
import type { LogFormState } from "../types/log";
import type {
  LogTemplateChartSeries,
  LogTemplateColumn,
  LogTemplateRecord,
} from "../types/logTemplate";
import type { Project } from "../types/project";
import type { ReportPreviewTypeId } from "../data/logReportOptions";
import {
  buildLogReportTokenContext,
  resolveStratumFieldForColumn,
  buildRefusalText,
  clipDcpPointsToEndDepth,
  clipDrillingIntervalsToEndDepth,
  clipPspBandsToEndDepth,
  clipStrataToEndDepth,
  clipWaterObservationsToEndDepth,
  clipWellIntervalsToEndDepth,
  buildUsedWaterLegendItems,
  filterDcpPointsForColumn,
  parseFinishEndDepthMetres,
  parseGroundElevationMetres,
  getScaleDisplayMode,
  polishResolvedHfText,
  reportPageHeightPx,
  reportPageWidthPx,
  resolveReportDeepestMetres,
  type DcpPoint,
  type LogReportSelection,
  type PreviewDrillingInterval,
  type PreviewPspBand,
  type PreviewStratum,
  type PreviewWaterObservation,
  type PreviewWellInterval,
} from "../utils/logReportPreviewUtils";
import { isColumnVisible } from "./logTemplateBuilder/contentSchema";
import {
  DEFAULT_WATER_OBSERVATION_TYPE_OPTIONS,
  getWaterObservationGraphicUrl,
} from "../utils/configModules/waterObservationType";

const PROFILE_LOGO_FALLBACK = COMPANY_LOGO_PATH;

function resolveHfImageSrc(
  cell: HfGridCell,
  tokenContext: Record<string, string>,
  companyLogoUrl?: string | null
): string {
  const raw = cell.imageSrc?.trim() || "{{company.logo}}";
  const isCompanyLogo = !raw || raw.includes("{{company.logo}}");
  if (isCompanyLogo) {
    return (
      companyLogoUrl?.trim() ||
      tokenContext["{{company.logo}}"]?.trim() ||
      PROFILE_LOGO_FALLBACK
    );
  }
  const resolved = resolveRendererTokens(raw, tokenContext).trim();
  return resolved || companyLogoUrl?.trim() || PROFILE_LOGO_FALLBACK;
}

type LogReportComposedSheetProps = Readonly<{
  project: Project;
  form: LogFormState;
  previewType: ReportPreviewTypeId;
  selection: LogReportSelection;
  logTemplate: LogTemplateRecord | null;
  headerTemplate: HeaderFooterTemplate | null;
  footerTemplate: HeaderFooterTemplate | null;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  phoneCode?: string | null;
  phoneNumber?: string | null;
  equipmentLabel?: string | null;
  supplierLabel?: string | null;
  /** Saved subsurface layers; when provided, drives the report body instead of demo strata. */
  subsurfaceLayers?: PreviewStratum[] | null;
  /** Saved DCP-family insitu test readings, plotted on the DCP Graph column. */
  dcpPoints?: DcpPoint[] | null;
  /** Saved drilling-method intervals, drawn in the Drilling Method column by depth. */
  drillingIntervals?: PreviewDrillingInterval[] | null;
  /** PSP interval bands for Tablogs-style "PSP: n" cells. */
  pspBands?: PreviewPspBand[] | null;
  /** Saved water observations for the Water column. */
  waterObservations?: PreviewWaterObservation[] | null;
  /** Well backfill/casing intervals for the Well Diagram column. */
  wellIntervals?: PreviewWellInterval[] | null;
  className?: string;
  style?: CSSProperties;
}>;

function visibleColumns(template: LogTemplateRecord | null): LogTemplateColumn[] {
  if (!template) return [];
  return template.config.columnData.filter((column) => isColumnVisible(column));
}

function columnWidthPct(columns: LogTemplateColumn[]): number[] {
  const widths = columns.map((column) => {
    const raw = Number(column.width);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  });
  const total = widths.reduce((sum, value) => sum + value, 0) || 1;
  return widths.map((value) => (value / total) * 100);
}

/** Stable dedupe key for a column; `id` isn't a declared field, just an optional passthrough. */
function columnKey(column: LogTemplateColumn): string {
  return typeof column.id === "string" && column.id ? column.id : `${column.code}-${column.text}`;
}

function columnSource(column: LogTemplateColumn): string {
  const dataSource = column.column_data_source;
  if (typeof dataSource === "string") return dataSource.toLowerCase();
  if (dataSource && typeof dataSource === "object") {
    return `${dataSource.group ?? ""} ${dataSource.value ?? ""}`.toLowerCase();
  }
  return "";
}

function columnKind(
  column: LogTemplateColumn
): "depth" | "graphic" | "well_diagram" | "chart" | "origin" | "classification" | "description" | "consistency" | "moisture" | "remarks" | "method" | "water" | "psp" | "text" {
  const source = columnSource(column);
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase();
  const type = column.column_type;

  if (type === "scale" || source.includes("depth") || label.includes("depth")) return "depth";
  if (type === "graphic" && (source.includes("well") || label.includes("well"))) {
    return "well_diagram";
  }
  if (isWaterColumn(column)) return "water";
  if (isPspColumn(column)) return "psp";
  // DCP Graph / explicit chart columns only (not standalone PSP text).
  if (isPenetrationChartColumn(column)) return "chart";
  if (type === "graphic" || label.includes("graphic")) return "graphic";
  if (source.includes("origin") || label.includes("origin")) return "origin";
  if (source.includes("classif") || label.includes("classif")) return "classification";
  if (source.includes("material") || source.includes("description") || label.includes("material")) {
    return "description";
  }
  if (source.includes("consist") || label.includes("consist")) return "consistency";
  if (source.includes("moisture") || label.includes("moisture")) return "moisture";
  if (source.includes("remark") || label.includes("remark")) return "remarks";
  if (
    label.includes("drilling method") ||
    source.includes("drill_method") ||
    source.includes("all_drilling_methods") ||
    source.includes("drill") ||
    label.includes("drilling")
  ) {
    return "method";
  }
  return "text";
}

function buildDcpAxisTicks(column: LogTemplateColumn): {
  ticks: number[];
  axisMin: number;
  axisMax: number;
  axisRange: number;
} {
  const series = column.chart_data?.[0];
  const axisMin = Number(series?.axis_bounds_min ?? column.axis_bounds_min ?? 0) || 0;
  const axisMaxRaw = Number(series?.axis_bounds_max ?? column.axis_bounds_max ?? 25);
  let axisMax = Number.isFinite(axisMaxRaw) && axisMaxRaw > axisMin ? axisMaxRaw : 25;
  // Penetration-test charts use a fixed 0–25 blows scale (matches Tablogs / reference PDFs).
  if (isPenetrationChartColumn(column)) {
    axisMax = 25;
  }
  const axisStepRaw = Number(series?.axis_units_minor ?? column.axis_units_minor ?? 5);
  const axisStep = Number.isFinite(axisStepRaw) && axisStepRaw > 0 ? axisStepRaw : 5;
  const axisRange = axisMax - axisMin || 1;

  const ticks: number[] = [];
  for (let value = axisMin; value <= axisMax + 1e-6; value += axisStep) {
    ticks.push(Math.round(value * 100) / 100);
  }

  return { ticks, axisMin, axisMax, axisRange };
}

function dcpScaleTickStyle(
  tick: number,
  axisMin: number,
  axisMax: number,
  axisRange: number
): CSSProperties {
  const left = ((tick - axisMin) / axisRange) * 100;
  if (tick <= axisMin + 1e-6) {
    return { left: "0%", transform: "translateX(0)" };
  }
  if (tick >= axisMax - 1e-6) {
    return { right: "0", left: "auto", transform: "none" };
  }
  return { left: `${left}%`, transform: "translateX(-50%)" };
}

function DcpHeaderScale({ column }: { column: LogTemplateColumn }) {
  const { ticks, axisMin, axisMax, axisRange } = buildDcpAxisTicks(column);

  return (
    <div className="log-report-composed__dcp-scale" aria-hidden="true">
      <div className="log-report-composed__dcp-scale-inner">
        {ticks.map((tick) => (
          <span
            key={tick}
            className="log-report-composed__dcp-scale-tick"
            style={dcpScaleTickStyle(tick, axisMin, axisMax, axisRange)}
          >
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Corelog third header row — matches Tablogs sample:
 * Estimated Strength / Defect Spacing / RQD scale bands under the column title.
 */
const ESTIMATED_STRENGTH_AXIS_LABELS = [
  "Very Low",
  "Low",
  "Medium",
  "High",
  "Very High",
  "Extremely High",
] as const;

const DEFECT_SPACING_AXIS_LABELS = ["30", "100", "300", "1000", "3000"] as const;

/** Include 0 on the left edge — same as the reference corelog PDF. */
const RQD_AXIS_LABELS = ["0", "20", "40", "60", "80", "100"] as const;

function columnSourceValue(column: LogTemplateColumn): string {
  const dataSource = column.column_data_source;
  if (typeof dataSource === "string") return dataSource.toLowerCase();
  if (dataSource && typeof dataSource === "object") {
    return String(dataSource.value ?? "").toLowerCase();
  }
  return "";
}

function columnChartSeries(column: LogTemplateColumn): LogTemplateChartSeries | null {
  const series = column.chart_data?.[0] ?? null;
  return series && typeof series === "object" ? series : null;
}

function isEstimatedStrengthColumn(column: LogTemplateColumn): boolean {
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase();
  const source = columnSourceValue(column);
  return (
    label.includes("estimated strength") ||
    label.includes("rock strength") ||
    (label.includes("strength") && label.includes("estimated")) ||
    source === "estimatedstrength" ||
    source.includes("estimated_strength") ||
    source === "estimated_strength"
  );
}

function isDefectSpacingColumn(column: LogTemplateColumn): boolean {
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase();
  const source = columnSourceValue(column);
  return (
    label.includes("defect spacing") ||
    (label.includes("defect") && label.includes("spacing")) ||
    source === "defectspacing" ||
    source.includes("defect_spacing") ||
    source === "defect_spacing"
  );
}

function isRqdScaleColumn(column: LogTemplateColumn): boolean {
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase().trim();
  const source = columnSourceValue(column);
  if (label.includes("tcr") || /\band\b/.test(label)) return false;
  return (
    label === "rqd" ||
    label.startsWith("rqd ") ||
    label.endsWith(" rqd") ||
    /^rqd\b/.test(label) ||
    source === "rqd" ||
    source === "rqd_defects" ||
    source.includes("rqd_defect")
  );
}

/** UCS sits under a horizontal "Testing" parent band on corelog sheets. */
function isTestingUcsColumn(column: LogTemplateColumn): boolean {
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase();
  const source = columnSourceValue(column);
  if (label.includes("testing") && !label.includes("ucs")) return false;
  return (
    label === "ucs" ||
    label.includes("ucs") ||
    source === "ucs" ||
    (typeof column.column_data_source === "string" &&
      column.column_data_source.toLowerCase() === "ucs")
  );
}

function corelogAxisLabels(column: LogTemplateColumn): readonly string[] | null {
  const series = columnChartSeries(column);
  if (series?.axis_label === false) return null;

  if (isEstimatedStrengthColumn(column)) return ESTIMATED_STRENGTH_AXIS_LABELS;
  if (isDefectSpacingColumn(column)) return DEFECT_SPACING_AXIS_LABELS;
  if (isRqdScaleColumn(column)) return RQD_AXIS_LABELS;
  return null;
}

function CorelogAxisHeaderScale({
  labels,
  variant,
}: {
  labels: readonly string[];
  variant: "strength" | "spacing" | "rqd";
}) {
  return (
    <div
      className={`log-report-composed__axis-scale log-report-composed__axis-scale--${variant}`}
      aria-hidden="true"
    >
      {labels.map((label) => (
        <span key={label} className="log-report-composed__axis-scale-cell" title={label}>
          <span className="log-report-composed__axis-scale-text">{label}</span>
        </span>
      ))}
    </div>
  );
}

function corelogAxisVariant(
  column: LogTemplateColumn
): "strength" | "spacing" | "rqd" | null {
  if (isEstimatedStrengthColumn(column)) return "strength";
  if (isDefectSpacingColumn(column)) return "spacing";
  if (isRqdScaleColumn(column)) return "rqd";
  return null;
}

function isDrillingMethodColumn(column: LogTemplateColumn): boolean {
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase();
  const source = columnSource(column);
  return (
    label.includes("drilling method") ||
    source.includes("drill_method") ||
    source.includes("all_drilling_methods")
  );
}

function isWaterColumn(column: LogTemplateColumn): boolean {
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase();
  const source = columnSource(column);
  return (
    label.includes("water") ||
    source.includes("all_waters") ||
    source.includes("watering") ||
    (column.column_type === "text_graphic" && source.includes("water"))
  );
}

/** Standalone PSP testing column (Tablogs text boxes), not the DCP Graph chart. */
function isPspColumn(column: LogTemplateColumn): boolean {
  if (column.column_type === "chart") return false;
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase().trim();
  const source = columnSourceValue(column);
  if (label === "psp" || label.startsWith("psp ") || label.includes(" psp")) return true;
  return source === "psp" || source.endsWith("/psp") || source.includes("psp");
}

function isPenetrationChartColumn(column: LogTemplateColumn): boolean {
  if (isPspColumn(column)) return false;
  if (column.column_type === "chart") return true;
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase();
  if (label.includes("dcp graph") || /\bdcp\b/.test(label)) return true;
  return false;
}

function isDcpGraphColumn(column: LogTemplateColumn): boolean {
  return isPenetrationChartColumn(column);
}

function isMethodDcpDividerPair(
  column: LogTemplateColumn,
  nextColumn: LogTemplateColumn | null
): boolean {
  if (!nextColumn) return false;
  return (
    isDrillingMethodColumn(column) &&
    (isPenetrationChartColumn(nextColumn) || isPspColumn(nextColumn))
  );
}

function isVerticalColumnTitle(column: LogTemplateColumn): boolean {
  const kind = columnKind(column);
  // Match Tablogs samples: wide text columns + chart stay horizontal.
  if (kind === "description" || kind === "remarks" || kind === "chart") return false;
  // Explicit template flags win over kind heuristics.
  if (column.vertical_text === true || column.name_vertical === true) return true;
  if (column.name_vertical === false) return false;
  // Narrow geotech columns default to vertical headers when the template leaves it unset.
  return (
    kind === "method" ||
    kind === "depth" ||
    kind === "origin" ||
    kind === "graphic" ||
    kind === "classification" ||
    kind === "consistency" ||
    kind === "moisture" ||
    kind === "water" ||
    kind === "psp"
  );
}

/** Vertical divider in the column-header / first content band. */
function hasContentBandDividerRight(
  column: LogTemplateColumn,
  nextColumn: LogTemplateColumn | null
): boolean {
  if (!nextColumn) return false;
  if (isMethodDcpDividerPair(column, nextColumn)) return true;
  if (columnKind(nextColumn) === "remarks") return true;
  return false;
}

function methodDcpDividerClasses(
  column: LogTemplateColumn,
  nextColumn: LogTemplateColumn | null,
  prevColumn: LogTemplateColumn | null
): string {
  const classes: string[] = [];
  if (isMethodDcpDividerPair(column, nextColumn)) {
    classes.push("has-method-dcp-divider");
  }
  if (prevColumn && isMethodDcpDividerPair(prevColumn, column)) {
    classes.push("has-after-drilling-method");
  }
  return classes.join(" ");
}

/** Continuous columns — no horizontal stratum cut lines through the cell. */
function suppressesStratumBorder(column: LogTemplateColumn): boolean {
  if (column.flexible_line_borders === true) return true;
  const kind = columnKind(column);
  return (
    kind === "method" ||
    kind === "chart" ||
    kind === "depth" ||
    kind === "water" ||
    kind === "psp" ||
    kind === "well_diagram" ||
    kind === "remarks"
  );
}

function contentBandBorderClass(
  column: LogTemplateColumn,
  nextColumn: LogTemplateColumn | null,
  prevColumn: LogTemplateColumn | null = null
): string {
  return [
    hasContentBandDividerRight(column, nextColumn) ? "has-content-band-divider" : "",
    methodDcpDividerClasses(column, nextColumn, prevColumn),
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Keep header/footer text on the same Arial stack as the report body.
 * Older seeds used monospace on the meta row for colon padding; that made
 * row 2 look like a different typeface than row 1.
 */
function resolveHfFontFamily(fontFamily: string | undefined): string {
  const raw = (fontFamily || "").trim();
  if (!raw || raw === "sans-serif" || /monospace|courier|consolas|menlo|monaco/i.test(raw)) {
    return "Arial, Helvetica, sans-serif";
  }
  return raw;
}

/** Borelog header row height share within the fixed section height (brand / meta). */
const BORELOG_HEADER_BRAND_ROW_FR = 40;
const BORELOG_HEADER_META_ROW_FR = 48;
/** Prior brand share — used so shrinking brand does not grow the meta row. */
const BORELOG_HEADER_BRAND_ROW_FR_BASELINE = 52;

/**
 * Footer cells sit inside `.log-report-composed__frame` and below the body
 * divider. Drawing every cell edge at full width stacks with the frame / body
 * border and with the neighbour cell, so outer rules look much thicker than
 * the content grid. Collapse to one shared stroke (right/bottom ownership).
 */
function collapsedFooterBorderWidths(
  cell: HfGridCell,
  section: HfGridSection
): { top: number; right: number; bottom: number; left: number } {
  const width = cell.borderWidth > 0 ? cell.borderWidth : 1;
  const isLastCol = cell.col + cell.colSpan >= section.cols;
  const isLastRow = cell.row + cell.rowSpan >= section.rows;

  return {
    // Top/left come from the body divider, frame, or the previous cell's
    // right/bottom — never redraw them here.
    top: 0,
    left: 0,
    right: cell.borderRight && !isLastCol ? width : 0,
    bottom: cell.borderBottom && !isLastRow ? width : 0,
  };
}

/** Title-only "Water" text cells are treated as water-observation legends. */
function isWaterLegendTextCell(cell: HfGridCell, resolvedText: string): boolean {
  if (cell.type !== "text") return false;
  return /^water$/i.test(resolvedText.trim());
}

function legendTypesForCell(cell: HfGridCell): string[] {
  if (cell.type === "legend") {
    if (Array.isArray(cell.legendTypes) && cell.legendTypes.length > 0) {
      return cell.legendTypes.filter(Boolean);
    }
    return cell.content ? [cell.content] : [];
  }
  return ["water_observations"];
}

function filterLegendItemsForReport(
  items: LegendPreviewItem[],
  cell: HfGridCell,
  usedWaterLabels: ReadonlySet<string>
): LegendPreviewItem[] {
  const visibility = cell.legendVisibility || "all";
  let next = applyLegendVisibility(
    items,
    visibility,
    cell.legendCustomLabels,
    cell.legendCustomItems
  );
  const types = legendTypesForCell(cell);
  const isWaterLegend = types.includes("water_observations");
  // Water footer: always prefer types actually recorded on the log.
  if (isWaterLegend && usedWaterLabels.size > 0 && visibility !== "custom") {
    next = next.filter((item) => {
      const base = item.label.trim().toLowerCase();
      for (const used of usedWaterLabels) {
        if (used === base || used.startsWith(`${base} -`) || used.startsWith(`${base}-`)) {
          return true;
        }
      }
      return false;
    });
  } else if (visibility === "used-only" && isWaterLegend) {
    next = usedWaterLabels.size > 0 ? next : [];
  }
  return sortLegendItems(next, cell.legendSort);
}

function HfReportLegendBlock({
  cell,
  title,
  waterObservations,
}: {
  cell: HfGridCell;
  title?: string;
  waterObservations?: PreviewWaterObservation[] | null;
}) {
  const types = useMemo(() => legendTypesForCell(cell), [cell]);
  const typesKey = types.join("|");
  const isWaterLegend = types.includes("water_observations");

  const usedFromLog = useMemo(
    () =>
      buildUsedWaterLegendItems(waterObservations ?? []).map((entry) => ({
        label: entry.label,
        imageUrl: entry.graphicUrl,
        legendType: "water_observations" as const,
      })),
    [waterObservations]
  );

  const usedWaterLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const entry of waterObservations ?? []) {
      const typeName = (entry.typeName || entry.label).trim().toLowerCase();
      if (typeName) labels.add(typeName);
      const raw = entry.label.trim().toLowerCase();
      if (raw) labels.add(raw);
    }
    return labels;
  }, [waterObservations]);

  const [catalogItems, setCatalogItems] = useState<LegendPreviewItem[]>(() => {
    if (!isWaterLegend) return [];
    return DEFAULT_WATER_OBSERVATION_TYPE_OPTIONS.map((entry) => ({
      label: entry.name,
      imageUrl: getWaterObservationGraphicUrl(entry.graphic),
      legendType: "water_observations",
    }));
  });

  useEffect(() => {
    if (!typesKey || isWaterLegend) return;
    let cancelled = false;
    void resolveLegendTypes(typesKey.split("|")).then((resolved) => {
      if (!cancelled && resolved.length > 0) setCatalogItems(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [typesKey, isWaterLegend]);

  useEffect(() => {
    if (!isWaterLegend) return;
    let cancelled = false;
    void resolveLegendTypes(["water_observations"]).then((resolved) => {
      if (!cancelled && resolved.length > 0) setCatalogItems(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [isWaterLegend]);

  const visible = useMemo(() => {
    // Prefer exact used observations from the log (symbol + type name).
    if (isWaterLegend && usedFromLog.length > 0) {
      const maxRows =
        cell.legendMaxRows && cell.legendMaxRows > 0
          ? cell.legendMaxRows
          : usedFromLog.length;
      return usedFromLog.slice(0, Math.max(0, maxRows));
    }
    const filtered = filterLegendItemsForReport(catalogItems, cell, usedWaterLabels);
    const maxRows =
      cell.legendMaxRows && cell.legendMaxRows > 0 ? cell.legendMaxRows : filtered.length;
    return filtered.slice(0, Math.max(0, maxRows));
  }, [isWaterLegend, usedFromLog, catalogItems, cell, usedWaterLabels]);

  const columnDefs =
    cell.legendColumnDefs?.length > 0 ? cell.legendColumnDefs : defaultLegendColumnDefs();
  const showGraphic = columnDefs.some((def) => def.content === "graphic");
  const showLabel = columnDefs.some((def) => def.content === "label");
  const heading =
    title?.trim() ||
    (types[0] === "water_observations" ? "Water" : types[0]?.replace(/_/g, " ") || "Legend");

  return (
    <div className="log-report-composed__hf-legend-block">
      <div className="log-report-composed__hf-legend-block-title">{heading}</div>
      {visible.length === 0 ? null : (
        <div className="log-report-composed__hf-legend-block-rows">
          {visible.map((item) => (
            <div
              key={`${item.legendType ?? "legend"}:${item.label}`}
              className="log-report-composed__hf-legend-block-row"
            >
              {showGraphic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  className="log-report-composed__hf-legend-block-img"
                  crossOrigin="anonymous"
                />
              ) : null}
              {showLabel ? (
                <span className="log-report-composed__hf-legend-block-label">{item.label}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HfSectionGrid({
  section,
  tokenContext,
  companyLogoUrl,
  variant,
  waterObservations,
}: {
  section: HfGridSection;
  tokenContext: Record<string, string>;
  companyLogoUrl?: string | null;
  variant: "header" | "footer";
  waterObservations?: PreviewWaterObservation[] | null;
}) {
  if (!section.enabled || section.rows < 1 || section.cols < 1) return null;

  const colTemplate = section.columnWidths
    .map((weight) => `${Math.max(weight, 0.01) * 100}fr`)
    .join(" ");
  const configuredHeightPx = Math.max(28, mmToPx(section.heightMm || 20));
  // Shrink brand row only: scale total height so the meta row keeps its absolute size.
  const heightPx =
    variant === "header" && section.rows === 2
      ? configuredHeightPx *
        ((BORELOG_HEADER_BRAND_ROW_FR + BORELOG_HEADER_META_ROW_FR) /
          (BORELOG_HEADER_BRAND_ROW_FR_BASELINE + BORELOG_HEADER_META_ROW_FR))
      : configuredHeightPx;
  // Header: fixed row ratio so meta row gets more height than max-content alone.
  const rowTemplate =
    variant === "header" && section.rows === 2
      ? `minmax(0, ${BORELOG_HEADER_BRAND_ROW_FR}fr) minmax(0, ${BORELOG_HEADER_META_ROW_FR}fr)`
      : `repeat(${section.rows}, minmax(0, 1fr))`;

  return (
    <div
      className={`log-report-composed__hf-grid log-report-composed__hf-grid--${variant}`}
      style={{
        gridTemplateColumns: colTemplate,
        gridTemplateRows: rowTemplate,
        minHeight: heightPx,
        height: heightPx,
      }}
    >
      {section.cells.map((cell) => {
        // Skip covered placeholder cells under rowSpan (empty + no borders)
        const isCoveredPlaceholder =
          cell.type === "empty" &&
          !cell.borderTop &&
          !cell.borderRight &&
          !cell.borderBottom &&
          !cell.borderLeft &&
          !cell.content;

        if (isCoveredPlaceholder) return null;

        const resolvedText =
          cell.type === "text"
            ? polishResolvedHfText(
                resolveRendererTokens(cell.content, tokenContext),
                tokenContext
              )
            : "";
        const imageSrc =
          cell.type === "image"
            ? resolveHfImageSrc(cell, tokenContext, companyLogoUrl)
            : "";

        const footerBorders =
          variant === "footer" ? collapsedFooterBorderWidths(cell, section) : null;
        const renderAsLegend =
          cell.type === "legend" || isWaterLegendTextCell(cell, resolvedText);

        return (
          <div
            key={`${variant}-${cell.row}-${cell.col}`}
            className={`log-report-composed__hf-cell${cell.type === "image" ? " is-image" : ""}`}
            style={{
              gridRow: `${cell.row + 1} / span ${cell.rowSpan}`,
              gridColumn: `${cell.col + 1} / span ${cell.colSpan}`,
              background:
                cell.backgroundColor && cell.backgroundColor !== "transparent"
                  ? cell.backgroundColor
                  : "#fff",
              color: cell.fontColor || "#000",
              fontFamily: resolveHfFontFamily(cell.fontFamily),
              fontSize: cell.fontSize || "8pt",
              fontWeight: cell.fontBold ? 700 : 400,
              fontStyle: cell.fontItalic ? "italic" : "normal",
              textDecoration: cell.fontUnderline ? "underline" : "none",
              textAlign: cell.textAlign || "left",
              justifyContent:
                cell.type === "image"
                  ? "center"
                  : cell.verticalAlign === "middle"
                    ? "center"
                    : cell.verticalAlign === "bottom"
                      ? "flex-end"
                      : "flex-start",
              alignItems:
                cell.type === "image"
                  ? "stretch"
                  : cell.textAlign === "center"
                    ? "center"
                    : cell.textAlign === "right"
                      ? "flex-end"
                      : "stretch",
              padding:
                cell.type === "image"
                  ? variant === "header"
                    ? 2
                    : (cell.padding ?? 6)
                  : (cell.padding ?? 4),
              borderStyle: cell.borderStyle || "solid",
              borderColor: cell.borderColor || "#000",
              borderWidth: 0,
              borderTopWidth: footerBorders?.top ?? 0,
              borderRightWidth: footerBorders?.right ?? 0,
              borderBottomWidth: footerBorders?.bottom ?? 0,
              borderLeftWidth: footerBorders?.left ?? 0,
            }}
          >
            {cell.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt=""
                className="log-report-composed__hf-image"
                style={{
                  objectFit: cell.imageFit === "cover" ? "cover" : "contain",
                }}
              />
            ) : null}
            {renderAsLegend ? (
              <HfReportLegendBlock
                cell={
                  cell.type === "legend"
                    ? cell
                    : {
                        ...cell,
                        type: "legend",
                        content: "water_observations",
                        legendTypes: ["water_observations"],
                        legendVisibility: "used-only",
                      }
                }
                title={cell.type === "text" ? resolvedText : undefined}
                waterObservations={waterObservations}
              />
            ) : null}
            {cell.type === "text" && !renderAsLegend ? (
              looksLikeHfMetaBlock(resolvedText) ? (
                <HfMetaBlock text={resolvedText} />
              ) : looksLikeHfLegendColumn(resolvedText) ? (
                <HfLegendColumnBlock text={resolvedText} />
              ) : (
                <span className="log-report-composed__hf-text">{resolvedText}</span>
              )
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Depth-aligned drilling method graphics (e.g. Washbore) for the report
 * Drilling Method column. Intervals are clipped to the current page window.
 */
function DrillingMethodColumn({
  intervals,
  pageStartMetres,
  pageWindowMetres,
}: {
  intervals: PreviewDrillingInterval[];
  pageStartMetres: number;
  pageWindowMetres: number;
}) {
  const pageEndMetres = pageStartMetres + pageWindowMetres;

  const visible = intervals
    .filter(
      (interval) =>
        pageWindowMetres > 0 &&
        interval.toDepth > pageStartMetres &&
        interval.fromDepth < pageEndMetres
    )
    .map((interval) => ({
      ...interval,
      fromDepth: Math.max(interval.fromDepth, pageStartMetres),
      toDepth: Math.min(interval.toDepth, pageEndMetres),
    }))
    .filter((interval) => interval.toDepth > interval.fromDepth);

  if (visible.length === 0) return null;

  return (
    <div className="log-report-composed__drill-methods">
      {visible.map((interval) => {
        const topPct = ((interval.fromDepth - pageStartMetres) / pageWindowMetres) * 100;
        const heightPct = ((interval.toDepth - interval.fromDepth) / pageWindowMetres) * 100;
        return (
          <div
            key={`${interval.label}-${interval.fromDepth}-${interval.toDepth}`}
            className="log-report-composed__drill-interval"
            style={{ top: `${topPct}%`, height: `${Math.max(heightPct, 0.8)}%` }}
            title={`${interval.label} (${interval.fromDepth}–${interval.toDepth} m)`}
          >
            <div className="log-report-composed__drill-interval-graphic-wrap">
              {interval.graphicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={interval.graphicUrl}
                  alt=""
                  className="log-report-composed__drill-interval-graphic"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="log-report-composed__drill-interval-fallback" aria-hidden="true" />
              )}
              <span className="log-report-composed__drill-interval-label">
                <span className="log-report-composed__drill-interval-arrow" aria-hidden="true">
                  ↑
                </span>
                <span className="log-report-composed__drill-interval-name">{interval.label}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PspColumn({
  bands,
  pageStartMetres,
  pageWindowMetres,
}: {
  bands: PreviewPspBand[];
  pageStartMetres: number;
  pageWindowMetres: number;
}) {
  const pageEndMetres = pageStartMetres + pageWindowMetres;
  const visible = bands
    .filter(
      (band) =>
        pageWindowMetres > 0 &&
        band.toDepth > pageStartMetres &&
        band.fromDepth < pageEndMetres
    )
    .map((band) => ({
      ...band,
      fromDepth: Math.max(band.fromDepth, pageStartMetres),
      toDepth: Math.min(band.toDepth, pageEndMetres),
    }))
    .filter((band) => band.toDepth > band.fromDepth);

  return (
    <div className="log-report-composed__psp-col" aria-label="PSP readings">
      {visible.map((band) => {
        const topPct = ((band.fromDepth - pageStartMetres) / pageWindowMetres) * 100;
        const heightPct = ((band.toDepth - band.fromDepth) / pageWindowMetres) * 100;
        return (
          <div
            key={`${band.fromDepth}-${band.toDepth}-${band.label}`}
            className="log-report-composed__psp-band"
            style={{ top: `${topPct}%`, height: `${Math.max(heightPct, 4)}%` }}
          >
            <span className="log-report-composed__psp-band-text">{band.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function WaterColumn({
  observations,
  pageStartMetres,
  pageWindowMetres,
}: {
  observations: PreviewWaterObservation[];
  pageStartMetres: number;
  pageWindowMetres: number;
}) {
  const pageEndMetres = pageStartMetres + pageWindowMetres;

  // Group same-depth observations so we can stagger them instead of stacking on top of each other.
  const groups = useMemo(() => {
    const visible = observations.filter(
      (entry) =>
        pageWindowMetres > 0 && entry.depthM >= pageStartMetres && entry.depthM <= pageEndMetres
    );
    const byDepth = new Map<string, PreviewWaterObservation[]>();
    for (const entry of visible) {
      const key = entry.depthM.toFixed(3);
      const list = byDepth.get(key);
      if (list) list.push(entry);
      else byDepth.set(key, [entry]);
    }
    return Array.from(byDepth.entries()).map(([depthKey, entries]) => ({
      depthM: Number(depthKey),
      entries,
    }));
  }, [observations, pageStartMetres, pageEndMetres, pageWindowMetres]);

  return (
    <div className="log-report-composed__water-col" aria-label="Water observations">
      {groups.map((group) => {
        const topPct = ((group.depthM - pageStartMetres) / pageWindowMetres) * 100;
        const isMulti = group.entries.length > 1;

        return (
          <div
            key={`water-depth-${group.depthM.toFixed(3)}`}
            className={`log-report-composed__water-mark-group${isMulti ? " is-multi" : ""}`}
            style={{ top: `${topPct}%` }}
          >
            {group.entries.map((entry, slotIndex) => {
              const graphicUrl =
                entry.graphicUrl?.trim() ||
                getWaterObservationGraphicUrl("water_symbol_1.svg");
              return (
                <div
                  key={`${entry.depthM}-${entry.typeName}-${entry.label}-${slotIndex}`}
                  className="log-report-composed__water-mark"
                  title={`${entry.label} @ ${entry.depthM.toFixed(2)} m`}
                >
                  {graphicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={graphicUrl}
                      alt=""
                      className="log-report-composed__water-symbol-img"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <span className="log-report-composed__water-symbol" aria-hidden="true">
                      ▼
                    </span>
                  )}
                  <span className="log-report-composed__water-label">{entry.label}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function WellDiagramColumn({
  intervals,
  column,
  pageStartMetres,
  pageWindowMetres,
}: {
  intervals: PreviewWellInterval[];
  column: LogTemplateColumn;
  pageStartMetres: number;
  pageWindowMetres: number;
}) {
  const pageEndMetres = pageStartMetres + pageWindowMetres;
  const showWell = column.show_well !== false;
  const configuredWidth = Number(column.well_width ?? column.pattern_width ?? 45);
  const bodyWidthPct = showWell
    ? Math.min(55, Math.max(32, Number.isFinite(configuredWidth) && configuredWidth > 0 ? configuredWidth : 45))
    : 0;

  const visible = intervals
    .filter(
      (entry) =>
        pageWindowMetres > 0 &&
        entry.toDepth > pageStartMetres &&
        entry.fromDepth < pageEndMetres
    )
    .map((entry) => ({
      ...entry,
      fromDepth: Math.max(entry.fromDepth, pageStartMetres),
      toDepth: Math.min(entry.toDepth, pageEndMetres),
    }))
    .filter((entry) => entry.toDepth > entry.fromDepth)
    .sort((a, b) => a.fromDepth - b.fromDepth || a.toDepth - b.toDepth);

  if (visible.length === 0 || bodyWidthPct <= 0) return null;

  const wells = visible.filter((entry) => entry.kind === "well");
  const backfills = visible.filter((entry) => entry.kind === "backfill");
  const casings = visible.filter((entry) => entry.kind === "casing");
  const showCasing =
    column.show_regular_casing !== false || column.show_surface_casing !== false;
  // Well Logs (pipe) take priority; otherwise backfill bands.
  const pipeSegments = wells.length > 0 ? wells : backfills;

  return (
    <div className="log-report-composed__well-diagram" aria-label="Well diagram">
      {pipeSegments.map((entry, index) => {
        const topPct = ((entry.fromDepth - pageStartMetres) / pageWindowMetres) * 100;
        const heightPct = ((entry.toDepth - entry.fromDepth) / pageWindowMetres) * 100;
        const prev = pipeSegments[index - 1];
        const abutsPrev =
          Boolean(prev) && Math.abs((prev?.toDepth ?? 0) - entry.fromDepth) < 1e-6;
        return (
          <div
            key={`${entry.kind}-${entry.fromDepth}-${entry.toDepth}-${entry.label}-${index}`}
            className={`log-report-composed__well-interval is-${entry.kind}${
              abutsPrev ? " is-abutting" : ""
            }`}
            style={{ top: `${topPct}%`, height: `${Math.max(heightPct, 0.8)}%` }}
            title={`${entry.label} ${entry.fromDepth.toFixed(2)}–${entry.toDepth.toFixed(2)} m`}
          >
            <div
              className={`log-report-composed__well-body${abutsPrev ? " is-abutting" : ""}`}
              style={{ width: `${bodyWidthPct}%` }}
            >
              <WellIntervalGraphic
                graphicUrl={entry.graphicUrl}
                fill={entry.fill}
                kind={entry.kind}
                label={entry.label}
              />
            </div>
          </div>
        );
      })}

      {wells.length === 0 && showCasing
        ? casings.map((entry, index) => {
            const topPct = ((entry.fromDepth - pageStartMetres) / pageWindowMetres) * 100;
            const heightPct = ((entry.toDepth - entry.fromDepth) / pageWindowMetres) * 100;
            const casingWidth = Math.max(10, Math.round(bodyWidthPct * 0.32));
            return (
              <div
                key={`casing-${entry.fromDepth}-${entry.toDepth}-${entry.label}-${index}`}
                className="log-report-composed__well-interval is-casing"
                style={{ top: `${topPct}%`, height: `${Math.max(heightPct, 0.8)}%` }}
                title={`${entry.label} ${entry.fromDepth.toFixed(2)}–${entry.toDepth.toFixed(2)} m`}
              >
                <div
                  className="log-report-composed__well-body is-casing"
                  style={{ width: `${casingWidth}%` }}
                >
                  <WellIntervalGraphic
                    graphicUrl={entry.graphicUrl}
                    fill={entry.fill}
                    kind="casing"
                    label={entry.label}
                  />
                </div>
              </div>
            );
          })
        : null}
    </div>
  );
}

function WellIntervalGraphic({
  graphicUrl,
  fill,
  kind,
  label,
}: {
  graphicUrl?: string;
  fill: PreviewWellInterval["fill"];
  kind: PreviewWellInterval["kind"];
  label: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = graphicUrl?.trim() || "";

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (kind === "casing") {
    if (src && !failed) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          className="log-report-composed__well-fill-img is-casing"
          crossOrigin="anonymous"
          onError={() => setFailed(true)}
        />
      );
    }
    return <div className="log-report-composed__well-casing-fill" aria-hidden="true" />;
  }

  if (fill === "hatch") {
    return <div className="log-report-composed__well-hatch" aria-hidden="true" />;
  }

  if (fill === "empty" || failed || (fill === "pattern" && !src)) {
    return <div className="log-report-composed__well-empty" aria-hidden="true" />;
  }

  const safeUrl = src.replace(/\\/g, "/").replace(/"/g, "%22");
  return (
    <>
      <div
        className="log-report-composed__well-fill"
        style={{ backgroundImage: `url("${safeUrl}")` }}
        role="img"
        aria-label={label}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="log-report-composed__well-fill-probe"
        crossOrigin="anonymous"
        onError={() => setFailed(true)}
      />
    </>
  );
}

function resolveDcpSeriesStyle(column: LogTemplateColumn): {
  lineColor: string;
  symbolColor: string;
  showLine: boolean;
  showSymbol: boolean;
} {
  const series = column.chart_data?.[0];
  const multi = Array.isArray(series?.selectedMultiChartOptions)
    ? (series.selectedMultiChartOptions[0] as Record<string, unknown> | undefined)
    : undefined;

  const lineColor = String(
    multi?.line_color ?? series?.line_color ?? "#83BEEC"
  );
  // Tablogs sample uses black filled circles on the DCP graph.
  const symbolColor = String(
    multi?.symbol_color ?? series?.symbol_color ?? "#000000"
  );
  const showLine = multi?.line_visibility !== false && series?.line_visibility !== false;
  const showSymbol =
    multi?.symbol_visibility !== false && series?.symbol_visibility !== false;

  return { lineColor, symbolColor, showLine, showSymbol };
}

function DcpChart({
  column,
  points,
  pageStartMetres,
  pageWindowMetres,
}: {
  column: LogTemplateColumn;
  points: DcpPoint[];
  pageStartMetres: number;
  pageWindowMetres: number;
}) {
  const { ticks, axisMin, axisMax, axisRange } = buildDcpAxisTicks(column);
  const { lineColor, symbolColor, showLine, showSymbol } = resolveDcpSeriesStyle(column);
  const pageEndMetres = pageStartMetres + pageWindowMetres;

  const visiblePoints = points.filter(
    (point) =>
      pageWindowMetres > 0 && point.depthM >= pageStartMetres && point.depthM <= pageEndMetres
  );

  const normPoints = visiblePoints.map((point) => {
    // Cap refusal / over-range blows at the chart axis max (Tablogs behaviour).
    const cappedBlows = Math.min(Math.max(point.blows, axisMin), axisMax);
    const x = Math.min(100, Math.max(0, ((cappedBlows - axisMin) / axisRange) * 100));
    const y = Math.min(100, Math.max(0, ((point.depthM - pageStartMetres) / pageWindowMetres) * 100));
    return { x, y, raw: point };
  });

  const polyPoints = normPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Light horizontal guides at each major depth metre (matches Tablogs sample).
  const depthGuides: number[] = [];
  const guideStep = 0.5;
  const firstGuide = Math.ceil((pageStartMetres + 1e-9) / guideStep) * guideStep;
  for (let depth = firstGuide; depth < pageEndMetres - 1e-9; depth += guideStep) {
    depthGuides.push(Math.round(depth * 1000) / 1000);
  }

  return (
    <div className="log-report-composed__dcp">
      <div className="log-report-composed__dcp-plot">
        {/* Dots/line/grid; depth track marks live on Depth(m) left border. */}
        <div className="log-report-composed__dcp-plot-inner">
          {depthGuides.map((depth) => (
            <span
              key={`depth-guide-${depth}`}
              className="log-report-composed__dcp-depth-guide"
              style={{ top: `${((depth - pageStartMetres) / pageWindowMetres) * 100}%` }}
            />
          ))}

          {ticks.map((tick) => {
            const isMax = tick >= axisMax - 1e-6;
            const isMin = tick <= axisMin + 1e-6;
            // Column borders are the 0 and 25 scale lines (matches reference PDF).
            if (isMin) return null;
            if (isMax) {
              return (
                <span
                  key={`gridline-${tick}`}
                  className="log-report-composed__dcp-gridline is-column-border"
                  aria-hidden="true"
                />
              );
            }
            const left = ((tick - axisMin) / axisRange) * 100;
            return (
              <span
                key={`gridline-${tick}`}
                className="log-report-composed__dcp-gridline"
                style={{ left: `${left}%` }}
              />
            );
          })}

          <svg
            className="log-report-composed__dcp-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label="DCP graph"
          >
            {showLine && normPoints.length > 1 ? (
              <polyline
                points={polyPoints}
                fill="none"
                stroke={lineColor}
                strokeWidth={0.25}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>

          {showSymbol
            ? normPoints.map((p, i) => (
                <span
                  key={`pt-${i}`}
                  className="log-report-composed__dcp-dot"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    background: symbolColor,
                  }}
                  title={`${p.raw.blows} blows @ ${p.raw.depthM} m`}
                />
              ))
            : null}
        </div>

      </div>
    </div>
  );
}

function GraphicHatch({ stratum }: { stratum: PreviewStratum }) {
  if (stratum.graphicUrl) {
    return (
      <div
        className="log-report-composed__hatch log-report-composed__hatch--image"
        style={{ backgroundColor: stratum.fillOverrideColor || undefined }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={stratum.graphicUrl}
          alt=""
          className="log-report-composed__hatch-img"
          crossOrigin="anonymous"
        />
        {stratum.graphicColorOverlay ? (
          <div
            className="log-report-composed__hatch-overlay"
            style={{ background: stratum.graphicColorOverlay }}
          />
        ) : null}
      </div>
    );
  }
  return (
    <div className={`log-report-composed__hatch log-report-composed__hatch--${stratum.hatch}`} />
  );
}

/** Header meta rows use "Label : value" lines — render as a stable colon grid. */
function looksLikeHfMetaBlock(text: string): boolean {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 3) return false;
  const metaLines = lines.filter((line) => /^\S.+\s+:\s*/.test(line) || /^.+\s+:\s*.*$/.test(line));
  return metaLines.length >= 3 && metaLines.length === lines.length;
}

function HfMetaBlock({ text }: { text: string }) {
  const rows = text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = line.match(/^(.+?)\s+:\s*(.*)$/);
      if (!match) return { label: line, value: "" };
      return { label: match[1].trimEnd(), value: match[2] ?? "" };
    });

  return (
    <div className="log-report-composed__hf-meta">
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className="log-report-composed__hf-meta-row">
          <span className="log-report-composed__hf-meta-label">{row.label}</span>
          <span className="log-report-composed__hf-meta-sep" aria-hidden="true">
            :
          </span>
          <span className="log-report-composed__hf-meta-value">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Footer legend columns: bold section titles + aligned "code : description" rows. */
function looksLikeHfLegendColumn(text: string): boolean {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return false;
  const entryLines = lines.filter((line) => /^.+?\s+:\s*/.test(line));
  return entryLines.length >= 2;
}

function HfLegendColumnBlock({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  type ParsedLine =
    | { type: "title"; text: string; isSection: boolean }
    | { type: "entry"; label: string; value: string };

  let titleCount = 0;
  const parsed: ParsedLine[] = lines.map((line) => {
    const match = line.match(/^(.+?)\s+:\s*(.*)$/);
    if (!match) {
      const isSection = titleCount > 0;
      titleCount += 1;
      return { type: "title", text: line, isSection };
    }
    return { type: "entry", label: match[1].trimEnd(), value: match[2] ?? "" };
  });

  const maxLabelLen = Math.max(
    1,
    ...parsed
      .filter((item): item is Extract<ParsedLine, { type: "entry" }> => item.type === "entry")
      .map((item) => item.label.length)
  );

  return (
    <div
      className="log-report-composed__hf-legend-col"
      style={{ ["--hf-legend-label-width" as string]: `${maxLabelLen}ch` }}
    >
      {parsed.map((item, index) => {
        if (item.type === "title") {
          return (
            <div
              key={`title-${index}`}
              className={`log-report-composed__hf-legend-col-title${
                item.isSection ? " is-section" : " is-column"
              }`}
            >
              {item.text}
            </div>
          );
        }
        return (
          <div key={`entry-${index}`} className="log-report-composed__hf-legend-col-entry-row">
            <span className="log-report-composed__hf-legend-col-label">{item.label}</span>
            <span className="log-report-composed__hf-legend-col-sep" aria-hidden="true">
              :
            </span>
            <span className="log-report-composed__hf-legend-col-value">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

const METRES_TO_FEET = 3.28084;

function isFeetDepthColumn(column: LogTemplateColumn): boolean {
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase();
  return label.includes("(ft)") || label.includes("_ft") || label.includes(" ft");
}

function scaleDecimalPlaces(column: LogTemplateColumn): number {
  const raw = String(
    column.scale_decimal_places ?? column.number_display ?? column.decimals ?? ""
  ).toLowerCase();
  if (raw === "no" || raw === "0" || raw === "none") return 0;
  if (raw === "two" || raw === "2") return 2;
  return 1;
}

/** Avoid IEEE leftovers like 0.19999999999999998 when subtracting metres. */
function roundToMillis(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
}

function formatScaleNumber(value: number, column: LogTemplateColumn): string {
  return roundToMillis(value).toFixed(scaleDecimalPlaces(column));
}

function elevationAtDisplayedDepth(groundDisplay: number, depthDisplay: number): number {
  return (Math.round(groundDisplay * 1000) - Math.round(depthDisplay * 1000)) / 1000;
}

function formatScaleTickLabel(
  depthM: number,
  column: LogTemplateColumn,
  groundElevationM: number | null
): { elevation?: string; depth?: string } {
  const mode = getScaleDisplayMode(column);
  const depthDisplay = roundToMillis(
    isFeetDepthColumn(column) ? depthM * METRES_TO_FEET : depthM
  );
  const depthText = formatScaleNumber(depthDisplay, column);

  // Depth (m) / Depth (ft): omit the origin 0.0 label (implied at ground).
  if (mode === "depth") {
    if (Math.abs(depthDisplay) < 1e-6) return {};
    return { depth: depthText };
  }

  if (groundElevationM == null) {
    return mode === "elevation_depth" ? { depth: depthText } : {};
  }

  const groundDisplay = roundToMillis(
    isFeetDepthColumn(column) ? groundElevationM * METRES_TO_FEET : groundElevationM
  );
  const elevationText = formatScaleNumber(
    elevationAtDisplayedDepth(groundDisplay, depthDisplay),
    column
  );
  if (mode === "elevation") return { elevation: elevationText };
  return { elevation: elevationText, depth: depthText };
}

function buildDepthTickValues(
  column: LogTemplateColumn | null | undefined,
  pageStartMetres: number,
  pageWindowMetres: number
): { majorTicks: number[]; minorTicks: number[] } {
  const majorRaw = Number(column?.majorStep ?? 1);
  const majorStep = Number.isFinite(majorRaw) && majorRaw > 0 ? majorRaw : 1;
  const minorRaw = Number(column?.minorStep ?? 0.1);
  const minorStep =
    Number.isFinite(minorRaw) && minorRaw > 0 ? Math.min(minorRaw, majorStep) : majorStep / 10;
  const pageEndMetres = pageStartMetres + pageWindowMetres;

  const firstMinor = Math.ceil((pageStartMetres + 1e-9) / minorStep) * minorStep;
  const minorTicks: number[] = [];
  for (let value = firstMinor; value < pageEndMetres - 1e-9; value += minorStep) {
    const rounded = Math.round(value * 1000) / 1000;
    const isMajor = Math.abs(rounded / majorStep - Math.round(rounded / majorStep)) < 1e-6;
    if (!isMajor) minorTicks.push(rounded);
  }

  const firstMajor = Math.ceil((pageStartMetres + 1e-9) / majorStep) * majorStep;
  const majorTicks: number[] = [];
  for (let value = firstMajor; value < pageEndMetres - 1e-9; value += majorStep) {
    majorTicks.push(Math.round(value * 1000) / 1000);
  }

  return { majorTicks, minorTicks };
}

function buildStratumDepthLabels(
  strata: PreviewStratum[],
  pageStartMetres: number,
  pageWindowMetres: number
): number[] {
  const pageEndMetres = pageStartMetres + pageWindowMetres;
  // Label each saved subsurface record depth (deduped), not split band edges.
  const sectionStarts = strata
    .filter(
      (stratum) =>
        stratum.toDepth > pageStartMetres + 1e-6 && stratum.fromDepth < pageEndMetres - 1e-6
    )
    .map((stratum) =>
      Math.round((stratum.recordStartDepth ?? stratum.fromDepth) * 1000) / 1000
    )
    .filter((depth) => depth >= pageStartMetres - 1e-6 && depth < pageEndMetres - 1e-6)
    .filter(
      (depth) =>
        !(pageStartMetres <= 1e-6 && depth <= pageStartMetres + 1e-6)
    );

  return Array.from(new Set(sectionStarts)).sort((a, b) => a - b);
}

/**
 * Depth(m) scale: track marks on the LEFT vertical line (column border) with
 * labels to the right — matches Tablogs PSP | Water | Depth layouts.
 * Feet columns keep numeric labels only (no second tick rail).
 */
function DepthColumnScale({
  column,
  strata,
  pageStartMetres,
  pageWindowMetres,
  groundElevationM,
}: {
  column: LogTemplateColumn;
  strata: PreviewStratum[];
  pageStartMetres: number;
  pageWindowMetres: number;
  groundElevationM: number | null;
}) {
  const scaleMode = getScaleDisplayMode(column);
  const isElevDepthScale = scaleMode === "elevation_depth";
  // Elevation/Depth uses stacked labels — do not draw a second vertical rail.
  const showTrackMarks = !isElevDepthScale && !isFeetDepthColumn(column);
  const { majorTicks, minorTicks } = buildDepthTickValues(
    column,
    pageStartMetres,
    pageWindowMetres
  );
  const pageEndMetres = pageStartMetres + pageWindowMetres;
  const startTick = Math.round(pageStartMetres * 1000) / 1000;

  // Label every subsurface section-start depth (e.g. 0.5, 0.8) plus major scale.
  const boundaryDepths = buildStratumDepthLabels(
    strata,
    pageStartMetres,
    pageWindowMetres
  );

  const labeledMajors = Array.from(
    new Set(
      [startTick, ...majorTicks]
        .map((depth) => Math.round(depth * 1000) / 1000)
        .filter((depth) => depth >= pageStartMetres - 1e-6 && depth < pageEndMetres - 1e-6)
    )
  );

  const depths = Array.from(
    new Set(
      [startTick, ...majorTicks, ...boundaryDepths]
        .map((depth) => Math.round(depth * 1000) / 1000)
        .filter((depth) => depth >= pageStartMetres - 1e-6 && depth < pageEndMetres - 1e-6)
    )
  ).sort((a, b) => a - b);

  // Longer ticks at labeled boundaries that aren't already major steps.
  const majorSet = new Set(labeledMajors);
  const boundaryTicks = boundaryDepths.filter((depth) => !majorSet.has(depth));

  const tickTop = (tick: number) =>
    `${((tick - pageStartMetres) / pageWindowMetres) * 100}%`;

  return (
    <div className="log-report-composed__depth-scale">
      {showTrackMarks ? (
        <div className="log-report-composed__depth-track" aria-hidden="true">
          {minorTicks.map((tick) => (
            <span
              key={`depth-minor-${tick}`}
              className="log-report-composed__depth-track-tick is-minor"
              style={{ top: tickTop(tick) }}
            />
          ))}
          {boundaryTicks.map((tick) => (
            <span
              key={`depth-boundary-${tick}`}
              className="log-report-composed__depth-track-tick is-major"
              style={{ top: tickTop(tick) }}
            />
          ))}
          {labeledMajors.map((tick) => (
            <span
              key={`depth-major-${tick}`}
              className="log-report-composed__depth-track-tick is-major"
              style={{ top: tickTop(tick) }}
            />
          ))}
        </div>
      ) : null}
      <div className="log-report-composed__depth-labels">
        {depths.map((tick) => {
          const label = formatScaleTickLabel(tick, column, groundElevationM);
          if (!label.elevation && !label.depth) return null;
          const top = tickTop(tick);
          const key = roundToMillis(tick);
          const isPageStartTick = Math.abs(tick - pageStartMetres) < 1e-6;
          const stacked = Boolean(isElevDepthScale && label.elevation && label.depth);
          const className = [
            "log-report-composed__depth-tick-label",
            stacked ? "is-elev-depth" : "",
            isPageStartTick ? "is-page-start" : "",
          ]
            .filter(Boolean)
            .join(" ");
          if (stacked) {
            return (
              <span key={`label-${key}`} className={className} style={{ top }}>
                <span className="log-report-composed__depth-tick-elev">{label.elevation}</span>
                <span className="log-report-composed__depth-tick-rule" aria-hidden="true" />
                <span className="log-report-composed__depth-tick-depth">{label.depth}</span>
              </span>
            );
          }
          const text = label.elevation ?? label.depth ?? "";
          return (
            <span key={`label-${key}`} className={className} style={{ top }}>
              {text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function CellText({ children }: { children: string }) {
  return <span className="log-report-composed__cell-text">{children}</span>;
}

function asCellText(value: ReactNode): ReactNode {
  if (value == null || value === false) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return <CellText>{trimmed}</CellText>;
  }
  return value;
}

function stratumCellContent(
  kind: ReturnType<typeof columnKind>,
  column: LogTemplateColumn,
  stratum: PreviewStratum,
  isContinuation: boolean
) {
  switch (kind) {
    case "depth":
      // Major-step gridline labels live on the strata grid backdrop, not per-stratum.
      return null;
    case "well_diagram":
      // Real well-construction rendering (casings/backfills) isn't wired up yet;
      // leave blank rather than reusing the soil-classification hatch.
      return null;
    case "graphic":
      // The hatch continues across every page a layer spans; only the text is page-local.
      return <GraphicHatch stratum={stratum} />;
    case "chart":
      // Full-height DCP lives on the strata grid backdrop.
      return null;
    case "origin":
      return asCellText(isContinuation ? null : stratum.origin);
    case "classification":
      return asCellText(isContinuation ? null : stratum.classification);
    case "description":
      return asCellText(isContinuation ? null : stratum.description);
    case "consistency":
      return asCellText(isContinuation ? null : stratum.consistency);
    case "moisture":
      return asCellText(isContinuation ? null : stratum.moisture);
    case "remarks":
      return asCellText(isContinuation ? null : stratum.remarks);
    case "method":
      return null;
    case "psp":
      // Full-height PSP bands live on the strata grid backdrop.
      return null;
    case "water":
      // Water strikes live on the strata grid backdrop.
      return null;
    case "text":
    default:
      // Builder-configured / newly added columns: bind via column_data_source or string builder.
      return asCellText(
        isContinuation ? null : resolveStratumFieldForColumn(column, stratum)
      );
  }
}

/** Depth range covered by one physical page, driven by the Metres/Page setting. */
type ReportPagination = {
  strata: PreviewStratum[];
  refusal: string;
  configuredMetres: number;
  deepest: number;
  pageCount: number;
  endDepthM: number | null;
};

function useReportPagination(
  form: LogFormState,
  metresPerPage: string,
  subsurfaceLayers: PreviewStratum[] | null | undefined,
  hasColumns: boolean
): ReportPagination {
  // Vertical track / page window length always comes from Log Report → Metres/Page.
  const metres = Number(metresPerPage);
  const configuredMetres = Number.isFinite(metres) && metres > 0 ? metres : 2;
  const endDepthM = parseFinishEndDepthMetres(form.endDepth);

  const strata = useMemo(() => {
    // Only real subsurface layers; never inject demo filler when the log has no records.
    const source = subsurfaceLayers && subsurfaceLayers.length > 0 ? subsurfaceLayers : [];
    // Finish-log end depth caps which subsurface intervals appear on the report.
    return clipStrataToEndDepth(source, endDepthM);
  }, [subsurfaceLayers, endDepthM]);

  const refusal = useMemo(() => buildRefusalText(form), [form]);

  const deepest = useMemo(
    () => resolveReportDeepestMetres(strata, form.endDepth),
    [strata, form.endDepth]
  );

  const pageCount = hasColumns
    ? Math.max(1, Math.ceil((deepest > 0 ? deepest : configuredMetres) / configuredMetres))
    : 1;

  return { strata, refusal, configuredMetres, deepest, pageCount, endDepthM };
}

function LogBody({
  columns,
  strata,
  pageStartMetres,
  pageWindowMetres,
  refusal,
  showRefusal,
  dcpPoints,
  drillingIntervals,
  pspBands,
  waterObservations,
  wellIntervals,
  hideColumnHeadings = false,
  groundElevationM,
}: {
  columns: LogTemplateColumn[];
  strata: PreviewStratum[];
  pageStartMetres: number;
  pageWindowMetres: number;
  refusal: string;
  showRefusal: boolean;
  dcpPoints?: DcpPoint[] | null;
  drillingIntervals?: PreviewDrillingInterval[] | null;
  pspBands?: PreviewPspBand[] | null;
  waterObservations?: PreviewWaterObservation[] | null;
  wellIntervals?: PreviewWellInterval[] | null;
  hideColumnHeadings?: boolean;
  groundElevationM: number | null;
}) {
  const widthPcts = columnWidthPct(columns);
  const pageEndMetres = pageStartMetres + pageWindowMetres;

  // Strata overlapping this page's depth window, clipped to it. `isContinuation` marks
  // a layer that already started on an earlier page, so its text isn't repeated here.
  const pageStrata = useMemo(
    () =>
      strata
        .filter((stratum) => {
          const overlaps =
            stratum.toDepth > pageStartMetres && stratum.fromDepth < pageEndMetres;
          // Zero-thickness layers (e.g. depth 0 at surface) still belong on the page.
          const pointOnPage =
            stratum.toDepth === stratum.fromDepth &&
            stratum.fromDepth >= pageStartMetres &&
            stratum.fromDepth < pageEndMetres;
          return overlaps || pointOnPage;
        })
        .map((stratum) => ({
          stratum: {
            ...stratum,
            fromDepth: Math.max(stratum.fromDepth, pageStartMetres),
            toDepth: Math.min(stratum.toDepth, pageEndMetres),
          },
          isContinuation: stratum.fromDepth < pageStartMetres,
        })),
    [strata, pageStartMetres, pageEndMetres]
  );

  if (columns.length === 0) {
    return (
      <div className="log-report-composed__body-empty">
        Select a log template to preview columns.
      </div>
    );
  }

  const gridCols = widthPcts.map((pct) => `${pct}%`).join(" ");
  const hasRefusalBanner = Boolean(showRefusal && refusal);

  return (
    <div
      className={`log-report-composed__body${hasRefusalBanner ? " has-refusal" : ""}`}
    >
      {!hideColumnHeadings ? (
      <div className="log-report-composed__col-head" style={{ gridTemplateColumns: gridCols }}>
        {columns.map((column, index) => {
          const vertical = isVerticalColumnTitle(column);
          const kind = columnKind(column);
          const isPenetration = isPenetrationChartColumn(column);
          const isRemarks = kind === "remarks";
          const isTestingUcs = isTestingUcsColumn(column);
          const axisVariant = isPenetration ? null : corelogAxisVariant(column);
          const axisLabels = axisVariant ? corelogAxisLabels(column) : null;
          const borderClass = contentBandBorderClass(
            column,
            columns[index + 1] ?? null,
            columns[index - 1] ?? null
          );
          return (
            <div
              key={columnKey(column)}
              className={[
                "log-report-composed__col-title",
                vertical ? "is-vertical" : "",
                isPenetration ? "is-dcp" : "",
                axisLabels ? "is-axis-scale" : "",
                isTestingUcs ? "is-testing-ucs" : "",
                isRemarks ? "is-remarks-header" : "",
                borderClass,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isTestingUcs ? (
                <span className="log-report-composed__testing-band">Testing</span>
              ) : null}
              <span
                className={[
                  "log-report-composed__col-title-text",
                  vertical || isTestingUcs ? "is-vertical" : "",
                  axisLabels ? "is-axis-parent" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isTestingUcs ? "UCS" : column.text || column.code}
              </span>
              {isPenetration ? <DcpHeaderScale column={column} /> : null}
              {axisLabels && axisVariant ? (
                <CorelogAxisHeaderScale labels={axisLabels} variant={axisVariant} />
              ) : null}
              {isRemarks ? (
                <span className="log-report-composed__remarks-band">Remarks</span>
              ) : null}
            </div>
          );
        })}
      </div>
      ) : null}

      <div className="log-report-composed__strata-wrap">
        {/* Full-height column rails so empty depth below the hole still shows the grid */}
        <div
          className="log-report-composed__strata-grid"
          style={{ gridTemplateColumns: gridCols }}
          aria-hidden="true"
        >
          {columns.map((column, index) => {
            const kind = columnKind(column);
            const dividerClass = methodDcpDividerClasses(
              column,
              columns[index + 1] ?? null,
              columns[index - 1] ?? null
            );
            const axisLabels = corelogAxisLabels(column);
            return (
              <div
                key={`grid-${column.code}`}
                className={[
                  "log-report-composed__strata-grid-cell",
                  `is-${kind}`,
                  axisLabels ? "is-axis-scale" : "",
                  dividerClass,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {kind === "chart" ? (
                  <DcpChart
                    column={column}
                    points={filterDcpPointsForColumn(dcpPoints ?? [], column)}
                    pageStartMetres={pageStartMetres}
                    pageWindowMetres={pageWindowMetres}
                  />
                ) : null}
                {kind === "method" ? (
                  <DrillingMethodColumn
                    intervals={drillingIntervals ?? []}
                    pageStartMetres={pageStartMetres}
                    pageWindowMetres={pageWindowMetres}
                  />
                ) : null}
                {kind === "psp" ? (
                  <PspColumn
                    bands={pspBands ?? []}
                    pageStartMetres={pageStartMetres}
                    pageWindowMetres={pageWindowMetres}
                  />
                ) : null}
                {kind === "water" ? (
                  <WaterColumn
                    observations={waterObservations ?? []}
                    pageStartMetres={pageStartMetres}
                    pageWindowMetres={pageWindowMetres}
                  />
                ) : null}
                {kind === "well_diagram" ? (
                  <WellDiagramColumn
                    intervals={wellIntervals ?? []}
                    column={column}
                    pageStartMetres={pageStartMetres}
                    pageWindowMetres={pageWindowMetres}
                  />
                ) : null}
                {kind === "depth" ? (
                  <DepthColumnScale
                    column={column}
                    strata={strata}
                    pageStartMetres={pageStartMetres}
                    pageWindowMetres={pageWindowMetres}
                    groundElevationM={groundElevationM}
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        {pageStrata.map(({ stratum, isContinuation }, stratumIndex) => {
          const topPct = Math.max(0, ((stratum.fromDepth - pageStartMetres) / pageWindowMetres) * 100);
          const thicknessM = Math.max(0, stratum.toDepth - stratum.fromDepth);
          // Zero-thickness / depth-0 bands need enough height for graphic + text.
          const heightPct = Math.max(
            thicknessM > 1e-9 ? (thicknessM / pageWindowMetres) * 100 : 8,
            2.5
          );
          const isLastBeforeRefusal =
            hasRefusalBanner && stratumIndex === pageStrata.length - 1;
          return (
            <div
              key={`${stratum.fromDepth}-${stratum.toDepth}-${stratum.recordStartDepth}-${stratum.classification}-${stratum.description.slice(0, 24)}`}
              className={`log-report-composed__stratum${
                isLastBeforeRefusal ? " is-last-before-refusal" : ""
              }`}
              style={{
                top: `${topPct}%`,
                height: `${heightPct}%`,
                gridTemplateColumns: gridCols,
              }}
            >
              {columns.map((column, columnIndex) => {
                const kind = columnKind(column);
                const dividerClass = methodDcpDividerClasses(
                  column,
                  columns[columnIndex + 1] ?? null,
                  columns[columnIndex - 1] ?? null
                );
                const noStratumLine = suppressesStratumBorder(column);
                return (
                  <div
                    key={`${columnKey(column)}-${stratum.fromDepth}-${stratum.toDepth}-${stratum.recordStartDepth}`}
                    className={[
                      "log-report-composed__stratum-cell",
                      `is-${kind}`,
                      dividerClass,
                      noStratumLine ? "no-stratum-line" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {stratumCellContent(kind, column, stratum, isContinuation)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {hasRefusalBanner ? (
        <div className="log-report-composed__refusal-row">
          <div className="log-report-composed__refusal-banner">{asCellText(refusal)}</div>
        </div>
      ) : null}
    </div>
  );
}

export const LogReportComposedSheet = forwardRef<HTMLElement, LogReportComposedSheetProps>(
  function LogReportComposedSheet(
    {
      project,
      form,
      selection,
      logTemplate,
      headerTemplate,
      footerTemplate,
      companyName,
      companyLogoUrl,
      companyEmail,
      companyPhone,
      phoneCode,
      phoneNumber,
      equipmentLabel,
      supplierLabel,
      subsurfaceLayers,
      dcpPoints,
      drillingIntervals,
      pspBands,
      waterObservations,
      wellIntervals,
      className,
      style,
    },
    ref
  ) {
    const fallbackContent = useMemo(() => createDefaultHeaderFooterContent(), []);

    const headerSection = useMemo(() => {
      if (!headerTemplate) return null;
      const content = normalizeHeaderFooterContent(headerTemplate.content, fallbackContent);
      return content.sections.header.enabled ? content.sections.header : null;
    }, [fallbackContent, headerTemplate]);

    const footerSection = useMemo(() => {
      if (!footerTemplate) return null;
      const content = normalizeHeaderFooterContent(footerTemplate.content, fallbackContent);
      return content.sections.footer.enabled ? content.sections.footer : null;
    }, [fallbackContent, footerTemplate]);

    const baseTokenContext = useMemo(
      () =>
        buildLogReportTokenContext(project, form, {
          companyName,
          companyLogoUrl,
          companyEmail,
          companyPhone,
          phoneCode,
          phoneNumber,
          equipmentLabel,
          supplierLabel,
        }),
      [
        companyEmail,
        companyLogoUrl,
        companyName,
        companyPhone,
        equipmentLabel,
        form,
        phoneCode,
        phoneNumber,
        project,
        supplierLabel,
      ]
    );

    // Keep visible columns in the template's configured order (API `columnData`).
    // Do not invent a fixed geotech layout — builder/API order is the source of truth.
    const columns = useMemo(() => visibleColumns(logTemplate), [logTemplate]);
    const pageWidth = reportPageWidthPx(selection.pageSize, selection.orientation);
    const pageHeight = reportPageHeightPx(selection.pageSize, selection.orientation);

    // Depth range covered by one physical page (Metres/Page). When the borehole goes
    // deeper than that, additional pages are added automatically, each repeating the
    // header/column titles and continuing the strata from where the previous page left off.
    // Finish-log end depth filters which layers/points appear; it does not change track length.
    const { strata, refusal, configuredMetres, pageCount, endDepthM } = useReportPagination(
      form,
      selection.metresPerPage,
      subsurfaceLayers,
      columns.length > 0
    );

    const cappedDcpPoints = useMemo(
      () => clipDcpPointsToEndDepth(dcpPoints ?? [], endDepthM),
      [dcpPoints, endDepthM]
    );
    const cappedDrillingIntervals = useMemo(
      () => clipDrillingIntervalsToEndDepth(drillingIntervals ?? [], endDepthM),
      [drillingIntervals, endDepthM]
    );
    const cappedWaterObservations = useMemo(
      () => clipWaterObservationsToEndDepth(waterObservations ?? [], endDepthM),
      [waterObservations, endDepthM]
    );
    const cappedPspBands = useMemo(
      () => clipPspBandsToEndDepth(pspBands ?? [], endDepthM),
      [pspBands, endDepthM]
    );
    const cappedWellIntervals = useMemo(
      () => clipWellIntervalsToEndDepth(wellIntervals ?? [], endDepthM),
      [wellIntervals, endDepthM]
    );
    return (
      // `section` (not `div`) so this keeps the same generic-HTMLElement DOM type the
      // forwarded ref already expects (matching the single `<article>` it used to point at).
      <section
        ref={ref}
        className={`log-report-composed__pages${className ? ` ${className}` : ""}`}
        data-orientation={selection.orientation}
        data-page-size={selection.pageSize}
        data-page-count={pageCount}
        data-log-number={form.logNumber ?? ""}
        style={style}
      >
        {Array.from({ length: pageCount }, (_, pageIndex) => {
          const pageStartMetres = pageIndex * configuredMetres;
          const pageTokenContext = {
            ...baseTokenContext,
            "{{page}}": String(pageIndex + 1),
            "{{pages}}": String(pageCount),
          };
          return (
            <article
              key={pageIndex}
              className="log-report-composed"
              style={{ width: pageWidth, height: pageHeight, minHeight: pageHeight }}
              data-orientation={selection.orientation}
              data-page-size={selection.pageSize}
              data-page-index={pageIndex}
            >
              <div className="log-report-composed__frame">
              {headerSection ? (
                <HfSectionGrid
                  section={headerSection}
                  tokenContext={pageTokenContext}
                  companyLogoUrl={companyLogoUrl}
                  variant="header"
                />
              ) : (
                <div className="log-report-composed__placeholder">No header template selected</div>
              )}

              <LogBody
                columns={columns}
                strata={strata}
                pageStartMetres={pageStartMetres}
                pageWindowMetres={configuredMetres}
                refusal={refusal}
                showRefusal={pageIndex === pageCount - 1}
                dcpPoints={cappedDcpPoints}
                drillingIntervals={cappedDrillingIntervals}
                pspBands={cappedPspBands}
                waterObservations={cappedWaterObservations}
                wellIntervals={cappedWellIntervals}
                hideColumnHeadings={Boolean(logTemplate?.config.hide_all_column_headings)}
                groundElevationM={parseGroundElevationMetres(form.elevation)}
              />

              {footerSection ? (
                <HfSectionGrid
                  section={footerSection}
                  tokenContext={pageTokenContext}
                  companyLogoUrl={companyLogoUrl}
                  variant="footer"
                  waterObservations={cappedWaterObservations}
                />
              ) : (
                <div className="log-report-composed__placeholder">No footer template selected</div>
              )}
              </div>
            </article>
          );
        })}
      </section>
    );
  }
);

/** Styles injected into print / new-tab preview documents. */
export const LOG_REPORT_COMPOSED_PRINT_STYLES = `
  body { margin: 12px; font-family: Arial, Helvetica, sans-serif; color: #000; background: #e5e7eb; }
  .log-report-composed__pages {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .log-report-composed {
    margin: 0 auto;
    background: #fff;
    border: none;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    padding: 20px;
  }
  .log-report-composed__frame {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    border: 1.5px solid #000;
    background: #fff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
  }
  .log-report-composed__hf-grid {
    display: grid;
    width: 100%;
    flex-shrink: 0;
    background: #fff;
    gap: 0;
    border: none;
    box-sizing: border-box;
  }
  .log-report-composed__hf-grid--header {
    background: #000;
    /* One horizontal rule between brand row and meta row; no vertical column dividers. */
    row-gap: 1px;
    column-gap: 0;
    border-bottom: 1px solid #000;
  }
  .log-report-composed__hf-cell {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
    min-height: 0;
    box-sizing: border-box;
    background: #fff;
    border-style: solid;
    border-color: #000;
    border-width: 0;
  }
  .log-report-composed__hf-cell.is-image {
    align-items: stretch;
    justify-content: center;
    padding: 2px !important;
  }
  .log-report-composed__hf-image {
    display: block;
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    object-position: center;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
  }
  .log-report-composed__logo-fallback {
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700; color: #6b7280; background: #f3f4f6;
  }
  .log-report-composed__hf-text { white-space: pre-wrap; line-height: 1.2; }
  .log-report-composed__hf-meta {
    display: table;
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 3px;
    line-height: 1.35;
  }
  .log-report-composed__hf-meta-row {
    display: table-row;
  }
  .log-report-composed__hf-meta-label,
  .log-report-composed__hf-meta-sep,
  .log-report-composed__hf-meta-value {
    display: table-cell;
    vertical-align: baseline;
  }
  .log-report-composed__hf-meta-label,
  .log-report-composed__hf-meta-sep {
    white-space: nowrap;
  }
  .log-report-composed__hf-meta-label {
    padding-right: 4px;
  }
  .log-report-composed__hf-meta-sep {
    padding-right: 4px;
  }
  .log-report-composed__hf-meta-value {
    width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .log-report-composed__hf-legend-col {
    display: flex;
    flex-direction: column;
    width: 100%;
    line-height: 1.15;
    padding-top: 0.6em;
  }
  .log-report-composed__hf-legend-col-title.is-column {
    font-weight: 700;
    line-height: 1.15;
    margin: 0 0 0.85em;
    white-space: nowrap;
  }
  .log-report-composed__hf-legend-col-title.is-section {
    font-weight: 700;
    line-height: 1.15;
    margin: 0.45em 0 0.85em;
    white-space: nowrap;
  }
  .log-report-composed__hf-legend-col-entry-row {
    display: grid;
    grid-template-columns: var(--hf-legend-label-width, 3ch) min-content minmax(0, 1fr);
    column-gap: 4px;
    line-height: 1.15;
    align-items: start;
    margin-bottom: 0.55em;
  }
  .log-report-composed__hf-legend-col-entry-row:last-child {
    margin-bottom: 0;
  }
  .log-report-composed__hf-legend-col-label,
  .log-report-composed__hf-legend-col-sep {
    white-space: nowrap;
    line-height: 1.15;
  }
  .log-report-composed__hf-legend-col-value {
    min-width: 0;
    line-height: 1.15;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .log-report-composed__hf-grid--footer .log-report-composed__hf-text {
    display: block;
    padding-top: 0.6em;
    font-size: 5.5pt;
  }
  .log-report-composed__hf-grid--footer .log-report-composed__hf-legend-col {
    font-size: 5.5pt;
  }
  .log-report-composed__hf-legend { font-size: 9px; color: #374151; }
  .log-report-composed__hf-legend-block {
    width: 100%; height: 100%; display: flex; flex-direction: column;
    gap: 2px; min-width: 0; overflow: hidden;
  }
  .log-report-composed__hf-legend-block-title { font-weight: 700; line-height: 1.15; }
  .log-report-composed__hf-legend-block-rows {
    display: flex; flex-direction: column; gap: 1px; min-height: 0; overflow: hidden;
  }
  .log-report-composed__hf-legend-block-row {
    display: flex; align-items: center; gap: 4px; min-width: 0;
  }
  .log-report-composed__hf-legend-block-img {
    display: block; width: 14px; height: 16px; object-fit: contain; flex: 0 0 auto;
  }
  .log-report-composed__hf-legend-block-label {
    min-width: 0; line-height: 1.15; font-weight: 400;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .log-report-composed__hf-grid--footer .log-report-composed__hf-legend-block { font-size: 5.5pt; }
  .log-report-composed__placeholder {
    padding: 8px 10px; font-size: 11px; color: #6b7280; border-bottom: 1px solid #000;
  }
  .log-report-composed__body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid #000;
  }
  .log-report-composed__body.has-refusal { border-bottom: none; }
  .log-report-composed__body-empty {
    padding: 24px 12px; text-align: center; color: #9ca3af; font-size: 12px;
  }
  .log-report-composed__col-head {
    display: grid;
    border-bottom: 1px solid #000;
    background: #fff;
    flex-shrink: 0;
  }
  .log-report-composed__col-title {
    padding: 6px 5px;
    font-size: 8px;
    font-weight: 700;
    text-align: center;
    border-right: 1px solid #000;
    word-break: break-word;
    line-height: 1.15;
    box-sizing: border-box;
  }
  .log-report-composed__col-title:last-child { border-right: none; }
  .log-report-composed__col-title.has-content-band-divider {
    border-right: 1px solid #000;
  }
  .log-report-composed__col-title.has-method-dcp-divider,
  .log-report-composed__strata-grid-cell.has-method-dcp-divider,
  .log-report-composed__stratum-cell.has-method-dcp-divider {
    border-right: 1px solid #000 !important;
  }
  /* Do not add border-left here — method already draws the shared edge via
     border-right; a second stroke makes the Method|DCP divider look bold. */
  .log-report-composed__col-title.is-vertical {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 84px;
    padding: 10px 6px;
    overflow: hidden;
    box-sizing: border-box;
  }
  /* Keep stacked title + compact child scale band (matches reference PDF). */
  .log-report-composed__col-title.is-vertical.is-axis-scale,
  .log-report-composed__col-title.is-vertical.is-testing-ucs {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: 2px 0 0;
    min-height: 120px;
    overflow: hidden;
  }
  .log-report-composed__col-title.is-vertical.is-testing-ucs {
    padding: 0;
  }
  .log-report-composed__col-title-text.is-vertical {
    display: inline-block;
    writing-mode: horizontal-tb;
    transform: rotate(-90deg);
    transform-origin: center center;
    white-space: nowrap;
    line-height: 1.1;
    padding: 3px 12px;
    box-sizing: border-box;
  }
  /* Longer parent titles need a smaller glyph + less padding so they fit above the child strip. */
  .log-report-composed__col-title-text.is-vertical.is-axis-parent {
    font-size: 6.5px;
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.02em;
    padding: 1px 4px;
  }
  .log-report-composed__col-title.is-dcp,
  .log-report-composed__col-title.is-axis-scale,
  .log-report-composed__col-title.is-testing-ucs,
  .log-report-composed__col-title.is-remarks-header {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    min-height: 120px;
    overflow: hidden;
    box-sizing: border-box;
  }
  .log-report-composed__col-title.is-dcp {
    padding: 6px 0 2px;
    word-break: normal;
    overflow: visible;
    justify-content: space-between;
  }
  .log-report-composed__col-title.is-axis-scale {
    padding: 2px 0 0;
  }
  .log-report-composed__col-title.is-testing-ucs {
    padding: 0;
  }
  .log-report-composed__col-title.is-remarks-header {
    padding: 6px 5px 2px;
    justify-content: space-between;
  }
  .log-report-composed__col-title.is-dcp .log-report-composed__col-title-text,
  .log-report-composed__col-title.is-axis-scale .log-report-composed__col-title-text,
  .log-report-composed__col-title.is-testing-ucs .log-report-composed__col-title-text {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 1px;
    min-height: 0;
    overflow: hidden;
  }
  .log-report-composed__testing-band {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    flex-shrink: 0;
    border-bottom: 1px solid #000;
    font-size: 7px;
    font-weight: 700;
    line-height: 1.1;
    padding: 2px 2px;
    box-sizing: border-box;
    text-align: center;
  }
  /* Child values: short bottom strip, vertical labels, no borders. */
  .log-report-composed__axis-scale {
    display: flex;
    width: 100%;
    align-items: flex-end;
    justify-content: space-between;
    height: 28px;
    min-height: 28px;
    max-height: 28px;
    border-top: 1px solid #000;
    flex-shrink: 0;
    overflow: hidden;
    box-sizing: border-box;
    background: #fff;
    padding: 0 0 1px;
    position: relative;
    margin-top: auto;
  }
  .log-report-composed__axis-scale--strength {
    height: 32px;
    min-height: 32px;
    max-height: 32px;
  }
  .log-report-composed__axis-scale--spacing,
  .log-report-composed__axis-scale--rqd {
    height: 26px;
    min-height: 26px;
    max-height: 26px;
  }
  .log-report-composed__axis-scale-cell {
    flex: 1 1 0;
    width: 0;
    min-width: 0;
    max-width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    border: none;
    overflow: hidden;
    box-sizing: border-box;
    padding: 0;
    height: 100%;
  }
  .log-report-composed__axis-scale-text {
    display: block;
    font-size: 4.5px;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    white-space: nowrap;
    letter-spacing: -0.05em;
    max-height: 100%;
    max-width: 100%;
    overflow: hidden;
    text-overflow: clip;
  }
  .log-report-composed__axis-scale--strength .log-report-composed__axis-scale-text {
    font-size: 3.25px;
    letter-spacing: -0.07em;
  }
  .log-report-composed__axis-scale--spacing .log-report-composed__axis-scale-text,
  .log-report-composed__axis-scale--rqd .log-report-composed__axis-scale-text {
    font-size: 5px;
    letter-spacing: 0;
  }
  .log-report-composed__axis-body-guides,
  .log-report-composed__axis-body-guide {
    display: none;
  }
  .log-report-composed__strata-grid-cell.is-axis-scale {
    position: relative;
  }
  .log-report-composed__remarks-band {
    display: block;
    width: 100%;
    text-align: center;
    font-size: 7px;
    font-weight: 700;
    line-height: 1.2;
    padding: 1px 2px;
    box-sizing: border-box;
  }
  .log-report-composed__strata-wrap {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }
  .log-report-composed__strata-grid {
    position: absolute;
    inset: 0;
    display: grid;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  }
  .log-report-composed__strata-grid-cell {
    position: relative;
    border-right: 1px solid #000;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }
  .log-report-composed__strata-grid-cell:last-child { border-right: none; }
  .log-report-composed__strata-grid-cell.is-chart {
    display: flex;
    flex-direction: column;
  }
  .log-report-composed__drill-methods {
    position: absolute; inset: 0; z-index: 1; pointer-events: none;
  }
  .log-report-composed__psp-col {
    position: absolute; inset: 0; z-index: 1; pointer-events: none;
  }
  .log-report-composed__psp-band {
    position: absolute; left: 0; right: 0; box-sizing: border-box;
    border: none; border-bottom: 1px solid #000; background: transparent;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; min-height: 12px;
  }
  .log-report-composed__psp-band-text {
    font-size: 7px; line-height: 1.1; color: #000; text-align: center;
    padding: 1px 2px; white-space: nowrap;
  }
  .log-report-composed__water-col {
    position: absolute; inset: 0; z-index: 1; pointer-events: none;
  }
  .log-report-composed__water-mark-group {
    position: absolute; left: 1px; right: 1px;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
    gap: 3px; transform: translateY(-4px); box-sizing: border-box;
  }
  .log-report-composed__water-mark {
    position: relative; left: auto;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
    transform: none; gap: 1px; max-width: 100%; min-width: 0;
  }
  .log-report-composed__water-mark-group.is-multi .log-report-composed__water-mark {
    max-width: 100%; flex: 0 0 auto;
  }
  .log-report-composed__water-mark-group.is-multi .log-report-composed__water-symbol-img {
    width: 12px; max-height: 36px;
  }
  .log-report-composed__water-mark-group.is-multi .log-report-composed__water-label {
    font-size: 6px;
  }
  .log-report-composed__water-symbol-img {
    display: block; width: 14px; height: auto; max-height: 48px;
    object-fit: contain; flex: 0 0 auto;
  }
  .log-report-composed__water-symbol { color: #000; font-size: 10px; line-height: 1; flex: 0 0 auto; }
  .log-report-composed__water-label {
    font-size: 7px; line-height: 1.1; color: #000; text-align: center;
    max-width: 100%; padding: 0 1px; white-space: normal; overflow-wrap: anywhere;
    writing-mode: horizontal-tb; transform: none; min-width: 0;
  }
  .log-report-composed__well-diagram {
    position: absolute; inset: 0; z-index: 2; pointer-events: none; overflow: visible;
  }
  .log-report-composed__well-interval {
    position: absolute; left: 0; right: 0;
    display: flex; justify-content: center; box-sizing: border-box; overflow: visible;
  }
  .log-report-composed__well-body {
    position: relative; height: 100%; box-sizing: border-box;
    border: 1px solid #000; background: #fff; overflow: hidden; flex: 0 0 auto;
  }
  .log-report-composed__well-body.is-abutting { border-top: none; }
  .log-report-composed__well-body.is-casing {
    z-index: 2;
    background: transparent;
    border-color: transparent;
  }
  .log-report-composed__well-empty {
    position: absolute; inset: 0; background: #fff;
  }
  .log-report-composed__well-hatch {
    position: absolute; inset: 0;
    background: repeating-linear-gradient(to bottom, #000 0, #000 1px, #fff 1px, #fff 2.5px);
  }
  .log-report-composed__well-fill {
    position: absolute; inset: 0;
    background-repeat: repeat-y; background-size: 100% auto; background-position: top center;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges; pointer-events: none;
  }
  .log-report-composed__well-fill-probe {
    position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;
  }
  .log-report-composed__well-fill-img {
    position: absolute; inset: 0; display: block;
    width: 100%; height: 100%;
    object-fit: fill; object-position: center top;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges; pointer-events: none;
  }
  .log-report-composed__well-casing-fill {
    position: absolute; inset: 0; background: #d1d5db;
  }
  .log-report-composed__well-leader {
    position: absolute; right: 0; height: 0;
    border-top: 1px dotted #000; pointer-events: none; z-index: 3;
  }
  .log-report-composed__well-leader.is-top { top: 0; }
  .log-report-composed__well-leader.is-bottom { bottom: 0; }
  .log-report-composed__strata-grid-cell.is-well_diagram { position: relative; overflow: visible; }
  .log-report-composed__drill-interval {
    position: absolute; left: 0; right: 0; box-sizing: border-box;
    border-top: 1px solid #000; border-bottom: 1px solid #000;
    overflow: hidden; background: #fff;
  }
  .log-report-composed__drill-interval-graphic-wrap {
    position: absolute; inset: 0; box-sizing: border-box; pointer-events: none;
  }
  .log-report-composed__drill-interval-graphic {
    position: absolute; inset: 0; display: block;
    width: 100%; height: 100%;
    object-fit: fill; object-position: center bottom; pointer-events: none;
  }
  .log-report-composed__drill-interval-fallback {
    position: absolute; inset: 0; border: 1px solid #000;
    box-sizing: border-box; background: #fff;
  }
  .log-report-composed__drill-interval-fallback::after {
    content: ""; position: absolute; left: 50%; bottom: 0;
    width: 72%; height: 14%; transform: translateX(-50%);
    border: 1px solid #000; border-bottom: none; box-sizing: border-box;
    background: repeating-linear-gradient(90deg, #000 0 1px, transparent 1px 3px);
  }
  .log-report-composed__drill-interval-label {
    position: absolute; left: 50%; top: 36%; z-index: 2;
    display: flex; flex-direction: column; align-items: center; gap: 1px;
    transform: translateX(-50%); pointer-events: none;
  }
  .log-report-composed__drill-interval-name {
    display: block; padding: 1px 2px; font-size: 6px; font-weight: 700;
    line-height: 1; letter-spacing: 0; white-space: nowrap; word-break: keep-all;
    color: #111; background: #fff;
    writing-mode: vertical-rl; text-orientation: mixed;
  }
  .log-report-composed__drill-interval-arrow {
    display: block; padding: 0 2px; font-size: 6px; font-weight: 700;
    line-height: 1; color: #111; background: #fff;
  }
  .log-report-composed__stratum {
    position: absolute;
    left: 0;
    right: 0;
    display: grid;
    width: 100%;
    box-sizing: border-box;
    border-bottom: none;
    z-index: 1;
    background: transparent;
  }
  .log-report-composed__stratum-cell {
    position: relative;
    border-right: 1px solid #000;
    border-bottom: 1px solid #000;
    overflow: hidden;
    font-size: 8.5px;
    line-height: 1.2;
    padding: 5px 7px;
    box-sizing: border-box;
    min-height: 0;
    min-width: 0;
    background: #fff;
  }
  .log-report-composed__stratum-cell:last-child { border-right: none; }
  .log-report-composed__stratum-cell.is-method,
  .log-report-composed__stratum-cell.is-chart,
  .log-report-composed__stratum-cell.is-psp,
  .log-report-composed__stratum-cell.is-water,
  .log-report-composed__stratum-cell.is-well_diagram,
  .log-report-composed__stratum-cell.is-remarks,
  .log-report-composed__stratum-cell.is-depth,
  .log-report-composed__stratum-cell.no-stratum-line {
    border-bottom: none;
    background: transparent;
  }
  .log-report-composed__stratum-cell.is-depth {
    padding: 0;
  }
  .log-report-composed__stratum-cell.is-graphic,
  .log-report-composed__stratum-cell.is-well_diagram,
  .log-report-composed__stratum-cell.is-chart,
  .log-report-composed__stratum-cell.is-depth,
  .log-report-composed__stratum-cell.is-method { padding: 0; }
  .log-report-composed__stratum-cell.is-chart { background: transparent; }
  .log-report-composed__cell-text {
    display: block;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    overflow-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
    line-height: 1.2;
    white-space: normal;
    box-sizing: border-box;
    padding: 0 1px;
  }
  .log-report-composed__stratum-cell.is-origin,
  .log-report-composed__stratum-cell.is-consistency,
  .log-report-composed__stratum-cell.is-moisture,
  .log-report-composed__stratum-cell.is-text {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 7px;
    font-weight: 400;
    padding: 5px 7px;
  }
  .log-report-composed__stratum-cell.is-classification {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 8px;
    font-weight: 600;
    padding: 5px 7px;
  }
  .log-report-composed__stratum-cell.is-description,
  .log-report-composed__stratum-cell.is-remarks {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    text-align: left;
    font-size: 8px;
    padding: 5px 7px;
  }
  .log-report-composed__stratum-cell.is-origin .log-report-composed__cell-text,
  .log-report-composed__stratum-cell.is-consistency .log-report-composed__cell-text,
  .log-report-composed__stratum-cell.is-moisture .log-report-composed__cell-text {
    text-align: center;
    font-size: 7px;
    font-weight: 400;
  }
  .log-report-composed__stratum-cell.is-classification .log-report-composed__cell-text {
    text-align: center;
  }
  .log-report-composed__depth-scale {
    position: absolute; inset: 0; z-index: 3; pointer-events: none;
  }
  .log-report-composed__depth-track {
    position: absolute; top: 0; left: 0; bottom: 0; width: 8px;
    z-index: 1; pointer-events: none;
  }
  .log-report-composed__depth-track-tick {
    position: absolute; left: 0; height: 1px; background: #000;
    transform: translateY(-50%);
  }
  .log-report-composed__depth-track-tick.is-minor { width: 4px; }
  .log-report-composed__depth-track-tick.is-major { width: 7px; }
  .log-report-composed__depth-labels {
    position: absolute; inset: 0; z-index: 2; pointer-events: none;
  }
  .log-report-composed__depth-tick-label {
    position: absolute; left: 9px; max-width: calc(100% - 11px);
    transform: translateY(-50%);
    font-size: 8px; line-height: 1; white-space: nowrap; text-align: left;
    background: #fff; padding: 0 1px;
  }
  .log-report-composed__depth-tick-label.is-elev-depth {
    left: 50%; right: auto; max-width: calc(100% - 4px);
    transform: translate(-50%, -50%);
    display: flex; flex-direction: column; align-items: center;
    text-align: center; padding: 0; background: #fff;
  }
  .log-report-composed__depth-tick-label.is-page-start {
    transform: translateY(1px);
  }
  .log-report-composed__depth-tick-label.is-elev-depth.is-page-start {
    transform: translate(-50%, 1px);
  }
  .log-report-composed__depth-tick-elev,
  .log-report-composed__depth-tick-depth {
    display: block; line-height: 1.05; padding: 0 2px;
  }
  .log-report-composed__depth-tick-elev { padding-bottom: 1px; }
  .log-report-composed__depth-tick-depth { padding-top: 1px; }
  .log-report-composed__depth-tick-rule {
    display: block; width: 100%; min-width: 1.8em; height: 0;
    border-top: 1px solid #000;
  }
  .log-report-composed__hatch { width: 100%; height: 100%; min-height: 100%; position: relative; }
  .log-report-composed__hatch--image {
    background-repeat: repeat;
    background-size: 24px 24px;
    overflow: hidden;
  }
  .log-report-composed__hatch-img {
    position: absolute;
    top: 0;
    left: 0;
    /* Tall 500x960 pattern strips — zoom like classification preview / desired PDF */
    width: 700%;
    height: auto;
    min-height: 100%;
    max-width: none;
    object-fit: cover;
    object-position: top left;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    pointer-events: none;
  }
  .log-report-composed__hatch-overlay {
    position: absolute; inset: 0; opacity: 0.35; pointer-events: none;
  }
  .log-report-composed__hatch--concrete {
    background: repeating-linear-gradient(-45deg, #d1d5db 0 2px, #fff 2px 6px);
  }
  .log-report-composed__hatch--fill {
    background: radial-gradient(circle, #6b7280 0.8px, transparent 1px) 0 0 / 5px 5px,
      repeating-linear-gradient(45deg, transparent 0 3px, #9ca3af 3px 4px);
  }
  .log-report-composed__hatch--clay {
    background: repeating-linear-gradient(45deg, #4b5563 0 1px, #fff 1px 5px);
  }
  .log-report-composed__hatch--silt {
    background: repeating-linear-gradient(0deg, #9ca3af 0 1px, #fff 1px 4px);
  }
  .log-report-composed__hatch--sand {
    background: radial-gradient(circle, #6b7280 0.7px, transparent 1px) 0 0 / 4px 4px;
  }
  .log-report-composed__hatch--empty { background: #fff; }
  .log-report-composed__dcp { display: flex; flex-direction: column; height: 100%; }
  .log-report-composed__dcp-scale {
    position: relative;
    width: 100%;
    height: 12px;
    font-size: 7px;
    font-weight: 400;
    flex-shrink: 0;
    overflow: visible;
  }
  .log-report-composed__dcp-scale-inner {
    position: relative;
    height: 100%;
    overflow: visible;
  }
  .log-report-composed__dcp-scale-tick {
    position: absolute;
    top: 0;
    line-height: 1;
    white-space: nowrap;
    word-break: keep-all;
    overflow: visible;
  }
  .log-report-composed__dcp-plot {
    position: relative;
    flex: 1;
  }
  .log-report-composed__dcp-plot-inner {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }
  .log-report-composed__dcp-gridline.is-column-border {
    left: auto;
    right: 0;
    border-left: none;
    border-right: 1px dotted #9ca3af;
    transform: translateX(0.5px);
    pointer-events: none;
  }
  .log-report-composed__dcp-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .log-report-composed__dcp-gridline {
    position: absolute; top: 0; bottom: 0; width: 0;
    border-left: 1px dotted #9ca3af;
    transform: translateX(-0.5px);
  }
  .log-report-composed__dcp-depth-guide {
    position: absolute; left: 0; right: 0; height: 0;
    border-top: 1px solid #d1d5db;
    transform: translateY(-0.5px);
    pointer-events: none;
  }
  .log-report-composed__dcp-dot {
    position: absolute; width: 7px; height: 7px; border-radius: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    background: #000;
    border: 1px solid #000;
    box-sizing: border-box;
  }
  .log-report-composed__dcp-single-stem {
    position: absolute; width: 2px; height: 28px;
    transform: translate(-50%, -50%);
  }
  .log-report-composed__dcp-ticks,
  .log-report-composed__dcp-tick-label {
    display: none;
  }
  .log-report-composed__refusal-row {
    display: flex;
    align-items: stretch;
    flex-shrink: 0;
    background: #fff; border-top: 1px solid #000; border-bottom: 1px solid #000;
  }
  .log-report-composed__refusal-banner {
    flex: 1 1 auto; box-sizing: border-box;
    padding: 4px 8px; font-size: 8px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; text-align: center;
    min-width: 0; overflow: hidden;
  }
  .log-report-composed__stratum.is-last-before-refusal .log-report-composed__stratum-cell {
    border-bottom: none;
  }
  @media print {
    body { margin: 0; background: #fff; }
    .log-report-composed { box-shadow: none; width: 100% !important; min-height: auto !important; }
    .log-report-composed__pages { gap: 0; }
    .log-report-composed:not(:last-child) { page-break-after: always; break-after: page; }
  }
`;
