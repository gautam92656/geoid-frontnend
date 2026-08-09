"use client";

import { useEffect, useRef, useState } from "react";
import { RedoIcon, UndoIcon } from "@/shared/components/ui";
import type {
  GridSectionId,
  HeaderFooterTemplateContent,
  PageOrientation,
  PageSize,
  PreviewMode,
} from "./contentSchema";

type BuilderToolbarProps = Readonly<{
  content: HeaderFooterTemplateContent;
  activeSection: GridSectionId | null;
  canUndo: boolean;
  canRedo: boolean;
  canMerge: boolean;
  canUnmerge: boolean;
  hasSelection: boolean;
  onToggleHeader: () => void;
  onToggleContent: () => void;
  onToggleFooter: () => void;
  onPageSize: (size: PageSize) => void;
  onOrientation: (orientation: PageOrientation) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onPreviewMode: (mode: PreviewMode) => void;
  onToggleGrid: () => void;
  onInsertRow: (side: "above" | "below") => void;
  onDeleteRow: () => void;
  onInsertColumn: (side: "left" | "right") => void;
  onDeleteColumn: () => void;
  onMerge: () => void;
  onUnmerge: () => void;
  onUndo: () => void;
  onRedo: () => void;
}>;

export function BuilderToolbar({
  content,
  activeSection,
  canUndo,
  canRedo,
  canMerge,
  canUnmerge,
  hasSelection,
  onToggleHeader,
  onToggleContent,
  onToggleFooter,
  onPageSize,
  onOrientation,
  onZoomOut,
  onZoomIn,
  onPreviewMode,
  onToggleGrid,
  onInsertRow,
  onDeleteRow,
  onInsertColumn,
  onDeleteColumn,
  onMerge,
  onUnmerge,
  onUndo,
  onRedo,
}: BuilderToolbarProps) {
  const rowMenu = useMenu();
  const colMenu = useMenu();

  return (
    <div className="hf-builder__toolbar">
      <div className="hf-builder__toolbar-group">
        <label className="hf-builder__check">
          <input
            type="checkbox"
            checked={content.sections.header.enabled}
            onChange={onToggleHeader}
          />
          <span>Header</span>
        </label>
        <label className="hf-builder__check">
          <input
            type="checkbox"
            checked={content.sections.content.enabled}
            onChange={onToggleContent}
          />
          <span>Content</span>
        </label>
        <label className="hf-builder__check">
          <input
            type="checkbox"
            checked={content.sections.footer.enabled}
            onChange={onToggleFooter}
          />
          <span>Footer</span>
        </label>
      </div>

      <div className="hf-builder__divider" />

      <div className="hf-builder__toolbar-group">
        <select
          className="hf-builder__select"
          value={content.page.size}
          onChange={(event) => onPageSize(event.target.value as PageSize)}
          aria-label="Page size"
        >
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
          <option value="Legal">Legal</option>
        </select>
        <select
          className="hf-builder__select"
          value={content.page.orientation}
          onChange={(event) => onOrientation(event.target.value as PageOrientation)}
          aria-label="Orientation"
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </div>

      <div className="hf-builder__divider" />

      <div className="hf-builder__toolbar-group hf-builder__toolbar-group--zoom">
        <button
          type="button"
          className="hf-builder__icon-btn"
          onClick={onZoomOut}
          aria-label="Zoom out"
          disabled={content.ui.zoom <= 50}
        >
          −
        </button>
        <span className="hf-builder__zoom-label">{content.ui.zoom}%</span>
        <button
          type="button"
          className="hf-builder__icon-btn"
          onClick={onZoomIn}
          aria-label="Zoom in"
          disabled={content.ui.zoom >= 200}
        >
          +
        </button>
      </div>

      <div className="hf-builder__divider" />

      <div className="hf-builder__toolbar-group">
        <span className="hf-builder__muted">Preview:</span>
        <div className="hf-builder__toggle-group" role="radiogroup" aria-label="Preview mode">
          <button
            type="button"
            role="radio"
            aria-checked={content.ui.previewMode === "debug"}
            className={`hf-builder__toggle${content.ui.previewMode === "debug" ? " is-active" : ""}`}
            onClick={() => onPreviewMode("debug")}
          >
            Debug
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={content.ui.previewMode === "live"}
            className={`hf-builder__toggle${content.ui.previewMode === "live" ? " is-active" : ""}`}
            onClick={() => onPreviewMode("live")}
          >
            Live
          </button>
        </div>
      </div>

      <div className="hf-builder__divider" />

      <label className="hf-builder__check">
        <input type="checkbox" checked={content.ui.showGrid} onChange={onToggleGrid} />
        <GridIcon />
        <span>Grid</span>
      </label>

      <div className="hf-builder__divider" />

      <div className="hf-builder__toolbar-group">
        <div className="hf-builder__menu-wrap" ref={rowMenu.ref}>
          <button
            type="button"
            className="hf-builder__menu-btn"
            disabled={!activeSection || !hasSelection}
            onClick={rowMenu.toggle}
            aria-haspopup="menu"
            aria-expanded={rowMenu.open}
          >
            <RowsIcon />
            Row
            <ChevronIcon />
          </button>
          {rowMenu.open ? (
            <div className="hf-builder__menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { onInsertRow("above"); rowMenu.close(); }}>
                Insert above
              </button>
              <button type="button" role="menuitem" onClick={() => { onInsertRow("below"); rowMenu.close(); }}>
                Insert below
              </button>
              <button type="button" role="menuitem" onClick={() => { onDeleteRow(); rowMenu.close(); }}>
                Delete row
              </button>
            </div>
          ) : null}
        </div>

        <div className="hf-builder__menu-wrap" ref={colMenu.ref}>
          <button
            type="button"
            className="hf-builder__menu-btn"
            disabled={!activeSection || !hasSelection}
            onClick={colMenu.toggle}
            aria-haspopup="menu"
            aria-expanded={colMenu.open}
          >
            <ColsIcon />
            Column
            <ChevronIcon />
          </button>
          {colMenu.open ? (
            <div className="hf-builder__menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { onInsertColumn("left"); colMenu.close(); }}>
                Insert left
              </button>
              <button type="button" role="menuitem" onClick={() => { onInsertColumn("right"); colMenu.close(); }}>
                Insert right
              </button>
              <button type="button" role="menuitem" onClick={() => { onDeleteColumn(); colMenu.close(); }}>
                Delete column
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="hf-builder__divider" />

      <div className="hf-builder__toolbar-group">
        <button
          type="button"
          className="hf-builder__menu-btn"
          disabled={!canMerge}
          onClick={onMerge}
          title="Merge selected cells — Shift+click to select multiple"
        >
          <MergeIcon />
          Merge
        </button>
        <button
          type="button"
          className="hf-builder__menu-btn"
          disabled={!canUnmerge}
          onClick={onUnmerge}
          title="Split merged cell back into individual columns"
        >
          <UnmergeIcon />
          Unmerge
        </button>
      </div>

      <div className="hf-builder__toolbar-spacer" />

      <div className="hf-builder__toolbar-group">
        <button
          type="button"
          className="hf-builder__icon-btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="hf-builder__icon-btn"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
        >
          <RedoIcon />
        </button>
      </div>
    </div>
  );
}

function useMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return {
    open,
    ref,
    toggle: () => setOpen((current) => !current),
    close: () => setOpen(false),
  };
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4h16v16H4zM4 10h16M4 16h16M10 4v16M16 4v16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function RowsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ColsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 4v16M12 4v16M18 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MergeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="0.5" y="3" width="4.5" height="10" rx="1" stroke="currentColor" />
      <rect x="11" y="3" width="4.5" height="10" rx="1" stroke="currentColor" />
      <path d="M9 8H7M9 8L7.5 6.5M9 8L7.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7 8H9M7 8L8.5 6.5M7 8L8.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function UnmergeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="0.5" y="3" width="7" height="4.5" rx="1" stroke="currentColor" />
      <rect x="8.5" y="3" width="7" height="4.5" rx="1" stroke="currentColor" />
      <rect x="0.5" y="8.5" width="7" height="4.5" rx="1" stroke="currentColor" />
      <rect x="8.5" y="8.5" width="7" height="4.5" rx="1" stroke="currentColor" />
    </svg>
  );
}
