import type {
  FrameSectionId,
  GridSectionId,
  HeaderFooterTemplateContent,
  HfGridCell,
  HfGridSection,
  PageOrientation,
  PageSize,
  PreviewMode,
  StructureSectionId,
  StyleTargetId,
} from "./contentSchema";
import { createEmptyCell, findCellAt } from "./contentSchema";

function cloneContent(content: HeaderFooterTemplateContent): HeaderFooterTemplateContent {
  return structuredClone(content);
}

function rebuildCells(rows: number, cols: number, merges: HfGridCell[] = []): HfGridSection["cells"] {
  const occupied = new Set<string>();
  const cells: HfGridCell[] = [];

  for (const merge of merges) {
    if (
      merge.row < 0 ||
      merge.col < 0 ||
      merge.row + merge.rowSpan > rows ||
      merge.col + merge.colSpan > cols
    ) {
      continue;
    }
    let blocked = false;
    for (let r = merge.row; r < merge.row + merge.rowSpan; r += 1) {
      for (let c = merge.col; c < merge.col + merge.colSpan; c += 1) {
        if (occupied.has(`${r}:${c}`)) blocked = true;
      }
    }
    if (blocked) continue;
    for (let r = merge.row; r < merge.row + merge.rowSpan; r += 1) {
      for (let c = merge.col; c < merge.col + merge.colSpan; c += 1) {
        occupied.add(`${r}:${c}`);
      }
    }
    cells.push({ ...merge });
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (occupied.has(`${row}:${col}`)) continue;
      cells.push(createEmptyCell(row, col));
    }
  }

  return cells.sort((a, b) => a.row - b.row || a.col - b.col);
}

function withGridSection(
  content: HeaderFooterTemplateContent,
  sectionId: GridSectionId,
  updater: (section: HfGridSection) => HfGridSection
): HeaderFooterTemplateContent {
  const next = cloneContent(content);
  next.sections[sectionId] = updater(next.sections[sectionId]);
  return next;
}

function equalizeWidths(cols: number, previous?: number[]): number[] {
  if (previous && previous.length === cols) {
    const sum = previous.reduce((acc, value) => acc + value, 0);
    if (sum > 0) return previous.map((value) => value / sum);
  }
  return Array.from({ length: cols }, () => 1 / cols);
}

export function setTemplateNameContent(
  content: HeaderFooterTemplateContent,
  patch: Partial<HeaderFooterTemplateContent["page"]> & {
    zoom?: number;
    showGrid?: boolean;
    previewMode?: PreviewMode;
  }
): HeaderFooterTemplateContent {
  const next = cloneContent(content);
  if (patch.size) next.page.size = patch.size;
  if (patch.orientation) next.page.orientation = patch.orientation;
  if (patch.zoom !== undefined) next.ui.zoom = Math.min(200, Math.max(50, patch.zoom));
  if (patch.showGrid !== undefined) next.ui.showGrid = patch.showGrid;
  if (patch.previewMode) next.ui.previewMode = patch.previewMode;
  return next;
}

export function setPageSize(
  content: HeaderFooterTemplateContent,
  size: PageSize
): HeaderFooterTemplateContent {
  return setTemplateNameContent(content, { size });
}

export function setOrientation(
  content: HeaderFooterTemplateContent,
  orientation: PageOrientation
): HeaderFooterTemplateContent {
  return setTemplateNameContent(content, { orientation });
}

export function setZoom(
  content: HeaderFooterTemplateContent,
  zoom: number
): HeaderFooterTemplateContent {
  return setTemplateNameContent(content, { zoom });
}

export function setShowGrid(
  content: HeaderFooterTemplateContent,
  showGrid: boolean
): HeaderFooterTemplateContent {
  return setTemplateNameContent(content, { showGrid });
}

export function setPreviewMode(
  content: HeaderFooterTemplateContent,
  previewMode: PreviewMode
): HeaderFooterTemplateContent {
  return setTemplateNameContent(content, { previewMode });
}

export function toggleStructureSection(
  content: HeaderFooterTemplateContent,
  sectionId: StructureSectionId,
  enabled?: boolean
): HeaderFooterTemplateContent {
  const next = cloneContent(content);
  if (sectionId === "content") {
    next.sections.content.enabled = enabled ?? !next.sections.content.enabled;
    return next;
  }
  if (sectionId === "leftFrame" || sectionId === "rightFrame") {
    next.sections[sectionId].enabled = enabled ?? !next.sections[sectionId].enabled;
    return next;
  }
  next.sections[sectionId].enabled = enabled ?? !next.sections[sectionId].enabled;
  return next;
}

export function setFrameEnabled(
  content: HeaderFooterTemplateContent,
  frameId: FrameSectionId,
  enabled: boolean
): HeaderFooterTemplateContent {
  return toggleStructureSection(content, frameId, enabled);
}

export function setFrameWidth(
  content: HeaderFooterTemplateContent,
  frameId: FrameSectionId,
  widthMm: number
): HeaderFooterTemplateContent {
  const next = cloneContent(content);
  next.sections[frameId].widthMm = Math.max(5, Math.min(120, widthMm));
  return next;
}

export function updateStyleTargetCell(
  content: HeaderFooterTemplateContent,
  targetId: StyleTargetId,
  patch: Partial<Omit<HfGridCell, "row" | "col" | "rowSpan" | "colSpan">>
): HeaderFooterTemplateContent {
  const next = cloneContent(content);
  next.sections[targetId].cell = { ...next.sections[targetId].cell, ...patch };
  return next;
}

export function updateGridCell(
  content: HeaderFooterTemplateContent,
  sectionId: GridSectionId,
  row: number,
  col: number,
  patch: Partial<Omit<HfGridCell, "row" | "col" | "rowSpan" | "colSpan">>,
  options?: { syncAdjacentBorders?: boolean }
): HeaderFooterTemplateContent {
  return withGridSection(content, sectionId, (section) => {
    const cells = section.cells.map((cell) =>
      cell.row === row && cell.col === col ? { ...cell, ...patch } : cell
    );

    if (!options?.syncAdjacentBorders) {
      return { ...section, cells };
    }

    const target = cells.find((cell) => cell.row === row && cell.col === col);
    if (!target) return { ...section, cells };

    const synced = cells.map((cell) => {
      let next = cell;
      // Shared vertical edge: this cell's right ↔ neighbor's left
      if (
        cell.row === target.row &&
        cell.col === target.col + target.colSpan &&
        patch.borderRight !== undefined
      ) {
        next = { ...next, borderLeft: patch.borderRight };
      }
      if (
        target.row === cell.row &&
        target.col === cell.col + cell.colSpan &&
        patch.borderLeft !== undefined
      ) {
        next = { ...next, borderRight: patch.borderLeft };
      }
      // Shared horizontal edge: this cell's bottom ↔ neighbor's top
      if (
        cell.col === target.col &&
        cell.row === target.row + target.rowSpan &&
        patch.borderBottom !== undefined
      ) {
        next = { ...next, borderTop: patch.borderBottom };
      }
      if (
        target.col === cell.col &&
        target.row === cell.row + cell.rowSpan &&
        patch.borderTop !== undefined
      ) {
        next = { ...next, borderBottom: patch.borderTop };
      }
      return next;
    });

    return { ...section, cells: synced };
  });
}

export function insertRow(
  content: HeaderFooterTemplateContent,
  sectionId: GridSectionId,
  at: number,
  side: "above" | "below"
): HeaderFooterTemplateContent {
  return withGridSection(content, sectionId, (section) => {
    const insertAt = side === "above" ? at : at + 1;
    const cells = section.cells.map((cell) => {
        if (cell.row >= insertAt) {
          return { ...cell, row: cell.row + 1 };
        }
        if (cell.row < insertAt && cell.row + cell.rowSpan > insertAt) {
          return { ...cell, rowSpan: cell.rowSpan + 1 };
        }
        return cell;
      });

    const rows = section.rows + 1;
    return {
      ...section,
      rows,
      cells: rebuildCells(rows, section.cols, cells),
    };
  });
}

export function insertColumn(
  content: HeaderFooterTemplateContent,
  sectionId: GridSectionId,
  at: number,
  side: "left" | "right"
): HeaderFooterTemplateContent {
  return withGridSection(content, sectionId, (section) => {
    const insertAt = side === "left" ? at : at + 1;
    const cells = section.cells.map((cell) => {
        if (cell.col >= insertAt) {
          return { ...cell, col: cell.col + 1 };
        }
        if (cell.col < insertAt && cell.col + cell.colSpan > insertAt) {
          return { ...cell, colSpan: cell.colSpan + 1 };
        }
        return cell;
      });

    const cols = section.cols + 1;
    const widths = [...section.columnWidths];
    const insertWidth = 1 / cols;
    widths.splice(insertAt, 0, insertWidth);
    return {
      ...section,
      cols,
      columnWidths: equalizeWidths(cols, widths),
      cells: rebuildCells(section.rows, cols, cells),
    };
  });
}

export function deleteRow(
  content: HeaderFooterTemplateContent,
  sectionId: GridSectionId,
  row: number
): HeaderFooterTemplateContent {
  return withGridSection(content, sectionId, (section) => {
    if (section.rows <= 1) return section;
    const cells = section.cells.flatMap((cell) => {
        if (row >= cell.row && row < cell.row + cell.rowSpan) {
          if (cell.rowSpan <= 1) return [];
          return [{ ...cell, rowSpan: cell.rowSpan - 1 }];
        }
        if (cell.row > row) return [{ ...cell, row: cell.row - 1 }];
        return [cell];
      });

    const rows = section.rows - 1;
    return {
      ...section,
      rows,
      cells: rebuildCells(rows, section.cols, cells),
    };
  });
}

export function deleteColumn(
  content: HeaderFooterTemplateContent,
  sectionId: GridSectionId,
  col: number
): HeaderFooterTemplateContent {
  return withGridSection(content, sectionId, (section) => {
    if (section.cols <= 1) return section;
    const cells = section.cells.flatMap((cell) => {
        if (col >= cell.col && col < cell.col + cell.colSpan) {
          if (cell.colSpan <= 1) return [];
          return [{ ...cell, colSpan: cell.colSpan - 1 }];
        }
        if (cell.col > col) return [{ ...cell, col: cell.col - 1 }];
        return [cell];
      });

    const widths = section.columnWidths.filter((_, index) => index !== col);
    const cols = section.cols - 1;
    return {
      ...section,
      cols,
      columnWidths: equalizeWidths(cols, widths),
      cells: rebuildCells(section.rows, cols, cells),
    };
  });
}

export function canMergeSelection(
  section: HfGridSection,
  selected: Array<{ row: number; col: number }>
): boolean {
  if (selected.length < 2) return false;
  const origins = selected
    .map((point) => findCellAt(section, point.row, point.col))
    .filter((cell): cell is HfGridCell => Boolean(cell));
  const unique = new Map(origins.map((cell) => [`${cell.row}:${cell.col}`, cell]));
  if (unique.size < 2) return false;

  const cells = [...unique.values()];
  const minRow = Math.min(...cells.map((cell) => cell.row));
  const minCol = Math.min(...cells.map((cell) => cell.col));
  const maxRow = Math.max(...cells.map((cell) => cell.row + cell.rowSpan - 1));
  const maxCol = Math.max(...cells.map((cell) => cell.col + cell.colSpan - 1));

  const covered = new Set<string>();
  for (const cell of cells) {
    for (let r = cell.row; r < cell.row + cell.rowSpan; r += 1) {
      for (let c = cell.col; c < cell.col + cell.colSpan; c += 1) {
        covered.add(`${r}:${c}`);
      }
    }
  }

  for (let r = minRow; r <= maxRow; r += 1) {
    for (let c = minCol; c <= maxCol; c += 1) {
      if (!covered.has(`${r}:${c}`)) return false;
    }
  }
  return true;
}

export function mergeSelection(
  content: HeaderFooterTemplateContent,
  sectionId: GridSectionId,
  selected: Array<{ row: number; col: number }>
): HeaderFooterTemplateContent {
  return withGridSection(content, sectionId, (section) => {
    if (!canMergeSelection(section, selected)) return section;
    const origins = selected
      .map((point) => findCellAt(section, point.row, point.col))
      .filter((cell): cell is HfGridCell => Boolean(cell));
    const unique = [...new Map(origins.map((cell) => [`${cell.row}:${cell.col}`, cell])).values()];
    const minRow = Math.min(...unique.map((cell) => cell.row));
    const minCol = Math.min(...unique.map((cell) => cell.col));
    const maxRow = Math.max(...unique.map((cell) => cell.row + cell.rowSpan - 1));
    const maxCol = Math.max(...unique.map((cell) => cell.col + cell.colSpan - 1));

    const removeKeys = new Set(unique.map((cell) => `${cell.row}:${cell.col}`));
    const remainingCells = section.cells.filter(
      (cell) => !removeKeys.has(`${cell.row}:${cell.col}`)
    );
    const primaryCell =
      unique.find((cell) => cell.row === minRow && cell.col === minCol) ??
      createEmptyCell(minRow, minCol);
    remainingCells.push({
      ...primaryCell,
      row: minRow,
      col: minCol,
      rowSpan: maxRow - minRow + 1,
      colSpan: maxCol - minCol + 1,
    });

    return {
      ...section,
      cells: rebuildCells(section.rows, section.cols, remainingCells),
    };
  });
}

export function canUnmergeSelection(
  section: HfGridSection,
  selected: Array<{ row: number; col: number }>
): boolean {
  if (selected.length === 0) return false;
  return selected.some((point) => {
    const cell = findCellAt(section, point.row, point.col);
    return Boolean(cell && (cell.rowSpan > 1 || cell.colSpan > 1));
  });
}

export function unmergeSelection(
  content: HeaderFooterTemplateContent,
  sectionId: GridSectionId,
  selected: Array<{ row: number; col: number }>
): HeaderFooterTemplateContent {
  return withGridSection(content, sectionId, (section) => {
    if (!canUnmergeSelection(section, selected)) return section;
    const removeKeys = new Set<string>();
    for (const point of selected) {
      const cell = findCellAt(section, point.row, point.col);
      if (cell && (cell.rowSpan > 1 || cell.colSpan > 1)) {
        removeKeys.add(`${cell.row}:${cell.col}`);
      }
    }
    const remainingCells = section.cells.flatMap((cell) =>
      removeKeys.has(`${cell.row}:${cell.col}`)
        ? [{ ...cell, rowSpan: 1, colSpan: 1 }]
        : [cell]
    );
    return {
      ...section,
      cells: rebuildCells(section.rows, section.cols, remainingCells),
    };
  });
}

export function resizeColumnBoundary(
  content: HeaderFooterTemplateContent,
  sectionId: GridSectionId,
  boundaryIndex: number,
  deltaRatio: number
): HeaderFooterTemplateContent {
  return withGridSection(content, sectionId, (section) => {
    if (boundaryIndex <= 0 || boundaryIndex >= section.cols) return section;
    const widths = [...section.columnWidths];
    const left = boundaryIndex - 1;
    const right = boundaryIndex;
    const total = widths[left] + widths[right];
    const nextLeft = Math.min(total - 0.05, Math.max(0.05, widths[left] + deltaRatio));
    widths[left] = nextLeft;
    widths[right] = total - nextLeft;
    return { ...section, columnWidths: widths };
  });
}

export function setSectionHeight(
  content: HeaderFooterTemplateContent,
  sectionId: GridSectionId,
  heightMm: number
): HeaderFooterTemplateContent {
  return withGridSection(content, sectionId, (section) => ({
    ...section,
    heightMm: Math.max(10, heightMm),
  }));
}

export function setGridDimensions(
  content: HeaderFooterTemplateContent,
  sectionId: GridSectionId,
  rows: number,
  cols: number
): HeaderFooterTemplateContent {
  return withGridSection(content, sectionId, (section) => {
    const nextRows = Math.max(1, Math.min(12, Math.floor(rows)));
    const nextCols = Math.max(1, Math.min(12, Math.floor(cols)));
    const kept = section.cells.filter(
      (cell) =>
        cell.row < nextRows &&
        cell.col < nextCols &&
        cell.row + cell.rowSpan <= nextRows &&
        cell.col + cell.colSpan <= nextCols
    );
    return {
      ...section,
      rows: nextRows,
      cols: nextCols,
      columnWidths: equalizeWidths(nextCols, section.columnWidths.slice(0, nextCols)),
      cells: rebuildCells(nextRows, nextCols, kept),
    };
  });
}
