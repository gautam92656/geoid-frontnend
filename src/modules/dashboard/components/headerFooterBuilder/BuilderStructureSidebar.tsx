"use client";

import { useMemo, useState } from "react";
import { mmToPx } from "./builderGeometry";
import {
  cellAddress,
  cellTypeLabel,
  countVisibleCells,
  findCellAt,
  type CellSelection,
  type FrameSectionId,
  type GridSectionId,
  type HeaderFooterTemplateContent,
  type HfGridSection,
  type StructureSectionId,
  type StyleTargetId,
} from "./contentSchema";

type BuilderStructureSidebarProps = Readonly<{
  content: HeaderFooterTemplateContent;
  selection: CellSelection | null;
  styleSelection: StyleTargetId | null;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onSelectSection: (sectionId: StructureSectionId) => void;
  onSelectCell: (sectionId: GridSectionId, row: number, col: number) => void;
  onToggleVisibility: (sectionId: StructureSectionId) => void;
  onHeightPxChange: (sectionId: GridSectionId, heightPx: number) => void;
  onGridDimensionsChange: (sectionId: GridSectionId, rows: number, cols: number) => void;
  onFrameWidthPxChange: (frameId: FrameSectionId, widthPx: number) => void;
}>;

const STRUCTURE_ORDER: StructureSectionId[] = [
  "header",
  "leftFrame",
  "content",
  "rightFrame",
  "footer",
];

export function BuilderStructureSidebar({
  content,
  selection,
  styleSelection,
  collapsed,
  onCollapsedChange,
  onSelectSection,
  onSelectCell,
  onToggleVisibility,
  onHeightPxChange,
  onGridDimensionsChange,
  onFrameWidthPxChange,
}: BuilderStructureSidebarProps) {
  const [expandOverrides, setExpandOverrides] = useState<Record<string, boolean>>({});

  const isExpanded = (sectionId: StructureSectionId, expandable: boolean) => {
    if (!expandable) return false;
    const override = expandOverrides[sectionId];
    if (override !== undefined) return override;
    if (selection?.section === sectionId) return true;
    if (styleSelection === sectionId) return true;
    return sectionId === "header" && !selection && !styleSelection;
  };

  if (collapsed) {
    return (
      <aside className="hf-builder__sidebar hf-builder__sidebar--collapsed">
        <button
          type="button"
          className="hf-builder__sidebar-expand"
          onClick={() => onCollapsedChange(false)}
          aria-label="Expand structure"
        >
          <ChevronRightIcon />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hf-builder__sidebar">
      <div className="hf-builder__sidebar-head">
        <h3 className="hf-builder__sidebar-title">
          <StructureIcon />
          Structure
        </h3>
        <button
          type="button"
          className="hf-builder__icon-btn"
          onClick={() => onCollapsedChange(true)}
          aria-label="Collapse structure"
        >
          <ChevronLeftIcon />
        </button>
      </div>

      <div className="hf-builder__sidebar-body">
        {STRUCTURE_ORDER.map((sectionId) => {
          const meta = getSectionMeta(content, sectionId);
          const isGrid = sectionId === "header" || sectionId === "footer";
          const isFrame = sectionId === "leftFrame" || sectionId === "rightFrame";
          const isActive = isGrid
            ? selection?.section === sectionId
            : styleSelection === sectionId;
          const isOpen = isExpanded(sectionId, isGrid || isFrame);
          const grid = isGrid ? content.sections[sectionId] : null;
          const frame = isFrame ? content.sections[sectionId] : null;

          return (
            <div
              key={sectionId}
              className={`hf-builder__structure-item${meta.enabled ? "" : " is-disabled"}${isActive ? " is-active" : ""}`}
            >
              <div
                className="hf-builder__structure-row"
                role="button"
                tabIndex={0}
                onClick={() => onSelectSection(sectionId)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectSection(sectionId);
                  }
                }}
              >
                {isGrid || isFrame ? (
                  <button
                    type="button"
                    className="hf-builder__structure-chevron"
                    aria-label={isOpen ? "Collapse" : "Expand"}
                    onClick={(event) => {
                      event.stopPropagation();
                      setExpandOverrides((current) => ({
                        ...current,
                        [sectionId]: !isOpen,
                      }));
                    }}
                  >
                    {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  </button>
                ) : (
                  <span className="hf-builder__structure-spacer" />
                )}

                <SectionGlyph sectionId={sectionId} />
                <span className="hf-builder__structure-label">{meta.label}</span>
                {meta.cellCount !== null ? (
                  <span className="hf-builder__structure-badge">
                    {meta.cellCount} {meta.cellCount === 1 ? "cell" : "cells"}
                  </span>
                ) : null}

                {sectionId !== "content" ? (
                  <button
                    type="button"
                    className={`hf-builder__visibility${meta.enabled ? " is-on" : ""}`}
                    aria-label={meta.enabled ? "Hide section" : "Show section"}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleVisibility(sectionId);
                    }}
                  >
                    {meta.enabled ? <EyeIcon /> : <EyeOffIcon />}
                  </button>
                ) : null}
              </div>

              {isGrid && isOpen && grid ? (
                <SectionGridMaintenance
                  sectionId={sectionId}
                  section={grid}
                  selection={selection}
                  onSelectCell={onSelectCell}
                  onHeightPxChange={onHeightPxChange}
                  onGridDimensionsChange={onGridDimensionsChange}
                />
              ) : null}

              {isFrame && isOpen && frame ? (
                <div className="hf-builder__structure-detail">
                  <div className="hf-builder__structure-meta">
                    <label className="hf-builder__structure-meta-field">
                      <span>Width</span>
                      <div className="hf-builder__structure-input-wrap">
                        <input
                          type="number"
                          min={20}
                          max={400}
                          step={1}
                          value={Math.round(mmToPx(frame.widthMm))}
                          onChange={(event) =>
                            onFrameWidthPxChange(
                              sectionId as FrameSectionId,
                              Number(event.target.value) || Math.round(mmToPx(frame.widthMm))
                            )
                          }
                        />
                        <span>px</span>
                      </div>
                    </label>
                  </div>

                  <div className="hf-builder__cells-list">
                    <div className="hf-builder__cells-list-title">Cells</div>
                    <button
                      type="button"
                      className={`hf-builder__cells-item${styleSelection === sectionId ? " is-selected" : ""}`}
                      onClick={() => onSelectSection(sectionId)}
                    >
                      <span className="hf-builder__cells-type-icon" aria-hidden="true">
                        <CellTypeGlyph type={frame.cell.type} />
                      </span>
                      <span className="hf-builder__cells-address">A1</span>
                      <span className="hf-builder__cells-label">
                        {cellTypeLabel(frame.cell.type)}
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function SectionGridMaintenance({
  sectionId,
  section,
  selection,
  onSelectCell,
  onHeightPxChange,
  onGridDimensionsChange,
}: {
  sectionId: GridSectionId;
  section: HfGridSection;
  selection: CellSelection | null;
  onSelectCell: (sectionId: GridSectionId, row: number, col: number) => void;
  onHeightPxChange: (sectionId: GridSectionId, heightPx: number) => void;
  onGridDimensionsChange: (sectionId: GridSectionId, rows: number, cols: number) => void;
}) {
  const heightPx = Math.round(mmToPx(section.heightMm));
  const selected =
    selection?.section === sectionId ? selection.cells[selection.cells.length - 1] : null;

  const orderedCells = useMemo(
    () =>
      [...section.cells].sort(
        (a, b) => a.row - b.row || a.col - b.col
      ),
    [section.cells]
  );

  return (
    <div className="hf-builder__structure-detail">
      <div className="hf-builder__structure-meta">
        <label className="hf-builder__structure-meta-field">
          <span>Height</span>
          <div className="hf-builder__structure-input-wrap">
            <input
              type="number"
              min={40}
              max={800}
              step={1}
              value={heightPx}
              onChange={(event) =>
                onHeightPxChange(sectionId, Number(event.target.value) || heightPx)
              }
            />
            <span>px</span>
          </div>
        </label>
        <label className="hf-builder__structure-meta-field">
          <span>Grid</span>
          <div className="hf-builder__structure-grid-inputs">
            <input
              type="number"
              min={1}
              max={12}
              value={section.cols}
              aria-label="Columns"
              onChange={(event) =>
                onGridDimensionsChange(
                  sectionId,
                  section.rows,
                  Number(event.target.value) || section.cols
                )
              }
            />
            <span>×</span>
            <input
              type="number"
              min={1}
              max={12}
              value={section.rows}
              aria-label="Rows"
              onChange={(event) =>
                onGridDimensionsChange(
                  sectionId,
                  Number(event.target.value) || section.rows,
                  section.cols
                )
              }
            />
          </div>
        </label>
      </div>

      <div
        className="hf-builder__mini-grid"
        style={{
          gridTemplateColumns: `28px repeat(${section.cols}, minmax(28px, 1fr))`,
          gridTemplateRows: `22px repeat(${section.rows}, 28px)`,
        }}
      >
        <span className="hf-builder__mini-grid-corner" />
        {Array.from({ length: section.cols }, (_, col) => (
          <span key={`col-${col}`} className="hf-builder__mini-grid-axis">
            {String.fromCharCode(65 + (col % 26))}
          </span>
        ))}
        {Array.from({ length: section.rows }, (_, row) => (
          <FragmentRow
            key={`row-${row}`}
            row={row}
            cols={section.cols}
            selected={selected}
            onSelect={(col) => onSelectCell(sectionId, row, col)}
          />
        ))}
      </div>

      <div className="hf-builder__cells-list">
        <div className="hf-builder__cells-list-title">Cells</div>
        {orderedCells.map((cell) => {
          const address = cellAddress(cell.row, cell.col);
          const isSelected =
            selected?.row === cell.row && selected?.col === cell.col;
          const covered = findCellAt(section, cell.row, cell.col);
          return (
            <button
              key={`${cell.row}-${cell.col}`}
              type="button"
              className={`hf-builder__cells-item${isSelected ? " is-selected" : ""}`}
              onClick={() => onSelectCell(sectionId, cell.row, cell.col)}
            >
              <span className="hf-builder__cells-type-icon" aria-hidden="true">
                <CellTypeGlyph type={covered?.type ?? "empty"} />
              </span>
              <span className="hf-builder__cells-address">{address}</span>
              <span className="hf-builder__cells-label">
                {cellTypeLabel(covered?.type ?? "empty")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FragmentRow({
  row,
  cols,
  selected,
  onSelect,
}: {
  row: number;
  cols: number;
  selected: { row: number; col: number } | null;
  onSelect: (col: number) => void;
}) {
  return (
    <>
      <span className="hf-builder__mini-grid-axis">{row + 1}</span>
      {Array.from({ length: cols }, (_, col) => {
        const isSelected = selected?.row === row && selected?.col === col;
        return (
          <button
            key={`${row}-${col}`}
            type="button"
            className={`hf-builder__mini-grid-cell${isSelected ? " is-selected" : ""}`}
            aria-label={`Select ${cellAddress(row, col)}`}
            onClick={() => onSelect(col)}
          />
        );
      })}
    </>
  );
}

function getSectionMeta(content: HeaderFooterTemplateContent, sectionId: StructureSectionId) {
  switch (sectionId) {
    case "header":
      return {
        label: "Header",
        enabled: content.sections.header.enabled,
        cellCount: countVisibleCells(content.sections.header),
      };
    case "footer":
      return {
        label: "Footer",
        enabled: content.sections.footer.enabled,
        cellCount: countVisibleCells(content.sections.footer),
      };
    case "leftFrame":
      return {
        label: "Left Frame",
        enabled: content.sections.leftFrame.enabled,
        cellCount: 1,
      };
    case "rightFrame":
      return {
        label: "Right Frame",
        enabled: content.sections.rightFrame.enabled,
        cellCount: 1,
      };
    case "content":
      return { label: "Content Area", enabled: content.sections.content.enabled, cellCount: null };
  }
}

function CellTypeGlyph({ type }: { type: string }) {
  if (type === "text") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 6h14M12 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <text x="15" y="19" fontSize="8" fill="currentColor" fontWeight="700">
          t
        </text>
      </svg>
    );
  }
  if (type === "image") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="9" cy="10" r="1.5" fill="currentColor" />
        <path d="M4 16l5-4 4 3 3-2 4 3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "legend") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 7h14M5 12h14M5 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function SectionGlyph({ sectionId }: { sectionId: StructureSectionId }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="hf-builder__structure-glyph">
      {sectionId === "header" ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M3 9h18" stroke="currentColor" strokeWidth="2" />
        </>
      ) : null}
      {sectionId === "footer" ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M3 15h18" stroke="currentColor" strokeWidth="2" />
        </>
      ) : null}
      {sectionId === "leftFrame" ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
          <line x1="9" y1="4" x2="9" y2="20" stroke="currentColor" strokeWidth="2" />
        </>
      ) : null}
      {sectionId === "rightFrame" ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
          <line x1="15" y1="4" x2="15" y2="20" stroke="currentColor" strokeWidth="2" />
        </>
      ) : null}
      {sectionId === "content" ? (
        <>
          <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
          <rect x="7" y="4" width="10" height="16" fill="currentColor" opacity="0.25" />
          <line x1="7" y1="4" x2="7" y2="20" stroke="currentColor" strokeWidth="2" />
          <line x1="17" y1="4" x2="17" y2="20" stroke="currentColor" strokeWidth="2" />
        </>
      ) : null}
    </svg>
  );
}

function StructureIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M10.6 6.2A10.4 10.4 0 0 1 12 6c6.5 0 10 7 10 7a17.4 17.4 0 0 1-4.1 4.6M6.1 6.1A17.5 17.5 0 0 0 2 13s3.5 7 10 7a10.3 10.3 0 0 0 4.2-.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
