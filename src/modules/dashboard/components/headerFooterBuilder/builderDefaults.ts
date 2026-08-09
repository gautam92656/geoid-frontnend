import type { HeaderFooterTemplateKind } from "../../types/headerFooterTemplate";
import {
  createEmptyCell,
  type HeaderFooterTemplateContent,
  type HfGridSection,
} from "./contentSchema";

function equalColumns(cols: number): number[] {
  return Array.from({ length: cols }, () => 1 / cols);
}

function buildGrid(rows: number, cols: number, heightMm: number, enabled: boolean): HfGridSection {
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push(createEmptyCell(row, col));
    }
  }

  return {
    enabled,
    heightMm,
    rows,
    cols,
    columnWidths: equalColumns(cols),
    cells,
  };
}

export function createDefaultHeaderFooterContent(
  _kind: HeaderFooterTemplateKind = "header"
): HeaderFooterTemplateContent {
  return {
    version: 1,
    renderer: {
      version: "0.1.28",
      source: "cdn",
    },
    page: {
      size: "A4",
      orientation: "landscape",
    },
    sections: {
      header: buildGrid(1, 3, 40, true),
      footer: buildGrid(1, 3, 26, true),
      leftFrame: { enabled: false, widthMm: 20, cell: createEmptyCell(0, 0) },
      rightFrame: { enabled: false, widthMm: 20, cell: createEmptyCell(0, 0) },
      content: { enabled: true, cell: createEmptyCell(0, 0) },
    },
    ui: {
      zoom: 100,
      showGrid: true,
      previewMode: "debug",
    },
  };
}
