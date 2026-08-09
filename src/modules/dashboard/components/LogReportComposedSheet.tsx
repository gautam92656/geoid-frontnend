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
): "depth" | "graphic" | "chart" | "origin" | "classification" | "description" | "consistency" | "moisture" | "remarks" | "method" | "text" {
  const source = columnSource(column);
  const label = `${column.text ?? ""} ${column.code ?? ""}`.toLowerCase();
  const type = column.column_type;

  if (type === "scale" || source.includes("depth") || label.includes("depth")) return "depth";
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
  if (source.includes("drill") || label.includes("drilling") || label.includes("method")) {
    return "method";
  }
  return "text";
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

function DcpChartStub() {
  return (
    <div className="log-report-composed__dcp">
      <div className="log-report-composed__dcp-scale">
        {[0, 5, 10, 15, 20, 25].map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <div className="log-report-composed__dcp-plot" />
    </div>
  );
}

function GraphicHatch({ hatch }: { hatch: PreviewStratum["hatch"] }) {
  return <div className={`log-report-composed__hatch log-report-composed__hatch--${hatch}`} />;
}

function DepthScale({ stratum }: { stratum: PreviewStratum }) {
  return (
    <div className="log-report-composed__depth">
      <span className="log-report-composed__depth-tick is-top">{stratum.fromDepth.toFixed(1)}</span>
      <span className="log-report-composed__depth-tick is-bottom">
        {stratum.toDepth.toFixed(1)}
      </span>
      <span className="log-report-composed__depth-rail" aria-hidden="true" />
    </div>
  );
}

function stratumCellContent(
  kind: ReturnType<typeof columnKind>,
  stratum: PreviewStratum
) {
  switch (kind) {
    case "depth":
      return <DepthScale stratum={stratum} />;
    case "graphic":
      return <GraphicHatch hatch={stratum.hatch} />;
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

function LogBody({
  columns,
  form,
  metresPerPage,
  subsurfaceLayers,
}: {
  columns: LogTemplateColumn[];
  form: LogFormState;
  metresPerPage: string;
  subsurfaceLayers?: PreviewStratum[] | null;
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
  const refusalTopPct =
    Number.isFinite(endDepth) && endDepth > 0
      ? Math.min(100, (endDepth / pageMetres) * 100)
      : Math.min(100, (deepest / pageMetres) * 100);

  if (columns.length === 0) {
    return (
      <div className="log-report-composed__body-empty">
        Select a log template to preview columns.
      </div>
    );
  }

  const gridCols = widthPcts.map((pct) => `${pct}%`).join(" ");

  return (
    <div className="log-report-composed__body">
      <div className="log-report-composed__col-head" style={{ gridTemplateColumns: gridCols }}>
        {columns.map((column) => {
          const vertical = Boolean(column.name_vertical || column.vertical_text);
          return (
            <div
              key={column.code}
              className={`log-report-composed__col-title${vertical ? " is-vertical" : ""}`}
            >
              {column.text || column.code}
            </div>
          );
        })}
      </div>

      <div className="log-report-composed__strata-wrap">
        {/* Full-height column rails so empty depth below the hole still shows the grid */}
        <div
          className="log-report-composed__strata-grid"
          style={{ gridTemplateColumns: gridCols }}
          aria-hidden="true"
        >
          {columns.map((column) => {
            const kind = columnKind(column);
            return (
              <div
                key={`grid-${column.code}`}
                className={`log-report-composed__strata-grid-cell is-${kind}`}
              >
                {kind === "chart" ? <DcpChartStub /> : null}
                {kind === "depth" ? (
                  <span className="log-report-composed__depth-rail is-full" aria-hidden="true" />
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
              {columns.map((column) => {
                const kind = columnKind(column);
                return (
                  <div
                    key={`${column.code}-${stratum.fromDepth}`}
                    className={`log-report-composed__stratum-cell is-${kind}`}
                  >
                    {stratumCellContent(kind, stratum)}
                  </div>
                );
              })}
            </div>
          );
        })}

        {refusal ? (
          <div
            className="log-report-composed__refusal"
            style={{ top: `${refusalTopPct}%` }}
          >
            {refusal}
          </div>
        ) : null}
      </div>
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
  .log-report-composed__col-title.is-vertical {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    min-height: 64px;
    padding: 6px 2px;
  }
  .log-report-composed__strata-wrap {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
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
  .log-report-composed__stratum-cell.is-chart,
  .log-report-composed__stratum-cell.is-depth { padding: 0; }
  .log-report-composed__stratum-cell.is-chart { background: transparent; }
  .log-report-composed__stratum-cell.is-description { font-size: 8px; }
  .log-report-composed__depth {
    position: relative; width: 100%; height: 100%; min-height: 100%;
  }
  .log-report-composed__depth-rail {
    position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #000;
  }
  .log-report-composed__depth-rail.is-full { z-index: 0; }
  .log-report-composed__depth-tick {
    position: absolute; left: 2px; font-size: 8px; line-height: 1;
  }
  .log-report-composed__depth-tick.is-top { top: 1px; }
  .log-report-composed__depth-tick.is-bottom { bottom: 1px; }
  .log-report-composed__hatch { width: 100%; height: 100%; min-height: 100%; }
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
    flex: 1;
    background:
      linear-gradient(to right, transparent 19.9%, #d1d5db 20% 20.2%, transparent 20.3%),
      linear-gradient(to right, transparent 39.9%, #d1d5db 40% 40.2%, transparent 40.3%),
      linear-gradient(to right, transparent 59.9%, #d1d5db 60% 60.2%, transparent 60.3%),
      linear-gradient(to right, transparent 79.9%, #d1d5db 80% 80.2%, transparent 80.3%);
  }
  .log-report-composed__refusal {
    position: absolute; left: 0; right: 0;
    transform: translateY(-50%);
    padding: 2px 6px; font-size: 8px; font-weight: 600;
    background: rgba(255,255,255,0.92); border-top: 1px solid #000; border-bottom: 1px solid #000;
    pointer-events: none;
    z-index: 2;
  }
  @media print {
    body { margin: 0; background: #fff; }
    .log-report-composed { box-shadow: none; width: 100% !important; min-height: auto !important; }
  }
`;
