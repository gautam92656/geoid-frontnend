"use client";

import { forwardRef, useMemo, type CSSProperties } from "react";
import { COMPANY_LOGO_PATH } from "../data/branding";
import { createDefaultHeaderFooterContent } from "./headerFooterBuilder/builderDefaults";
import {
  normalizeHeaderFooterContent,
  type HfGridCell,
  type HfGridSection,
} from "./headerFooterBuilder/contentSchema";
import { mmToPx } from "./headerFooterBuilder/builderGeometry";
import { resolveRendererTokens } from "./headerFooterBuilder/rendererRegistry";
import type { HeaderFooterTemplate } from "../types/headerFooterTemplate";
import type { LogFormState } from "../types/log";
import type { LogTemplateColumn, LogTemplateRecord } from "../types/logTemplate";
import type { Project } from "../types/project";
import type { ReportPreviewTypeId } from "../data/logReportOptions";
import {
  buildLogReportTokenContext,
  buildPreviewStrata,
  buildRefusalText,
  polishResolvedHfText,
  reportPageHeightPx,
  reportPageWidthPx,
  type DcpPoint,
  type LogReportSelection,
  type PreviewStratum,
} from "../utils/logReportPreviewUtils";

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
  className?: string;
  style?: CSSProperties;
}>;

function visibleColumns(template: LogTemplateRecord | null): LogTemplateColumn[] {
  if (!template) return [];
  return template.config.columnData.filter(
    (column) => !column.hidden && column.visibility !== false
  );
}

function columnWidthPct(columns: LogTemplateColumn[]): number[] {
  const widths = columns.map((column) => {
    const raw = Number(column.width);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  });
  const total = widths.reduce((sum, value) => sum + value, 0) || 1;
  return widths.map((value) => (value / total) * 100);
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
): "depth" | "graphic" | "well_diagram" | "chart" | "origin" | "classification" | "description" | "consistency" | "moisture" | "remarks" | "method" | "text" {
  const source = columnSource(column);
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase();
  const type = column.column_type;

  if (type === "scale" || source.includes("depth") || label.includes("depth")) return "depth";
  if (type === "graphic" && (source.includes("well") || label.includes("well"))) {
    return "well_diagram";
  }
  if (type === "graphic" || label.includes("graphic")) return "graphic";
  if (type === "chart" || source.includes("dcp") || label.includes("dcp")) return "chart";
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
  const axisMax = Number.isFinite(axisMaxRaw) && axisMaxRaw > axisMin ? axisMaxRaw : 25;
  const axisStepRaw = Number(series?.axis_units_minor ?? column.axis_units_minor ?? 5);
  const axisStep = Number.isFinite(axisStepRaw) && axisStepRaw > 0 ? axisStepRaw : 5;
  const axisRange = axisMax - axisMin || 1;

  const ticks: number[] = [];
  for (let value = axisMin; value <= axisMax + 1e-6; value += axisStep) {
    ticks.push(Math.round(value * 100) / 100);
  }

  return { ticks, axisMin, axisMax, axisRange };
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

function isDcpGraphColumn(column: LogTemplateColumn): boolean {
  if (column.column_type === "chart") return true;
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase();
  return label.includes("dcp graph") || label.includes("dcp");
}

function isMethodDcpDividerPair(
  column: LogTemplateColumn,
  nextColumn: LogTemplateColumn | null
): boolean {
  if (!nextColumn) return false;
  return isDrillingMethodColumn(column) && isDcpGraphColumn(nextColumn);
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

function HfSectionGrid({
  section,
  tokenContext,
  companyLogoUrl,
  variant,
}: {
  section: HfGridSection;
  tokenContext: Record<string, string>;
  companyLogoUrl?: string | null;
  variant: "header" | "footer";
}) {
  if (!section.enabled || section.rows < 1 || section.cols < 1) return null;

  const colTemplate = section.columnWidths
    .map((weight) => `${Math.max(weight, 0.01) * 100}fr`)
    .join(" ");
  const heightPx = Math.max(28, mmToPx(section.heightMm || 20));

  return (
    <div
      className={`log-report-composed__hf-grid log-report-composed__hf-grid--${variant}`}
      style={{
        gridTemplateColumns: colTemplate,
        gridTemplateRows: `repeat(${section.rows}, minmax(0, 1fr))`,
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
              fontFamily: cell.fontFamily || "inherit",
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
                  ? "center"
                  : cell.textAlign === "center"
                    ? "center"
                    : cell.textAlign === "right"
                      ? "flex-end"
                      : "stretch",
              padding: cell.type === "image" ? cell.padding ?? 6 : cell.padding ?? 4,
              // Header uses row-gap for horizontal rules only (no cell box outlines).
              // Footer still honors explicit cell border flags.
              borderStyle: cell.borderStyle || "solid",
              borderColor: cell.borderColor || "#000",
              borderWidth: 0,
              borderTopWidth:
                variant === "header"
                  ? 0
                  : cell.borderTop
                    ? cell.borderWidth || 1
                    : 0,
              borderRightWidth:
                variant === "header"
                  ? 0
                  : cell.borderRight
                    ? cell.borderWidth || 1
                    : 0,
              borderBottomWidth:
                variant === "header"
                  ? 0
                  : cell.borderBottom
                    ? cell.borderWidth || 1
                    : 0,
              borderLeftWidth:
                variant === "header"
                  ? 0
                  : cell.borderLeft
                    ? cell.borderWidth || 1
                    : 0,
            }}
          >
            {cell.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt=""
                className="log-report-composed__hf-image"
                style={{
                  objectFit:
                    cell.imageFit === "cover"
                      ? "cover"
                      : cell.imageFit === "fill"
                        ? "fill"
                        : "contain",
                }}
              />
            ) : null}
            {cell.type === "text" ? (
              <span className="log-report-composed__hf-text">{resolvedText}</span>
            ) : null}
            {cell.type === "legend" ? (
              <span className="log-report-composed__hf-legend">Legend</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DcpChart({
  column,
  points,
  pageMetres,
}: {
  column: LogTemplateColumn;
  points: DcpPoint[];
  pageMetres: number;
}) {
  const { ticks, axisMin, axisRange } = buildDcpAxisTicks(column);
  const series = column.chart_data?.[0];
  const symbolColor = String(series?.symbol_color ?? series?.line_color ?? "#000");

  return (
    <div className="log-report-composed__dcp">
      <div className="log-report-composed__dcp-plot">
        {ticks.map((tick) => (
          <span
            key={`grid-${tick}`}
            className="log-report-composed__dcp-gridline"
            style={{ left: `${((tick - axisMin) / axisRange) * 100}%` }}
          />
        ))}
        {(() => {
          const visiblePoints = points.filter(
            (point) => pageMetres > 0 && point.depthM <= pageMetres
          );
          // A lone reading renders as a tiny speck otherwise; extend it into a
          // visible stem so a single-entry DCP test doesn't look like nothing.
          const isSingleEntry = visiblePoints.length === 1;

          return visiblePoints.map((point, index) => {
            const left = `${Math.min(100, Math.max(0, ((point.blows - axisMin) / axisRange) * 100))}%`;
            const top = `${Math.min(100, Math.max(0, (point.depthM / pageMetres) * 100))}%`;
            return (
              <span key={`${point.depthM}-${index}`}>
                {isSingleEntry ? (
                  <span
                    className="log-report-composed__dcp-single-stem"
                    style={{ left, top, background: symbolColor }}
                  />
                ) : null}
                <span
                  className="log-report-composed__dcp-dot"
                  style={{ left, top, background: symbolColor }}
                />
              </span>
            );
          });
        })()}
      </div>
    </div>
  );
}

function GraphicHatch({ stratum }: { stratum: PreviewStratum }) {
  if (stratum.graphicUrl) {
    return (
      <div
        className="log-report-composed__hatch log-report-composed__hatch--image"
        style={{
          backgroundImage: `url(${stratum.graphicUrl})`,
          backgroundColor: stratum.fillOverrideColor || undefined,
        }}
      >
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

const METRES_TO_FEET = 3.28084;

function isFeetDepthColumn(column: LogTemplateColumn): boolean {
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase();
  return label.includes("(ft)") || label.includes("_ft") || label.includes(" ft");
}

function DepthTicks({
  column,
  pageMetres,
}: {
  column: LogTemplateColumn;
  pageMetres: number;
}) {
  const toDisplayUnit = isFeetDepthColumn(column)
    ? (metres: number) => metres * METRES_TO_FEET
    : (metres: number) => metres;

  const stepRaw = Number(column.majorStep ?? 1);
  const step = Number.isFinite(stepRaw) && stepRaw > 0 ? stepRaw : 1;

  const ticks: number[] = [];
  for (let value = step; value < pageMetres - 1e-6; value += step) {
    ticks.push(Math.round(value * 1000) / 1000);
  }

  return (
    <>
      {ticks.map((tick) => (
        <span
          key={tick}
          className="log-report-composed__depth-tick-major"
          style={{ top: `${(tick / pageMetres) * 100}%` }}
        >
          {toDisplayUnit(tick).toFixed(1)}
        </span>
      ))}
    </>
  );
}

function stratumCellContent(
  kind: ReturnType<typeof columnKind>,
  column: LogTemplateColumn,
  stratum: PreviewStratum
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
      return <GraphicHatch stratum={stratum} />;
    case "chart":
      // Full-height DCP lives on the strata grid backdrop.
      return null;
    case "origin":
      return stratum.origin;
    case "classification":
      return stratum.classification;
    case "description":
      return stratum.description;
    case "consistency":
      return stratum.consistency;
    case "moisture":
      return stratum.moisture;
    case "remarks":
      return stratum.remarks;
    case "method":
      return "";
    default:
      return "";
  }
}

function ContentFirstRow({
  columns,
  dcpColumn,
}: {
  columns: LogTemplateColumn[];
  dcpColumn: LogTemplateColumn | null;
}) {
  const dcpAxis = dcpColumn ? buildDcpAxisTicks(dcpColumn) : null;

  return (
    <div
      className="log-report-composed__content-first-row"
      style={{ gridTemplateColumns: columnWidthPct(columns).map((pct) => `${pct}%`).join(" ") }}
    >
      {columns.map((column, index) => {
        const kind = columnKind(column);
        const borderClass = contentBandBorderClass(
          column,
          columns[index + 1] ?? null,
          columns[index - 1] ?? null
        );
        const showDcpScale = dcpColumn != null && column.code === dcpColumn.code;

        return (
          <div
            key={`content-first-${column.code}`}
            className={[
              "log-report-composed__content-first-cell",
              `is-${kind}`,
              borderClass,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {showDcpScale && dcpAxis ? (
              <div className="log-report-composed__dcp-scale">
                {dcpAxis.ticks.map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function LogBody({
  columns,
  form,
  metresPerPage,
  subsurfaceLayers,
  dcpPoints,
}: {
  columns: LogTemplateColumn[];
  form: LogFormState;
  metresPerPage: string;
  subsurfaceLayers?: PreviewStratum[] | null;
  dcpPoints?: DcpPoint[] | null;
}) {
  const widthPcts = columnWidthPct(columns);
  const metres = Number(metresPerPage);
  const configuredMetres = Number.isFinite(metres) && metres > 0 ? metres : 2;
  const strata = useMemo(() => {
    if (subsurfaceLayers && subsurfaceLayers.length > 0) return subsurfaceLayers;
    // Empty layers → empty body (no demo filler once the subsurface module is live).
    if (subsurfaceLayers) return [];
    return buildPreviewStrata(form);
  }, [form, subsurfaceLayers]);
  const refusal = useMemo(() => buildRefusalText(form), [form]);
  const endDepth = Number(form.endDepth);
  const deepest = strata.reduce(
    (max, stratum) => Math.max(max, stratum.toDepth),
    Number.isFinite(endDepth) && endDepth > 0 ? endDepth : 0
  );
  // Full body height = metres-per-page scale; stretch if the hole is deeper.
  const pageMetres = Math.max(configuredMetres, deepest > 0 ? deepest : configuredMetres);

  if (columns.length === 0) {
    return (
      <div className="log-report-composed__body-empty">
        Select a log template to preview columns.
      </div>
    );
  }

  const gridCols = widthPcts.map((pct) => `${pct}%`).join(" ");
  const dcpColumn = columns.find((column) => isDcpGraphColumn(column)) ?? null;

  return (
    <div className="log-report-composed__body">
      <div className="log-report-composed__col-head" style={{ gridTemplateColumns: gridCols }}>
        {columns.map((column, index) => {
          const vertical = Boolean(column.name_vertical || column.vertical_text);
          const borderClass = contentBandBorderClass(
            column,
            columns[index + 1] ?? null,
            columns[index - 1] ?? null
          );
          return (
            <div
              key={column.code}
              className={[
                "log-report-composed__col-title",
                vertical ? "is-vertical" : "",
                borderClass,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span
                className={`log-report-composed__col-title-text${vertical ? " is-vertical" : ""}`}
              >
                {column.text || column.code}
              </span>
            </div>
          );
        })}
      </div>

      <ContentFirstRow columns={columns} dcpColumn={dcpColumn} />

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
            return (
              <div
                key={`grid-${column.code}`}
                className={[
                  "log-report-composed__strata-grid-cell",
                  `is-${kind}`,
                  dividerClass,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {kind === "chart" ? (
                  <DcpChart column={column} points={dcpPoints ?? []} pageMetres={pageMetres} />
                ) : null}
                {kind === "depth" ? (
                  <>
                    <span className="log-report-composed__depth-rail is-full" aria-hidden="true" />
                    <DepthTicks column={column} pageMetres={pageMetres} />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>

        {strata.map((stratum) => {
          const topPct = Math.max(0, (stratum.fromDepth / pageMetres) * 100);
          const heightPct = Math.max(
            0.8,
            ((stratum.toDepth - stratum.fromDepth) / pageMetres) * 100
          );
          return (
            <div
              key={`${stratum.fromDepth}-${stratum.toDepth}`}
              className="log-report-composed__stratum"
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
                return (
                  <div
                    key={`${column.code}-${stratum.fromDepth}`}
                    className={[
                      "log-report-composed__stratum-cell",
                      `is-${kind}`,
                      dividerClass,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {stratumCellContent(kind, column, stratum)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {refusal ? (
        <div className="log-report-composed__refusal-row" style={{ gridTemplateColumns: gridCols }}>
          {columns.map((column) => {
            const kind = columnKind(column);
            return (
              <div key={`refusal-${column.code}`} className="log-report-composed__refusal-cell">
                {kind === "description" ? refusal : null}
              </div>
            );
          })}
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

    const tokenContext = useMemo(
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

    const columns = useMemo(() => visibleColumns(logTemplate), [logTemplate]);
    const pageWidth = reportPageWidthPx(selection.pageSize, selection.orientation);
    const pageHeight = reportPageHeightPx(selection.pageSize, selection.orientation);

    return (
      <article
        ref={ref}
        className={`log-report-composed${className ? ` ${className}` : ""}`}
        style={{ width: pageWidth, height: pageHeight, minHeight: pageHeight, ...style }}
        data-orientation={selection.orientation}
        data-page-size={selection.pageSize}
      >
        {headerSection ? (
          <HfSectionGrid
            section={headerSection}
            tokenContext={tokenContext}
            companyLogoUrl={companyLogoUrl}
            variant="header"
          />
        ) : (
          <div className="log-report-composed__placeholder">No header template selected</div>
        )}

        <LogBody
          columns={columns}
          form={form}
          metresPerPage={selection.metresPerPage}
          subsurfaceLayers={subsurfaceLayers}
          dcpPoints={dcpPoints}
        />

        {footerSection ? (
          <HfSectionGrid
            section={footerSection}
            tokenContext={tokenContext}
            companyLogoUrl={companyLogoUrl}
            variant="footer"
          />
        ) : (
          <div className="log-report-composed__placeholder">No footer template selected</div>
        )}
      </article>
    );
  }
);

/** Styles injected into print / new-tab preview documents. */
export const LOG_REPORT_COMPOSED_PRINT_STYLES = `
  body { margin: 12px; font-family: Arial, Helvetica, sans-serif; color: #000; background: #e5e7eb; }
  .log-report-composed {
    margin: 0 auto;
    background: #fff;
    border: 1.5px solid #000;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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
    align-items: center;
    justify-content: center;
  }
  .log-report-composed__hf-image {
    display: block;
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    flex: 1 1 auto;
    min-height: 0;
  }
  .log-report-composed__logo-fallback {
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700; color: #6b7280; background: #f3f4f6;
  }
  .log-report-composed__hf-text { white-space: pre-wrap; line-height: 1.2; }
  .log-report-composed__hf-legend { font-size: 9px; color: #374151; }
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
    padding: 4px 2px;
    font-size: 8px;
    font-weight: 700;
    text-align: center;
    border-right: 1px solid #000;
    word-break: break-word;
    line-height: 1.15;
  }
  .log-report-composed__col-title:last-child { border-right: none; }
  .log-report-composed__col-title.has-content-band-divider,
  .log-report-composed__content-first-cell.has-content-band-divider {
    border-right: 1px solid #000;
  }
  .log-report-composed__col-title.has-method-dcp-divider,
  .log-report-composed__content-first-cell.has-method-dcp-divider,
  .log-report-composed__strata-grid-cell.has-method-dcp-divider,
  .log-report-composed__stratum-cell.has-method-dcp-divider {
    border-right: 1px solid #000 !important;
  }
  .log-report-composed__col-title.has-after-drilling-method,
  .log-report-composed__content-first-cell.has-after-drilling-method,
  .log-report-composed__strata-grid-cell.has-after-drilling-method,
  .log-report-composed__stratum-cell.has-after-drilling-method {
    border-left: 1px solid #000 !important;
  }
  .log-report-composed__col-title.is-vertical {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 64px;
    padding: 6px 2px;
  }
  .log-report-composed__col-title-text.is-vertical {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }
  .log-report-composed__content-first-row {
    display: grid;
    flex-shrink: 0;
    border-bottom: 1px solid #000;
    background: #fff;
  }
  .log-report-composed__content-first-cell {
    min-height: 14px;
    box-sizing: border-box;
    border-right: 1px solid #000;
  }
  .log-report-composed__content-first-cell:last-child { border-right: none; }
  .log-report-composed__content-first-cell .log-report-composed__dcp-scale {
    border-bottom: none;
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
  .log-report-composed__stratum {
    position: absolute;
    left: 0;
    right: 0;
    display: grid;
    width: 100%;
    box-sizing: border-box;
    border-bottom: 1px solid #000;
    z-index: 1;
    background: transparent;
  }
  .log-report-composed__stratum-cell {
    border-right: 1px solid #000;
    overflow: hidden;
    font-size: 8.5px;
    line-height: 1.2;
    padding: 2px 3px;
    box-sizing: border-box;
    min-height: 0;
    background: #fff;
  }
  .log-report-composed__stratum-cell:last-child { border-right: none; }
  .log-report-composed__stratum-cell.is-graphic,
  .log-report-composed__stratum-cell.is-well_diagram,
  .log-report-composed__stratum-cell.is-chart,
  .log-report-composed__stratum-cell.is-depth { padding: 0; }
  .log-report-composed__stratum-cell.is-chart { background: transparent; }
  .log-report-composed__stratum-cell.is-description { font-size: 8px; }
  .log-report-composed__depth-rail {
    position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #000;
  }
  .log-report-composed__depth-rail.is-full { z-index: 0; }
  .log-report-composed__depth-tick-major {
    position: absolute; left: 2px; font-size: 8px; line-height: 1;
    transform: translateY(-50%);
    z-index: 1;
  }
  .log-report-composed__hatch { width: 100%; height: 100%; min-height: 100%; position: relative; }
  .log-report-composed__hatch--image {
    background-repeat: repeat;
    background-size: 24px 24px;
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
    display: flex; justify-content: space-between; padding: 1px 2px;
    font-size: 7px; border-bottom: 1px solid #000; flex-shrink: 0;
  }
  .log-report-composed__dcp-plot {
    position: relative;
    flex: 1;
  }
  .log-report-composed__dcp-gridline {
    position: absolute; top: 0; bottom: 0; width: 0;
    border-left: 1px dotted #9ca3af;
  }
  .log-report-composed__dcp-dot {
    position: absolute; width: 4px; height: 4px; border-radius: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
  }
  .log-report-composed__dcp-single-stem {
    position: absolute; width: 2px; height: 28px;
    transform: translate(-50%, -50%);
  }
  .log-report-composed__refusal-row {
    display: grid;
    align-items: stretch;
    flex-shrink: 0;
    background: #fff; border-top: 1px solid #000; border-bottom: 1px solid #000;
  }
  .log-report-composed__refusal-cell {
    height: 100%;
    box-sizing: border-box;
    border-right: 1px solid #000;
    padding: 3px 6px; font-size: 8px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; text-align: center;
    min-width: 0;
  }
  .log-report-composed__refusal-cell:last-child { border-right: none; }
  @media print {
    body { margin: 0; background: #fff; }
    .log-report-composed { box-shadow: none; width: 100% !important; min-height: auto !important; }
  }
`;
