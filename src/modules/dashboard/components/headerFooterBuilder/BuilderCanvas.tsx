"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import type { Project } from "../../types/project";
import { BuilderDataPreview } from "./BuilderDataPreview";
import type {
  CellSelection,
  GridSectionId,
  HeaderFooterTemplateContent,
  HfGridCell,
  HfGridSection,
  StyleTargetId,
} from "./contentSchema";
import { findCellAt } from "./contentSchema";
import { defaultLegendColumnDefs, legendTypeLabel } from "./legendOptions";
import { useLegendPreviewItems } from "./useLegendPreviewItems";
import type { LegendPreviewItem } from "./legendDataResolver";
import {
  PAGE_MARGIN_PX,
  columnBoundaryXs,
  formatPageLabel,
  getPageDimensionsPx,
  mmToPx,
} from "./builderGeometry";
import { resolveRendererTokens } from "./rendererRegistry";
import { COMPANY_LOGO_PATH } from "../../data/branding";

const PROFILE_LOGO_FALLBACK = COMPANY_LOGO_PATH;

type BuilderCanvasProps = Readonly<{
  content: HeaderFooterTemplateContent;
  selection: CellSelection | null;
  selectedProject: Project | null;
  onProjectChange: (project: Project | null) => void;
  onSelectCell: (
    sectionId: GridSectionId,
    row: number,
    col: number,
    additive: boolean
  ) => void;
  onResizeBoundary: (sectionId: GridSectionId, boundaryIndex: number, deltaRatio: number) => void;
  onEnableFrame: (side: "leftFrame" | "rightFrame") => void;
  onRemoveSection: (sectionId: GridSectionId) => void;
  styleSelection: StyleTargetId | null;
  onSelectStyleTarget: (targetId: StyleTargetId) => void;
}>;

type Layout = {
  pageWidth: number;
  pageHeight: number;
  contentX: number;
  contentWidth: number;
  headerY: number;
  headerH: number;
  contentY: number;
  contentH: number;
  footerY: number;
  footerH: number;
  leftW: number;
  rightW: number;
};

type ProfilePreview = {
  displayName: string;
  email: string | null;
  companyName: string | null;
  logoUrl: string | null;
};

export function BuilderCanvas({
  content,
  selection,
  selectedProject,
  onProjectChange,
  onSelectCell,
  onResizeBoundary,
  onEnableFrame,
  onRemoveSection,
  styleSelection,
  onSelectStyleTarget,
}: BuilderCanvasProps) {
  const scale = content.ui.zoom / 100;
  const isLive = content.ui.previewMode === "live";
  const dragRef = useRef<{
    sectionId: GridSectionId;
    boundary: number;
    startX: number;
    totalWidth: number;
  } | null>(null);
  const [hoverBoundary, setHoverBoundary] = useState<{
    sectionId: GridSectionId;
    boundary: number;
  } | null>(null);

  const { user } = useAuth();
  const layout = useMemo(() => computeLayout(content), [content]);
  const label = formatPageLabel(content.page.size, content.page.orientation);
  const profilePreview = useMemo<ProfilePreview>(
    () => ({
      displayName:
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "User profile",
      email: user?.email?.trim() || null,
      companyName: user?.companyName?.trim() || null,
      // Match Account Settings "Your photo": uploaded logo, else Geoid default profile photo.
      logoUrl: user?.companyLogoUrl?.trim() || PROFILE_LOGO_FALLBACK,
    }),
    [user?.companyLogoUrl, user?.companyName, user?.email, user?.firstName, user?.lastName]
  );
  const previewContext = useMemo(
    () =>
      buildPreviewContext(
        selectedProject,
        profilePreview.logoUrl,
        profilePreview.companyName
      ),
    [selectedProject, profilePreview.companyName, profilePreview.logoUrl]
  );

  const handleBoundaryPointerDown = useCallback(
    (
      event: ReactPointerEvent,
      sectionId: GridSectionId,
      boundary: number,
      totalWidth: number
    ) => {
      event.preventDefault();
      event.stopPropagation();
      (event.target as Element).setPointerCapture?.(event.pointerId);
      dragRef.current = {
        sectionId,
        boundary,
        startX: event.clientX,
        totalWidth: totalWidth * scale,
      };
    },
    [scale]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      drag.startX = event.clientX;
      const deltaRatio = dx / drag.totalWidth;
      if (Math.abs(deltaRatio) < 0.0001) return;
      onResizeBoundary(drag.sectionId, drag.boundary, deltaRatio);
    },
    [onResizeBoundary]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div className="hf-builder__canvas-area">
      <BuilderDataPreview
        selectedProject={selectedProject}
        onProjectChange={onProjectChange}
      />

      <div className="hf-builder__page-label">{label}</div>

      <div
        className="hf-builder__page-wrap"
        style={{ width: layout.pageWidth * scale, height: layout.pageHeight * scale }}
      >
        <svg
          width={layout.pageWidth * scale}
          height={layout.pageHeight * scale}
          viewBox={`0 0 ${layout.pageWidth} ${layout.pageHeight}`}
          className="hf-builder__page-svg"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <rect x={0} y={0} width={layout.pageWidth} height={layout.pageHeight} fill="#ffffff" />

          {content.sections.header.enabled ? (
            <GridSectionGroup
              sectionId="header"
              section={content.sections.header}
              x={layout.contentX}
              y={layout.headerY}
              width={layout.contentWidth}
              height={layout.headerH}
              showGrid={content.ui.showGrid}
              isLive={isLive}
              selection={selection}
              hoverBoundary={hoverBoundary}
              onSelectCell={onSelectCell}
              onBoundaryDown={handleBoundaryPointerDown}
              onBoundaryHover={setHoverBoundary}
              onRemove={() => onRemoveSection("header")}
              previewContext={previewContext}
              profilePreview={profilePreview}
            />
          ) : null}

          {content.sections.content.enabled ? (
            <StyleTargetGroup
              targetId="content"
              cell={content.sections.content.cell}
              label="Content Area"
              rotateLabel={false}
              x={layout.contentX + layout.leftW}
              y={layout.contentY}
              width={Math.max(0, layout.contentWidth - layout.leftW - layout.rightW)}
              height={layout.contentH}
              defaultFill="#ffffff"
              isLive={isLive}
              selected={styleSelection === "content"}
              onSelect={onSelectStyleTarget}
              previewContext={previewContext}
              profilePreview={profilePreview}
            />
          ) : null}

          {content.sections.leftFrame.enabled ? (
            <StyleTargetGroup
              targetId="leftFrame"
              cell={content.sections.leftFrame.cell}
              label="Left frame"
              rotateLabel
              x={layout.contentX}
              y={layout.contentY}
              width={layout.leftW}
              height={layout.contentH}
              defaultFill="#f8fafc"
              isLive={isLive}
              selected={styleSelection === "leftFrame"}
              onSelect={onSelectStyleTarget}
              previewContext={previewContext}
              profilePreview={profilePreview}
            />
          ) : null}

          {content.sections.rightFrame.enabled ? (
            <StyleTargetGroup
              targetId="rightFrame"
              cell={content.sections.rightFrame.cell}
              label="Right frame"
              rotateLabel
              x={layout.contentX + layout.contentWidth - layout.rightW}
              y={layout.contentY}
              width={layout.rightW}
              height={layout.contentH}
              defaultFill="#f8fafc"
              isLive={isLive}
              selected={styleSelection === "rightFrame"}
              onSelect={onSelectStyleTarget}
              previewContext={previewContext}
              profilePreview={profilePreview}
            />
          ) : null}

          {content.sections.footer.enabled ? (
            <GridSectionGroup
              sectionId="footer"
              section={content.sections.footer}
              x={layout.contentX}
              y={layout.footerY}
              width={layout.contentWidth}
              height={layout.footerH}
              showGrid={content.ui.showGrid}
              isLive={isLive}
              selection={selection}
              hoverBoundary={hoverBoundary}
              onSelectCell={onSelectCell}
              onBoundaryDown={handleBoundaryPointerDown}
              onBoundaryHover={setHoverBoundary}
              onRemove={() => onRemoveSection("footer")}
              previewContext={previewContext}
              profilePreview={profilePreview}
            />
          ) : null}

          {!isLive && content.sections.content.enabled ? (
            <g className="hf-builder__sf-controls">
              {!content.sections.leftFrame.enabled ? (
                <g
                  style={{ cursor: "pointer" }}
                  onClick={() => onEnableFrame("leftFrame")}
                >
                  <rect
                    x={layout.contentX}
                    y={layout.contentY}
                    width={75}
                    height={layout.contentH}
                    fill="#f0f9ff"
                    stroke="#93c5fd"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    rx={3}
                  />
                  <text
                    x={layout.contentX + 37.5}
                    y={layout.contentY + layout.contentH / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#3b82f6"
                    fontSize="10"
                    transform={`rotate(-90 ${layout.contentX + 37.5} ${layout.contentY + layout.contentH / 2})`}
                  >
                    + Left frame
                  </text>
                </g>
              ) : null}
              {!content.sections.rightFrame.enabled ? (
                <g
                  style={{ cursor: "pointer" }}
                  onClick={() => onEnableFrame("rightFrame")}
                >
                  <rect
                    x={layout.contentX + layout.contentWidth - 75}
                    y={layout.contentY}
                    width={75}
                    height={layout.contentH}
                    fill="#f0f9ff"
                    stroke="#93c5fd"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    rx={3}
                  />
                  <text
                    x={layout.contentX + layout.contentWidth - 37.5}
                    y={layout.contentY + layout.contentH / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#3b82f6"
                    fontSize="10"
                    transform={`rotate(-90 ${layout.contentX + layout.contentWidth - 37.5} ${layout.contentY + layout.contentH / 2})`}
                  >
                    + Right frame
                  </text>
                </g>
              ) : null}
            </g>
          ) : null}

          {!isLive ? (
            <AxisLabels
              content={content}
              layout={layout}
            />
          ) : null}
        </svg>
      </div>
    </div>
  );
}

function computeLayout(content: HeaderFooterTemplateContent): Layout {
  const { width: pageWidth, height: pageHeight } = getPageDimensionsPx(
    content.page.size,
    content.page.orientation
  );
  const contentX = PAGE_MARGIN_PX;
  const contentWidth = pageWidth - PAGE_MARGIN_PX * 2;
  const headerH = content.sections.header.enabled
    ? mmToPx(content.sections.header.heightMm)
    : 0;
  const footerH = content.sections.footer.enabled
    ? mmToPx(content.sections.footer.heightMm)
    : 0;
  const headerY = PAGE_MARGIN_PX;
  const footerY = pageHeight - PAGE_MARGIN_PX - footerH;
  const contentY = headerY + headerH;
  const contentH = Math.max(40, footerY - contentY);
  const leftW = content.sections.leftFrame.enabled
    ? mmToPx(content.sections.leftFrame.widthMm)
    : 0;
  const rightW = content.sections.rightFrame.enabled
    ? mmToPx(content.sections.rightFrame.widthMm)
    : 0;

  return {
    pageWidth,
    pageHeight,
    contentX,
    contentWidth,
    headerY,
    headerH,
    contentY,
    contentH,
    footerY,
    footerH,
    leftW,
    rightW,
  };
}

type StyleTargetGroupProps = Readonly<{
  targetId: StyleTargetId;
  cell: HfGridCell;
  label: string;
  rotateLabel: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  defaultFill: string;
  isLive: boolean;
  selected: boolean;
  onSelect: (targetId: StyleTargetId) => void;
  previewContext: Record<string, string>;
  profilePreview: ProfilePreview;
}>;

function StyleTargetGroup({
  targetId,
  cell,
  label,
  rotateLabel,
  x,
  y,
  width,
  height,
  defaultFill,
  isLive,
  selected,
  onSelect,
  previewContext,
  profilePreview,
}: StyleTargetGroupProps) {
  if (width <= 0 || height <= 0) return null;

  const fill =
    cell.backgroundColor && cell.backgroundColor !== "transparent"
      ? cell.backgroundColor
      : defaultFill;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const showLabel = !isLive && cell.type === "empty";

  return (
    <g className={`hf-builder__style-target hf-builder__style-target--${targetId}`}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        style={{ pointerEvents: "all", cursor: "pointer" }}
        onClick={() => onSelect(targetId)}
      />

      <CellContent
        cell={cell}
        x={x}
        y={y}
        width={width}
        height={height}
        live={isLive}
        context={previewContext}
        profile={profilePreview}
      />

      {showLabel ? (
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#94a3b8"
          fontSize={targetId === "content" ? 14 : 11}
          style={{ pointerEvents: "none" }}
          transform={rotateLabel ? `rotate(-90 ${centerX} ${centerY})` : undefined}
        >
          {label}
        </text>
      ) : null}

      <CellBorders cell={cell} x={x} y={y} width={width} height={height} />

      {selected && !isLive ? (
        <>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="rgba(59, 130, 246, 0.12)"
            style={{ pointerEvents: "none" }}
          />
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1.25}
            style={{ pointerEvents: "none" }}
          />
        </>
      ) : null}
    </g>
  );
}

type GridSectionGroupProps = Readonly<{
  sectionId: GridSectionId;
  section: HfGridSection;
  x: number;
  y: number;
  width: number;
  height: number;
  showGrid: boolean;
  isLive: boolean;
  selection: CellSelection | null;
  hoverBoundary: { sectionId: GridSectionId; boundary: number } | null;
  onSelectCell: (
    sectionId: GridSectionId,
    row: number,
    col: number,
    additive: boolean
  ) => void;
  onBoundaryDown: (
    event: ReactPointerEvent,
    sectionId: GridSectionId,
    boundary: number,
    totalWidth: number
  ) => void;
  onBoundaryHover: (value: { sectionId: GridSectionId; boundary: number } | null) => void;
  onRemove: () => void;
  previewContext: Record<string, string>;
  profilePreview: ProfilePreview;
}>;

function GridSectionGroup({
  sectionId,
  section,
  x,
  y,
  width,
  height,
  showGrid,
  isLive,
  selection,
  hoverBoundary,
  onSelectCell,
  onBoundaryDown,
  onBoundaryHover,
  onRemove,
  previewContext,
  profilePreview,
}: GridSectionGroupProps) {
  const boundaries = columnBoundaryXs(x, width, section.columnWidths);
  const rowH = height / section.rows;

  return (
    <g className={`hf-builder__${sectionId}-section`}>
      <rect x={x} y={y} width={width} height={height} fill="#ffffff" />

      {section.cells.map((cell) => {
        const cellX = boundaries[cell.col];
        const cellW = boundaries[cell.col + cell.colSpan] - cellX;
        const cellY = y + cell.row * rowH;
        const cellH = rowH * cell.rowSpan;
        const selected =
          selection?.section === sectionId &&
          selection.cells.some((point) => {
            const origin = findCellAt(section, point.row, point.col);
            return origin?.row === cell.row && origin?.col === cell.col;
          });

        return (
          <g key={`${sectionId}-${cell.row}-${cell.col}`} className={`flat-cell-${cell.row}-${cell.col}`}>
            <rect
              x={cellX}
              y={cellY}
              width={cellW}
              height={cellH}
              fill={cell.backgroundColor || "transparent"}
              stroke="none"
              style={{ pointerEvents: "all", cursor: "pointer" }}
              onClick={(event) =>
                onSelectCell(sectionId, cell.row, cell.col, event.shiftKey)
              }
            />
            <CellContent
              cell={cell}
              x={cellX}
              y={cellY}
              width={cellW}
              height={cellH}
              live={isLive}
              context={previewContext}
              profile={profilePreview}
            />
            <CellBorders
              cell={cell}
              x={cellX}
              y={cellY}
              width={cellW}
              height={cellH}
            />
            {selected && !isLive ? (
              <rect
                x={cellX}
                y={cellY}
                width={cellW}
                height={cellH}
                fill="rgba(59, 130, 246, 0.12)"
                style={{ pointerEvents: "none" }}
              />
            ) : null}
            {(showGrid || selected) && !isLive ? (
              <rect
                x={cellX}
                y={cellY}
                width={cellW}
                height={cellH}
                fill="none"
                stroke={selected ? "#3b82f6" : "#e5e7eb"}
                strokeWidth={selected ? 1.25 : 0.5}
                style={{ pointerEvents: "none" }}
              />
            ) : null}
          </g>
        );
      })}

      {!isLive
        ? boundaries.slice(1, -1).map((bx, index) => {
            const boundary = index + 1;
            const active =
              hoverBoundary?.sectionId === sectionId && hoverBoundary.boundary === boundary;
            return (
              <g key={`${sectionId}-boundary-${boundary}`}>
                <line
                  x1={bx}
                  y1={y}
                  x2={bx}
                  y2={y + height}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  opacity={active ? 1 : 0}
                  style={{ pointerEvents: "none" }}
                />
                <rect
                  x={bx - 4}
                  y={y}
                  width={8}
                  height={height}
                  fill="transparent"
                  style={{ cursor: "col-resize" }}
                  onPointerDown={(event) => onBoundaryDown(event, sectionId, boundary, width)}
                  onPointerEnter={() => onBoundaryHover({ sectionId, boundary })}
                  onPointerLeave={() => onBoundaryHover(null)}
                />
              </g>
            );
          })
        : null}

      {!isLive ? (
        <g
          className="hf-builder__section-remove"
          style={{ cursor: "pointer" }}
          onClick={onRemove}
        >
          <rect x={x + width - 82} y={y + 7} width={76} height={22} rx={11} fill="#ffffff" stroke="#e5e7eb" />
          <text
            x={x + width - 44}
            y={y + 18}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fontWeight={600}
            fill="#ef4444"
          >
            ✕ Remove
          </text>
        </g>
      ) : null}
    </g>
  );
}

function AxisLabels({
  content,
  layout,
}: {
  content: HeaderFooterTemplateContent;
  layout: Layout;
}) {
  const labels: ReactNode[] = [];

  const pushGridLabels = (sectionId: GridSectionId, y: number, height: number) => {
    const section = content.sections[sectionId];
    if (!section.enabled) return;
    const boundaries = columnBoundaryXs(layout.contentX, layout.contentWidth, section.columnWidths);
    const rowH = height / section.rows;

    for (let row = 0; row < section.rows; row += 1) {
      labels.push(
        <text
          key={`${sectionId}-row-${row}`}
          x={PAGE_MARGIN_PX / 2}
          y={y + row * rowH + rowH / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fontWeight={700}
          fill="#94a3b8"
        >
          {row + 1}
        </text>
      );
    }

    for (let col = 0; col < section.cols; col += 1) {
      const letter = String.fromCharCode(65 + (col % 26));
      const cx = (boundaries[col] + boundaries[col + 1]) / 2;
      const ty = sectionId === "header" ? PAGE_MARGIN_PX / 2 : layout.pageHeight - PAGE_MARGIN_PX / 2;
      labels.push(
        <text
          key={`${sectionId}-col-${col}`}
          x={cx}
          y={ty}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fontWeight={700}
          fill="#94a3b8"
        >
          {letter}
        </text>
      );
    }
  };

  pushGridLabels("header", layout.headerY, layout.headerH);
  pushGridLabels("footer", layout.footerY, layout.footerH);

  return <g className="hf-builder__axis-labels" style={{ pointerEvents: "none" }}>{labels}</g>;
}

function CellContent({
  cell,
  x,
  y,
  width,
  height,
  live,
  context,
  profile,
}: {
  cell: HfGridSection["cells"][number];
  x: number;
  y: number;
  width: number;
  height: number;
  live: boolean;
  context: Record<string, string>;
  profile: ProfilePreview;
}) {
  const padding = cell.padding ?? 5;
  if (cell.type === "image") {
    const src = cell.imageSrc.trim();
    const isProfileLogo = !src || src.includes("{{company.logo}}");
    // Prefer live profile logo for profile-bound cells so canvas always mirrors auth state.
    const resolved = isProfileLogo
      ? profile.logoUrl || resolveRendererTokens(src || "{{company.logo}}", context).trim()
      : resolveRendererTokens(src, context).trim();
    const href = resolved || (src.includes("{{") ? "" : src);

    if (!href) {
      return (
        <ProfileLogoPlaceholder
          profile={profile}
          x={x + padding}
          y={y + padding}
          width={Math.max(0, width - padding * 2)}
          height={Math.max(0, height - padding * 2)}
        />
      );
    }
    const preserveAspectRatio =
      cell.imageFit === "fill"
        ? "none"
        : cell.imageFit === "cover"
          ? "xMidYMid slice"
          : "xMidYMid meet";
    return (
      <image
        href={href}
        x={x + padding}
        y={y + padding}
        width={Math.max(0, width - padding * 2)}
        height={Math.max(0, height - padding * 2)}
        preserveAspectRatio={preserveAspectRatio}
        style={{ pointerEvents: "none" }}
      />
    );
  }

  if (cell.type === "legend") {
    return (
      <LegendCellPreview
        cell={cell}
        x={x}
        y={y}
        width={width}
        height={height}
        padding={padding}
      />
    );
  }

  if (cell.type !== "text" || !cell.content) return null;
  const value = live ? resolveRendererTokens(cell.content, context) : cell.content;
  const justifyContent =
    cell.textAlign === "center"
      ? "center"
      : cell.textAlign === "right"
        ? "flex-end"
        : "flex-start";
  const alignItems =
    cell.verticalAlign === "middle"
      ? "center"
      : cell.verticalAlign === "bottom"
        ? "flex-end"
        : "flex-start";

  return (
    <foreignObject
      x={x + padding}
      y={y + padding}
      width={Math.max(0, width - padding * 2)}
      height={Math.max(0, height - padding * 2)}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent,
          alignItems,
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          color: cell.fontColor,
          fontFamily: cell.fontFamily,
          fontSize: cell.fontSize,
          fontWeight: cell.fontBold ? 700 : 400,
          fontStyle: cell.fontItalic ? "italic" : "normal",
          textDecoration: cell.fontUnderline ? "underline" : "none",
          textAlign: cell.textAlign,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
    </foreignObject>
  );
}

function CellBorders({
  cell,
  x,
  y,
  width,
  height,
}: {
  cell: HfGridSection["cells"][number];
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const strokeDasharray =
    cell.borderStyle === "dashed"
      ? "5 5"
      : cell.borderStyle === "dotted"
        ? "2 2"
        : undefined;
  const common = {
    stroke: cell.borderColor,
    strokeWidth: cell.borderWidth,
    strokeDasharray,
    style: { pointerEvents: "none" as const },
  };

  return (
    <>
      {cell.borderTop ? <line x1={x} y1={y} x2={x + width} y2={y} {...common} /> : null}
      {cell.borderRight ? (
        <line x1={x + width} y1={y} x2={x + width} y2={y + height} {...common} />
      ) : null}
      {cell.borderBottom ? (
        <line x1={x} y1={y + height} x2={x + width} y2={y + height} {...common} />
      ) : null}
      {cell.borderLeft ? <line x1={x} y1={y} x2={x} y2={y + height} {...common} /> : null}
    </>
  );
}

function LegendCellPreview({
  cell,
  x,
  y,
  width,
  height,
  padding,
}: {
  cell: HfGridCell;
  x: number;
  y: number;
  width: number;
  height: number;
  padding: number;
}) {
  const { items, loading, types } = useLegendPreviewItems(cell);
  const typeKey = types[0] || cell.content || "";
  const typeLabel = typeKey ? legendTypeLabel(typeKey) : "Select legend type…";
  const columnDefs =
    cell.legendColumnDefs?.length > 0 ? cell.legendColumnDefs : defaultLegendColumnDefs();
  const showGraphic = columnDefs.some((def) => def.content === "graphic");
  const showLabel = columnDefs.some((def) => def.content === "label");
  const maxRows =
    cell.legendMaxRows && cell.legendMaxRows > 0 ? cell.legendMaxRows : items.length || 1;
  const visibleItems = items.slice(0, Math.max(1, maxRows));
  const innerW = Math.max(0, width - padding * 2);
  const innerH = Math.max(0, height - padding * 2);
  const rowH =
    visibleItems.length > 0 ? Math.max(12, innerH / visibleItems.length) : innerH;
  const imgH = cell.legendImageHeightPx
    ? Math.min(cell.legendImageHeightPx, rowH - 2)
    : Math.max(10, rowH - 4);
  const labelAlign =
    cell.legendTextAlign === "center"
      ? "center"
      : cell.legendTextAlign === "right"
        ? "right"
        : "left";

  return (
    <foreignObject
      x={x + padding}
      y={y + padding}
      width={innerW}
      height={innerH}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          color: cell.fontColor,
          fontFamily: cell.fontFamily,
          fontSize: cell.fontSize || "9pt",
          lineHeight: 1.15,
        }}
      >
        {!typeKey ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontStyle: "italic",
              fontSize: "9pt",
              textAlign: "center",
              padding: 4,
            }}
          >
            — Select legend type —
          </div>
        ) : loading && items.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: "9pt",
            }}
          >
            Loading {typeLabel}…
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontStyle: "italic",
              fontSize: "9pt",
              textAlign: "center",
              padding: 4,
            }}
          >
            No {typeLabel} graphics
          </div>
        ) : (
          visibleItems.map((item) => (
            <LegendPreviewRow
              key={`${item.legendType ?? typeKey}:${item.label}`}
              item={item}
              height={rowH}
              imageHeight={imgH}
              showGraphic={showGraphic}
              showLabel={showLabel}
              labelAlign={labelAlign}
              fontBold={cell.fontBold}
              fontItalic={cell.fontItalic}
            />
          ))
        )}
      </div>
    </foreignObject>
  );
}

function LegendPreviewRow({
  item,
  height,
  imageHeight,
  showGraphic,
  showLabel,
  labelAlign,
  fontBold,
  fontItalic,
}: {
  item: LegendPreviewItem;
  height: number;
  imageHeight: number;
  showGraphic: boolean;
  showLabel: boolean;
  labelAlign: "left" | "center" | "right";
  fontBold: boolean;
  fontItalic: boolean;
}) {
  return (
    <div
      style={{
        height,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 2px",
        boxSizing: "border-box",
      }}
    >
      {showGraphic ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          style={{
            width: imageHeight,
            height: imageHeight,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
      ) : null}
      {showLabel ? (
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: labelAlign,
            fontWeight: fontBold ? 700 : 400,
            fontStyle: fontItalic ? "italic" : "normal",
          }}
        >
          {item.label}
        </span>
      ) : null}
    </div>
  );
}

function profileInitials(displayName: string, email: string | null): string {
  const parts = displayName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0] && parts[0] !== "User profile") {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "U";
}

function ProfileLogoPlaceholder({
  profile,
  x,
  y,
  width,
  height,
}: {
  profile: ProfilePreview;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const initials = profileInitials(profile.displayName, profile.email);
  const avatarSize = Math.max(22, Math.min(44, Math.min(width, height) * 0.45));

  return (
    <foreignObject x={x} y={y} width={width} height={height} style={{ pointerEvents: "none" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          padding: 4,
          boxSizing: "border-box",
          overflow: "hidden",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: "50%",
            background: "#e2e8f0",
            color: "#334155",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.max(10, avatarSize * 0.38),
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div
          style={{
            color: "#334155",
            fontSize: 10,
            fontWeight: 600,
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {profile.displayName}
        </div>
        {profile.companyName || profile.email ? (
          <div
            style={{
              color: "#94a3b8",
              fontSize: 9,
              textAlign: "center",
              lineHeight: 1.2,
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {profile.companyName || profile.email}
          </div>
        ) : null}
      </div>
    </foreignObject>
  );
}

function buildPreviewContext(
  project: Project | null,
  companyLogoUrl?: string | null,
  companyName?: string | null
): Record<string, string> {
  const context: Record<string, string> = {};

  const logo = companyLogoUrl?.trim() || PROFILE_LOGO_FALLBACK;
  if (logo) context["{{company.logo}}"] = logo;
  const name = companyName?.trim();
  if (name) context["{{company.name}}"] = name;

  // Always provide a date sample for footer previews
  context["{{date}}"] = new Date().toLocaleDateString();

  if (!project) return context;

  return {
    ...context,
    "{{project.id}}": String(project.id),
    "{{project.name}}": project.name,
    "{{project.number}}": project.projectNo,
    "{{project.client}}": project.client,
    "{{project.location}}": project.location || project.address,
    "{{location.easting}}": project.easting,
    "{{location.northing}}": project.northing,
    "{{location.lat}}": project.latitude,
    "{{location.lng}}": project.longitude,
  };
}
