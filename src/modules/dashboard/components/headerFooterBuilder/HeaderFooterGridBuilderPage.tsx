"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageLoader } from "@/shared/components/ui";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import {
  createHeaderFooterTemplate,
  getHeaderFooterTemplate,
  updateHeaderFooterTemplate,
} from "../../services/headerFooterTemplateApi";
import type {
  HeaderFooterReportType,
  HeaderFooterTemplate,
  HeaderFooterTemplateKind,
} from "../../types/headerFooterTemplate";
import type { Project } from "../../types/project";
import { BuilderCanvas } from "./BuilderCanvas";
import { BuilderCellInspector } from "./BuilderCellInspector";
import type { CellStylePatch, InspectorTarget } from "./BuilderCellInspector";
import { BuilderHeaderBar } from "./BuilderHeaderBar";
import { BuilderStructureSidebar } from "./BuilderStructureSidebar";
import { BuilderToolbar } from "./BuilderToolbar";
import { createDefaultHeaderFooterContent } from "./builderDefaults";
import {
  createHistory,
  pushHistory,
  redoHistory,
  replacePresent,
  undoHistory,
  type HistoryState,
} from "./builderHistory";
import {
  canMergeSelection,
  canUnmergeSelection,
  deleteColumn,
  deleteRow,
  insertColumn,
  insertRow,
  mergeSelection,
  resizeColumnBoundary,
  setFrameEnabled,
  setFrameWidth,
  setGridDimensions,
  setOrientation,
  setPageSize,
  setPreviewMode,
  setSectionHeight,
  setShowGrid,
  setZoom,
  toggleStructureSection,
  unmergeSelection,
  updateGridCell,
  updateStyleTargetCell,
} from "./builderState";
import { mmToPx, pxToMm } from "./builderGeometry";
import {
  cellAddress,
  contentToJson,
  findCellAt,
  normalizeHeaderFooterContent,
  type CellSelection,
  type FrameSectionId,
  type GridSectionId,
  type HeaderFooterTemplateContent,
  type HfGridCell,
  type PageOrientation,
  type PageSize,
  type PreviewMode,
  type StructureSectionId,
  type StyleTargetId,
} from "./contentSchema";

const STYLE_PROPERTY_KEYS = [
  "backgroundColor",
  "fontColor",
  "fontFamily",
  "fontSize",
  "fontBold",
  "fontItalic",
  "fontUnderline",
  "textAlign",
  "verticalAlign",
  "padding",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "borderColor",
  "borderWidth",
  "borderStyle",
] as const satisfies ReadonlyArray<keyof HfGridCell>;

function pickCellStyle(cell: HfGridCell): CellStylePatch {
  const patch: Record<string, unknown> = {};
  for (const key of STYLE_PROPERTY_KEYS) {
    patch[key] = cell[key];
  }
  return patch as CellStylePatch;
}

const STYLE_TARGET_LABELS: Record<StyleTargetId, string> = {
  leftFrame: "Left Frame",
  rightFrame: "Right Frame",
  content: "Content Area",
};

const DASHBOARD_TEMPLATES_PATH = "/dashboard/settings/header-footer-templates";
const SUPER_ADMIN_HF_BASE = "/super-admin/log-templates/header-footer-templates";
const SUPER_ADMIN_TEMPLATES_LIST = "/super-admin/log-templates";

type HeaderFooterGridBuilderPageProps = Readonly<{
  templateId: string;
}>;

export function HeaderFooterGridBuilderPage(props: HeaderFooterGridBuilderPageProps) {
  return (
    <Suspense fallback={<PageLoader label="Loading template builder…" />}>
      <GridBuilder {...props} />
    </Suspense>
  );
}

function parseOwnerUserId(value: string | null): number | undefined {
  if (!value) return undefined;
  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

function GridBuilder({ templateId }: HeaderFooterGridBuilderPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ownerUserId = parseOwnerUserId(searchParams.get("userId"));
  const isSuperAdminBuilder = pathname.includes("/super-admin/");
  const templatesPath =
    ownerUserId != null
      ? isSuperAdminBuilder
        ? `${SUPER_ADMIN_TEMPLATES_LIST}?userId=${ownerUserId}&tab=header-footer`
        : `${DASHBOARD_TEMPLATES_PATH}?userId=${ownerUserId}`
      : DASHBOARD_TEMPLATES_PATH;
  const builderBasePath = isSuperAdminBuilder
    ? SUPER_ADMIN_HF_BASE
    : DASHBOARD_TEMPLATES_PATH;
  const isNew = templateId === "new";
  const numericId = Number(templateId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<HeaderFooterTemplate | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<HeaderFooterTemplateKind>("header");
  const [reportType, setReportType] = useState<HeaderFooterReportType | "">("");
  const [history, setHistory] = useState<HistoryState<HeaderFooterTemplateContent> | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<{ name: string; content: string } | null>(
    null
  );
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [styleSelection, setStyleSelection] = useState<StyleTargetId | null>(null);
  const [copiedStyle, setCopiedStyle] = useState<CellStylePatch | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const content = history?.present ?? null;

  const dirty = useMemo(() => {
    if (!history || !savedSnapshot) return false;
    return (
      name.trim() !== savedSnapshot.name ||
      JSON.stringify(history.present) !== savedSnapshot.content
    );
  }, [history, name, savedSnapshot]);

  const load = useCallback(async () => {
    if (isNew) {
      const kindParam = searchParams.get("kind") === "footer" ? "footer" : "header";
      const defaults = createDefaultHeaderFooterContent(kindParam);
      setTemplate(null);
      setKind(kindParam);
      setReportType("");
      setName("");
      setHistory(createHistory(defaults));
      setSavedSnapshot({ name: "", content: JSON.stringify(defaults) });
      setSelection(null);
      setLoading(false);
      return;
    }

    if (!Number.isFinite(numericId) || numericId <= 0) {
      router.replace(templatesPath);
      return;
    }

    setLoading(true);
    try {
      const data = await getHeaderFooterTemplate(numericId, ownerUserId);
      const defaults = createDefaultHeaderFooterContent(data.kind);
      const normalized = normalizeHeaderFooterContent(data.content, defaults);
      setTemplate(data);
      setName(data.name);
      setKind(data.kind);
      setReportType(data.reportType ?? "");
      setHistory(createHistory(normalized));
      setSavedSnapshot({ name: data.name, content: JSON.stringify(normalized) });
      setSelection(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_HEADER_FOOTER_TEMPLATES);
      router.replace(templatesPath);
    } finally {
      setLoading(false);
    }
  }, [isNew, numericId, ownerUserId, router, searchParams, templatesPath]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  /** Prefer latest history present so rapid sidebar/toolbar edits never overwrite each other. */
  const commitWith = useCallback(
    (
      updater: (present: HeaderFooterTemplateContent) => HeaderFooterTemplateContent,
      trackHistory = true
    ) => {
      setHistory((current) => {
        if (!current) return current;
        const next = updater(current.present);
        return trackHistory ? pushHistory(current, next) : replacePresent(current, next);
      });
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!history) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    if (isNew) {
      setSaving(true);
      try {
        const { data, message } = await createHeaderFooterTemplate(
          {
            name: trimmed,
            kind,
            reportType: reportType === "" ? null : reportType,
            content: contentToJson(history.present),
          },
          ownerUserId
        );
        showApiSuccess(message, API_MESSAGES.HEADER_FOOTER_TEMPLATE_ADDED);
        setSavedSnapshot({ name: trimmed, content: JSON.stringify(history.present) });
        const query = ownerUserId != null ? `?userId=${ownerUserId}` : "";
        router.replace(`${builderBasePath}/${data.id}/builder${query}`);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.ADD_HEADER_FOOTER_TEMPLATE);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!template) return;

    setSaving(true);
    try {
      const payloadContent = contentToJson(history.present);
      const { data, message } = await updateHeaderFooterTemplate(
        template.id,
        {
          name: trimmed,
          reportType: reportType === "" ? null : reportType,
          content: payloadContent,
        },
        ownerUserId
      );
      setTemplate(data);
      setName(data.name);
      const normalized = normalizeHeaderFooterContent(
        data.content,
        createDefaultHeaderFooterContent(data.kind)
      );
      setHistory(createHistory(normalized));
      setSavedSnapshot({ name: data.name, content: JSON.stringify(normalized) });
      showApiSuccess(message, API_MESSAGES.HEADER_FOOTER_TEMPLATE_UPDATED);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_HEADER_FOOTER_TEMPLATE);
    } finally {
      setSaving(false);
    }
  }, [builderBasePath, history, isNew, kind, name, ownerUserId, reportType, router, template]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const mod = event.ctrlKey || event.metaKey;
      if (mod && key === "s") {
        event.preventDefault();
        void handleSave();
      }
      if (mod && key === "z" && !event.shiftKey) {
        event.preventDefault();
        setHistory((current) => (current ? undoHistory(current) : current));
      }
      if (mod && (key === "y" || (key === "z" && event.shiftKey))) {
        event.preventDefault();
        setHistory((current) => (current ? redoHistory(current) : current));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  const activeSection = selection?.section ?? null;
  const activeGrid = content && activeSection ? content.sections[activeSection] : null;
  const canMerge = Boolean(
    activeGrid && selection && canMergeSelection(activeGrid, selection.cells)
  );
  const canUnmerge = Boolean(
    activeGrid && selection && canUnmergeSelection(activeGrid, selection.cells)
  );

  const handleSelectCell = useCallback(
    (sectionId: GridSectionId, row: number, col: number, additive: boolean) => {
      setStyleSelection(null);
      setSelection((current) => {
        if (!additive || !current || current.section !== sectionId) {
          return { section: sectionId, cells: [{ row, col }] };
        }
        const exists = current.cells.some((cell) => cell.row === row && cell.col === col);
        if (exists) {
          const nextCells = current.cells.filter((cell) => !(cell.row === row && cell.col === col));
          return nextCells.length ? { section: sectionId, cells: nextCells } : null;
        }
        return { section: sectionId, cells: [...current.cells, { row, col }] };
      });
    },
    []
  );

  const selectionAnchor = selection?.cells[selection.cells.length - 1] ?? null;
  const selectedCell =
    content && selection?.cells.length === 1
      ? findCellAt(
          content.sections[selection.section],
          selection.cells[0].row,
          selection.cells[0].col
        )
      : null;

  const handleSelectStyleTarget = useCallback((targetId: StyleTargetId) => {
    setSelection(null);
    setStyleSelection(targetId);
  }, []);

  const handleStyleChange = useCallback(
    (patch: CellStylePatch, options?: { syncAdjacentBorders?: boolean }) => {
      if (styleSelection) {
        commitWith((present) => updateStyleTargetCell(present, styleSelection, patch));
        return;
      }
      if (!selection || selection.cells.length !== 1) return;
      const anchor = selection.cells[0];
      commitWith((present) => {
        const cell = findCellAt(present.sections[selection.section], anchor.row, anchor.col);
        if (!cell) return present;
        return updateGridCell(present, selection.section, cell.row, cell.col, patch, options);
      });
    },
    [commitWith, selection, styleSelection]
  );

  const inspectorTarget: InspectorTarget | null = useMemo(() => {
    if (!content) return null;

    if (styleSelection) {
      const isContent = styleSelection === "content";
      const isFrame = !isContent;
      const section = content.sections[styleSelection];
      return {
        key: styleSelection,
        title: isContent ? "Content Area" : "Frame Properties",
        subtitle: isContent
          ? "Report body · borders & background"
          : `${STYLE_TARGET_LABELS[styleSelection]} · side frame`,
        mode: isContent ? "content" : "frame",
        cell: section.cell,
        // Content area is the report body — style only (no empty/text/image type).
        // Frames can hold text/image like Tablogs sideFrame.
        allowContentType: isFrame,
        syncBorders: false,
        widthPx: isFrame
          ? mmToPx((section as { widthMm: number }).widthMm)
          : undefined,
        onWidthPxChange: isFrame
          ? (widthPx: number) =>
              commitWith((present) =>
                setFrameWidth(present, styleSelection as FrameSectionId, pxToMm(widthPx))
              )
          : undefined,
      };
    }

    if (!selection || !selectedCell) return null;
    return {
      key: `${selection.section}:${selectedCell.row}:${selectedCell.col}`,
      title: "Cell Properties",
      subtitle: `${selection.section === "header" ? "Header" : "Footer"} · ${cellAddress(
        selectedCell.row,
        selectedCell.col
      )} · ${selectedCell.colSpan}×${selectedCell.rowSpan}`,
      mode: "cell",
      cell: selectedCell,
      allowContentType: true,
      syncBorders: true,
    };
  }, [commitWith, content, selectedCell, selection, styleSelection]);

  if (loading || !content || !history) {
    return <PageLoader label="Loading template builder…" />;
  }

  return (
    <div className="hf-builder">
      <BuilderHeaderBar
        name={name}
        kind={kind}
        reportType={reportType}
        isNew={isNew}
        dirty={dirty}
        saving={saving}
        onNameChange={setName}
        onReportTypeChange={setReportType}
        onBack={() => router.push(templatesPath)}
        onSave={() => void handleSave()}
      />

      <BuilderToolbar
        content={content}
        activeSection={activeSection}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        canMerge={canMerge}
        canUnmerge={canUnmerge}
        hasSelection={Boolean(selection?.cells.length)}
        onToggleHeader={() => commitWith((present) => toggleStructureSection(present, "header"))}
        onToggleContent={() => commitWith((present) => toggleStructureSection(present, "content"))}
        onToggleFooter={() => commitWith((present) => toggleStructureSection(present, "footer"))}
        onPageSize={(size: PageSize) => commitWith((present) => setPageSize(present, size))}
        onOrientation={(orientation: PageOrientation) =>
          commitWith((present) => setOrientation(present, orientation))
        }
        onZoomOut={() =>
          commitWith((present) => setZoom(present, present.ui.zoom - 10), false)
        }
        onZoomIn={() =>
          commitWith((present) => setZoom(present, present.ui.zoom + 10), false)
        }
        onPreviewMode={(mode: PreviewMode) =>
          commitWith((present) => setPreviewMode(present, mode), false)
        }
        onToggleGrid={() =>
          commitWith((present) => setShowGrid(present, !present.ui.showGrid), false)
        }
        onInsertRow={(side) => {
          if (!activeSection || !selectionAnchor) return;
          commitWith((present) =>
            insertRow(present, activeSection, selectionAnchor.row, side)
          );
        }}
        onDeleteRow={() => {
          if (!activeSection || !selectionAnchor) return;
          commitWith((present) => deleteRow(present, activeSection, selectionAnchor.row));
          setSelection(null);
        }}
        onInsertColumn={(side) => {
          if (!activeSection || !selectionAnchor) return;
          commitWith((present) =>
            insertColumn(present, activeSection, selectionAnchor.col, side)
          );
        }}
        onDeleteColumn={() => {
          if (!activeSection || !selectionAnchor) return;
          commitWith((present) => deleteColumn(present, activeSection, selectionAnchor.col));
          setSelection(null);
        }}
        onMerge={() => {
          if (!activeSection || !selection) return;
          commitWith((present) => mergeSelection(present, activeSection, selection.cells));
        }}
        onUnmerge={() => {
          if (!activeSection || !selection) return;
          commitWith((present) => unmergeSelection(present, activeSection, selection.cells));
        }}
        onUndo={() => setHistory((current) => (current ? undoHistory(current) : current))}
        onRedo={() => setHistory((current) => (current ? redoHistory(current) : current))}
      />

      <div className="hf-builder__main">
        <BuilderStructureSidebar
          content={content}
          selection={selection}
          styleSelection={styleSelection}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          onSelectSection={(sectionId: StructureSectionId) => {
            if (sectionId === "header" || sectionId === "footer") {
              setStyleSelection(null);
              setSelection({ section: sectionId, cells: [{ row: 0, col: 0 }] });
              return;
            }
            handleSelectStyleTarget(sectionId);
          }}
          onSelectCell={(sectionId, row, col) => handleSelectCell(sectionId, row, col, false)}
          onToggleVisibility={(sectionId) =>
            commitWith((present) => toggleStructureSection(present, sectionId))
          }
          onHeightPxChange={(sectionId, heightPx) =>
            commitWith((present) => setSectionHeight(present, sectionId, pxToMm(heightPx)))
          }
          onGridDimensionsChange={(sectionId, rows, cols) => {
            commitWith((present) => setGridDimensions(present, sectionId, rows, cols));
            setStyleSelection(null);
            setSelection({ section: sectionId, cells: [{ row: 0, col: 0 }] });
          }}
          onFrameWidthPxChange={(frameId, widthPx) =>
            commitWith((present) => setFrameWidth(present, frameId, pxToMm(widthPx)))
          }
        />

        <BuilderCellInspector
          target={inspectorTarget}
          copiedStyle={copiedStyle}
          onChange={handleStyleChange}
          onCopyStyle={() => {
            if (inspectorTarget) setCopiedStyle(pickCellStyle(inspectorTarget.cell));
          }}
          onPasteStyle={() => {
            if (copiedStyle) handleStyleChange(copiedStyle);
          }}
          onClose={() => {
            setSelection(null);
            setStyleSelection(null);
          }}
        />

        <BuilderCanvas
          content={content}
          selection={selection}
          selectedProject={selectedProject}
          onProjectChange={setSelectedProject}
          onSelectCell={handleSelectCell}
          onResizeBoundary={(sectionId, boundary, delta) =>
            commitWith(
              (present) => resizeColumnBoundary(present, sectionId, boundary, delta),
              false
            )
          }
          onEnableFrame={(side) => {
            commitWith((present) => setFrameEnabled(present, side, true));
            handleSelectStyleTarget(side);
          }}
          onRemoveSection={(sectionId) => {
            commitWith((present) => toggleStructureSection(present, sectionId, false));
            if (selection?.section === sectionId) setSelection(null);
          }}
          styleSelection={styleSelection}
          onSelectStyleTarget={handleSelectStyleTarget}
        />
      </div>
    </div>
  );
}
