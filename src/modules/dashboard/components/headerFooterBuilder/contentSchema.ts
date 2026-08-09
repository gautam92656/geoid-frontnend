import {
  defaultLegendColumnDefs,
  type HfLegendColumnContent,
  type HfLegendColumnDef,
  type HfLegendCustomItem,
  type HfLegendSort,
  type HfLegendVisibility,
} from "./legendOptions";

export type PageSize = "A4" | "Letter" | "Legal";
export type PageOrientation = "portrait" | "landscape";
export type PreviewMode = "debug" | "live";
export type GridSectionId = "header" | "footer";
export type FrameSectionId = "leftFrame" | "rightFrame";
export type StructureSectionId = GridSectionId | FrameSectionId | "content";
export type HfCellType = "empty" | "text" | "image" | "legend";
export type HfTextAlign = "left" | "center" | "right";
export type HfVerticalAlign = "top" | "middle" | "bottom";

export type {
  HfLegendColumnContent,
  HfLegendColumnDef,
  HfLegendCustomItem,
  HfLegendSort,
  HfLegendVisibility,
};

export type HfGridCell = {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  type: HfCellType;
  /** Text body, or primary legend type key when type === "legend". */
  content: string;
  imageSrc: string;
  imageFit: "contain" | "cover" | "fill";
  backgroundColor: string;
  fontColor: string;
  fontFamily: string;
  fontSize: string;
  fontBold: boolean;
  fontItalic: boolean;
  fontUnderline: boolean;
  textAlign: HfTextAlign;
  verticalAlign: HfVerticalAlign;
  padding: number;
  borderTop: boolean;
  borderRight: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  borderColor: string;
  borderWidth: number;
  borderStyle: "solid" | "dashed" | "dotted";
  /** Extra legend types for multi-type cells (primary remains `content`). */
  legendTypes: string[];
  legendVisibility: HfLegendVisibility;
  legendSort: HfLegendSort;
  legendColumnDefs: HfLegendColumnDef[];
  legendImageHeightPx: number | null;
  legendMaxRows: number | null;
  legendTextAlign: HfTextAlign;
  legendCustomLabels: string[];
  legendCustomItems: HfLegendCustomItem[];
};

export type HfGridSection = {
  enabled: boolean;
  heightMm: number;
  rows: number;
  cols: number;
  columnWidths: number[];
  cells: HfGridCell[];
};

export type HfFrameSection = {
  enabled: boolean;
  widthMm: number;
  cell: HfGridCell;
};

export type HfContentSection = {
  enabled: boolean;
  cell: HfGridCell;
};

export type StyleTargetId = FrameSectionId | "content";

/** Seed / provenance metadata — must survive normalize+save so backend never re-seeds over edits. */
export type HeaderFooterContentSource = {
  name?: string;
  tablogsType?: string;
  reportType?: string | null;
  templateType?: string;
  seedVersion?: number;
  userModified?: boolean;
};

export type HeaderFooterTemplateContent = {
  version: 1;
  renderer: {
    version: "0.1.28";
    source: "cdn";
  };
  page: {
    size: PageSize;
    orientation: PageOrientation;
  };
  sections: {
    header: HfGridSection;
    footer: HfGridSection;
    leftFrame: HfFrameSection;
    rightFrame: HfFrameSection;
    content: HfContentSection;
  };
  ui: {
    zoom: number;
    showGrid: boolean;
    previewMode: PreviewMode;
  };
  source?: HeaderFooterContentSource;
};

export type CellSelection = {
  section: GridSectionId;
  cells: Array<{ row: number; col: number }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function createEmptyCell(row: number, col: number): HfGridCell {
  return {
    row,
    col,
    rowSpan: 1,
    colSpan: 1,
    type: "empty",
    content: "",
    imageSrc: "",
    imageFit: "contain",
    backgroundColor: "transparent",
    fontColor: "#000000",
    fontFamily: "Inter, sans-serif",
    fontSize: "12pt",
    fontBold: false,
    fontItalic: false,
    fontUnderline: false,
    textAlign: "left",
    verticalAlign: "top",
    padding: 5,
    borderTop: false,
    borderRight: false,
    borderBottom: false,
    borderLeft: false,
    borderColor: "#000000",
    borderWidth: 1,
    borderStyle: "solid",
    legendTypes: [],
    legendVisibility: "all",
    legendSort: "default",
    legendColumnDefs: defaultLegendColumnDefs(),
    legendImageHeightPx: null,
    legendMaxRows: null,
    legendTextAlign: "left",
    legendCustomLabels: [],
    legendCustomItems: [],
  };
}

function normalizeLegendColumnDefs(raw: unknown, fallback: HfLegendColumnDef[]): HfLegendColumnDef[] {
  if (!Array.isArray(raw) || raw.length === 0) return structuredClone(fallback);
  const allowed = new Set<HfLegendColumnContent>([
    "graphic",
    "label",
    "depth",
    "date",
    "time",
  ]);
  const defs: HfLegendColumnDef[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const content = asString(entry.content, "") as HfLegendColumnContent;
    if (!allowed.has(content)) continue;
    defs.push({
      content,
      widthPct: Math.max(1, asNumber(entry.widthPct, 1)),
      ...(typeof entry.prefix === "string" ? { prefix: entry.prefix } : {}),
      ...(typeof entry.suffix === "string" ? { suffix: entry.suffix } : {}),
      ...(typeof entry.paddingLeft === "number" ? { paddingLeft: entry.paddingLeft } : {}),
      ...(typeof entry.xOffset === "number" ? { xOffset: entry.xOffset } : {}),
      ...(typeof entry.fontBold === "boolean" ? { fontBold: entry.fontBold } : {}),
      ...(typeof entry.fontItalic === "boolean" ? { fontItalic: entry.fontItalic } : {}),
      ...(typeof entry.fontUnderline === "boolean" ? { fontUnderline: entry.fontUnderline } : {}),
      ...(typeof entry.fontColor === "string" ? { fontColor: entry.fontColor } : {}),
      ...(typeof entry.fontFamily === "string" ? { fontFamily: entry.fontFamily } : {}),
      ...(typeof entry.fontSize === "string" ? { fontSize: entry.fontSize } : {}),
    });
  }
  return defs.length > 0 ? defs : structuredClone(fallback);
}

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function normalizeLegendCustomItems(raw: unknown): HfLegendCustomItem[] {
  if (!Array.isArray(raw)) return [];
  const items: HfLegendCustomItem[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const label = asString(entry.label, "");
    const imageUrl = asString(entry.imageUrl, "");
    if (!label && !imageUrl) continue;
    items.push({
      label,
      imageUrl,
      ...(typeof entry.legendType === "string" ? { legendType: entry.legendType } : {}),
    });
  }
  return items;
}

function normalizeCellStyle(raw: Record<string, unknown>, cell: HfGridCell): HfGridCell {
  const type =
    raw.type === "text" ||
    raw.type === "image" ||
    raw.type === "legend" ||
    raw.type === "empty"
      ? raw.type
      : cell.type;
  const imageFit =
    raw.imageFit === "cover" || raw.imageFit === "fill" || raw.imageFit === "contain"
      ? raw.imageFit
      : cell.imageFit;
  const textAlign =
    raw.textAlign === "center" || raw.textAlign === "right" || raw.textAlign === "left"
      ? raw.textAlign
      : cell.textAlign;
  const verticalAlign =
    raw.verticalAlign === "middle" ||
    raw.verticalAlign === "bottom" ||
    raw.verticalAlign === "top"
      ? raw.verticalAlign
      : cell.verticalAlign;
  const borderStyle =
    raw.borderStyle === "dashed" ||
    raw.borderStyle === "dotted" ||
    raw.borderStyle === "solid"
      ? raw.borderStyle
      : cell.borderStyle;

  const legendVisibility =
    raw.legendVisibility === "used-only" ||
    raw.legendVisibility === "custom" ||
    raw.legendVisibility === "all"
      ? raw.legendVisibility
      : cell.legendVisibility;
  const legendSort =
    raw.legendSort === "az" ||
    raw.legendSort === "za" ||
    raw.legendSort === "by-presence" ||
    raw.legendSort === "default"
      ? raw.legendSort
      : cell.legendSort;
  const legendTextAlign =
    raw.legendTextAlign === "center" ||
    raw.legendTextAlign === "right" ||
    raw.legendTextAlign === "left"
      ? raw.legendTextAlign
      : cell.legendTextAlign;

  const legendTypes = normalizeStringList(raw.legendTypes);
  const primaryLegendType =
    type === "legend"
      ? asString(raw.content, legendTypes[0] ?? cell.content)
      : asString(raw.content, asString(raw.textContent, cell.content));

  return {
    ...cell,
    type,
    content: primaryLegendType,
    imageSrc: asString(raw.imageSrc, cell.imageSrc),
    imageFit,
    backgroundColor: asString(raw.backgroundColor, cell.backgroundColor),
    fontColor: asString(raw.fontColor, cell.fontColor),
    fontFamily: asString(raw.fontFamily, cell.fontFamily),
    fontSize: asString(raw.fontSize, cell.fontSize),
    fontBold: asBoolean(raw.fontBold, cell.fontBold),
    fontItalic: asBoolean(raw.fontItalic, cell.fontItalic),
    fontUnderline: asBoolean(raw.fontUnderline, cell.fontUnderline),
    textAlign,
    verticalAlign,
    padding: Math.max(0, asNumber(raw.padding, cell.padding)),
    borderTop: asBoolean(raw.borderTop, cell.borderTop),
    borderRight: asBoolean(raw.borderRight, cell.borderRight),
    borderBottom: asBoolean(raw.borderBottom, cell.borderBottom),
    borderLeft: asBoolean(raw.borderLeft, cell.borderLeft),
    borderColor: asString(raw.borderColor, cell.borderColor),
    borderWidth: Math.max(0, asNumber(raw.borderWidth, cell.borderWidth)),
    borderStyle,
    legendTypes:
      legendTypes.length > 0
        ? legendTypes
        : type === "legend" && primaryLegendType
          ? [primaryLegendType]
          : [],
    legendVisibility,
    legendSort,
    legendColumnDefs: normalizeLegendColumnDefs(raw.legendColumnDefs, cell.legendColumnDefs),
    legendImageHeightPx:
      raw.legendImageHeightPx == null
        ? cell.legendImageHeightPx
        : Math.max(0, asNumber(raw.legendImageHeightPx, 0)) || null,
    legendMaxRows:
      raw.legendMaxRows == null
        ? cell.legendMaxRows
        : Math.max(0, Math.floor(asNumber(raw.legendMaxRows, 0))) || null,
    legendTextAlign,
    legendCustomLabels: normalizeStringList(raw.legendCustomLabels),
    legendCustomItems: normalizeLegendCustomItems(raw.legendCustomItems),
  };
}

function normalizeColumnWidths(cols: number, widths: unknown): number[] {
  const list = Array.isArray(widths)
    ? widths.filter((item): item is number => typeof item === "number" && item > 0)
    : [];

  if (list.length === cols) {
    const sum = list.reduce((acc, value) => acc + value, 0);
    if (sum > 0) return list.map((value) => value / sum);
  }

  return Array.from({ length: cols }, () => 1 / cols);
}

function normalizeCells(
  rows: number,
  cols: number,
  cells: unknown
): HfGridCell[] {
  const occupied = new Set<string>();
  const result: HfGridCell[] = [];

  const rawCells = Array.isArray(cells) ? cells : [];
  for (const raw of rawCells) {
    if (!isRecord(raw)) continue;
    const row = Math.floor(asNumber(raw.row, -1));
    const col = Math.floor(asNumber(raw.col, -1));
    const rowSpan = Math.max(1, Math.floor(asNumber(raw.rowSpan, 1)));
    const colSpan = Math.max(1, Math.floor(asNumber(raw.colSpan, 1)));
    if (row < 0 || col < 0 || row >= rows || col >= cols) continue;
    if (row + rowSpan > rows || col + colSpan > cols) continue;

    let blocked = false;
    for (let r = row; r < row + rowSpan; r += 1) {
      for (let c = col; c < col + colSpan; c += 1) {
        if (occupied.has(`${r}:${c}`)) blocked = true;
      }
    }
    if (blocked) continue;

    for (let r = row; r < row + rowSpan; r += 1) {
      for (let c = col; c < col + colSpan; c += 1) {
        occupied.add(`${r}:${c}`);
      }
    }
    result.push(
      normalizeCellStyle(raw, {
        ...createEmptyCell(row, col),
        rowSpan,
        colSpan,
      })
    );
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (occupied.has(`${row}:${col}`)) continue;
      occupied.add(`${row}:${col}`);
      result.push(createEmptyCell(row, col));
    }
  }

  return result.sort((a, b) => a.row - b.row || a.col - b.col);
}

function normalizeGridSection(raw: unknown, fallback: HfGridSection): HfGridSection {
  if (!isRecord(raw)) return fallback;
  const rows = Math.max(1, Math.floor(asNumber(raw.rows, fallback.rows)));
  const cols = Math.max(1, Math.floor(asNumber(raw.cols, fallback.cols)));
  return {
    enabled: asBoolean(raw.enabled, fallback.enabled),
    heightMm: Math.max(10, asNumber(raw.heightMm, fallback.heightMm)),
    rows,
    cols,
    columnWidths: normalizeColumnWidths(cols, raw.columnWidths),
    cells: normalizeCells(rows, cols, raw.cells),
  };
}

function normalizeFrameSection(raw: unknown, fallback: HfFrameSection): HfFrameSection {
  if (!isRecord(raw)) return structuredClone(fallback);
  return {
    enabled: asBoolean(raw.enabled, fallback.enabled),
    widthMm: Math.max(8, asNumber(raw.widthMm, fallback.widthMm)),
    cell: isRecord(raw.cell)
      ? normalizeCellStyle(raw.cell, structuredClone(fallback.cell))
      : structuredClone(fallback.cell),
  };
}

function normalizeContentSection(
  raw: unknown,
  fallback: HfContentSection
): HfContentSection {
  if (!isRecord(raw)) return structuredClone(fallback);
  return {
    enabled: asBoolean(raw.enabled, fallback.enabled),
    cell: isRecord(raw.cell)
      ? normalizeCellStyle(raw.cell, structuredClone(fallback.cell))
      : structuredClone(fallback.cell),
  };
}

export function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function findCellAt(
  section: HfGridSection,
  row: number,
  col: number
): HfGridCell | null {
  return (
    section.cells.find(
      (cell) =>
        row >= cell.row &&
        row < cell.row + cell.rowSpan &&
        col >= cell.col &&
        col < cell.col + cell.colSpan
    ) ?? null
  );
}

export function countVisibleCells(section: HfGridSection): number {
  return section.cells.length;
}

export function cellAddress(row: number, col: number): string {
  return `${String.fromCharCode(65 + (col % 26))}${row + 1}`;
}

export function cellTypeLabel(type: HfCellType): string {
  switch (type) {
    case "text":
      return "Column Text";
    case "image":
      return "Column Image";
    case "legend":
      return "Column Legend";
    default:
      return "Column Empty";
  }
}

function normalizeContentSource(
  raw: unknown,
  fallback?: HeaderFooterContentSource
): HeaderFooterContentSource | undefined {
  const fromRaw = isRecord(raw) ? raw : null;
  if (!fromRaw && !fallback) return undefined;

  const seedVersionRaw = fromRaw?.seedVersion ?? fallback?.seedVersion;
  const seedVersion =
    typeof seedVersionRaw === "number" && Number.isFinite(seedVersionRaw)
      ? seedVersionRaw
      : undefined;

  const reportTypeRaw = fromRaw?.reportType ?? fallback?.reportType;
  const reportType =
    reportTypeRaw === null
      ? null
      : typeof reportTypeRaw === "string"
        ? reportTypeRaw
        : undefined;

  const source: HeaderFooterContentSource = {
    ...(typeof (fromRaw?.name ?? fallback?.name) === "string"
      ? { name: String(fromRaw?.name ?? fallback?.name) }
      : {}),
    ...(typeof (fromRaw?.tablogsType ?? fallback?.tablogsType) === "string"
      ? { tablogsType: String(fromRaw?.tablogsType ?? fallback?.tablogsType) }
      : {}),
    ...(reportType !== undefined ? { reportType } : {}),
    ...(typeof (fromRaw?.templateType ?? fallback?.templateType) === "string"
      ? { templateType: String(fromRaw?.templateType ?? fallback?.templateType) }
      : {}),
    ...(seedVersion !== undefined ? { seedVersion } : {}),
    ...(asBoolean(fromRaw?.userModified, Boolean(fallback?.userModified))
      ? { userModified: true }
      : {}),
  };

  return Object.keys(source).length > 0 ? source : undefined;
}

export function normalizeHeaderFooterContent(
  raw: unknown,
  fallback: HeaderFooterTemplateContent
): HeaderFooterTemplateContent {
  if (!isRecord(raw)) return structuredClone(fallback);

  const pageRaw = isRecord(raw.page) ? raw.page : {};
  const sectionsRaw = isRecord(raw.sections) ? raw.sections : {};
  const uiRaw = isRecord(raw.ui) ? raw.ui : {};

  const size =
    pageRaw.size === "Letter" || pageRaw.size === "Legal" || pageRaw.size === "A4"
      ? pageRaw.size
      : fallback.page.size;
  const orientation =
    pageRaw.orientation === "landscape" || pageRaw.orientation === "portrait"
      ? pageRaw.orientation
      : fallback.page.orientation;

  const previewMode =
    uiRaw.previewMode === "live" || uiRaw.previewMode === "debug"
      ? uiRaw.previewMode
      : fallback.ui.previewMode;

  const zoom = Math.min(200, Math.max(50, asNumber(uiRaw.zoom, fallback.ui.zoom)));
  const source = normalizeContentSource(raw.source, fallback.source);

  return {
    version: 1,
    renderer: {
      version: "0.1.28",
      source: "cdn",
    },
    page: { size, orientation },
    sections: {
      header: normalizeGridSection(sectionsRaw.header, fallback.sections.header),
      footer: normalizeGridSection(sectionsRaw.footer, fallback.sections.footer),
      leftFrame: normalizeFrameSection(sectionsRaw.leftFrame, fallback.sections.leftFrame),
      rightFrame: normalizeFrameSection(sectionsRaw.rightFrame, fallback.sections.rightFrame),
      content: normalizeContentSection(sectionsRaw.content, fallback.sections.content),
    },
    ui: {
      zoom,
      showGrid: asBoolean(uiRaw.showGrid, fallback.ui.showGrid),
      previewMode,
    },
    ...(source ? { source } : {}),
  };
}

export function contentToJson(content: HeaderFooterTemplateContent): Record<string, unknown> {
  const cloned = structuredClone(content) as HeaderFooterTemplateContent;
  cloned.source = {
    ...(cloned.source ?? {}),
    userModified: true,
  };
  return {
    ...(cloned as unknown as Record<string, unknown>),
    rendererPayload: buildRendererPayload(content),
  };
}

function buildRendererPayload(content: HeaderFooterTemplateContent): Record<string, unknown> {
  const toRendererCell = (cell: HfGridCell) => {
    const legendTypes =
      cell.type === "legend"
        ? cell.legendTypes.length > 0
          ? cell.legendTypes
          : cell.content
            ? [cell.content]
            : []
        : undefined;
    return {
      ...cell,
      rowspan: cell.rowSpan,
      colspan: cell.colSpan,
      visible: true,
      // Flat-grid contract: primary legend type lives in `content`; proxy also
      // exposes legendType for side-frame / nested-column paths.
      ...(cell.type === "legend"
        ? {
            legendType: legendTypes?.[0] ?? cell.content,
            legendTypes,
            legendVisibility:
              cell.legendVisibility === "all" ? undefined : cell.legendVisibility,
            legendSort: cell.legendSort === "default" ? undefined : cell.legendSort,
            legendImageHeightPx: cell.legendImageHeightPx ?? undefined,
            legendMaxRows: cell.legendMaxRows ?? undefined,
          }
        : {}),
    };
  };

  const toRendererSection = (section: HfGridSection) => {
    const cells: Array<Array<Record<string, unknown> | null>> = Array.from(
      { length: section.rows },
      () => Array.from({ length: section.cols }, () => null)
    );
    for (const cell of section.cells) {
      cells[cell.row][cell.col] = toRendererCell(cell);
    }
    return {
      rows: section.rows,
      cols: section.cols,
      cells,
      colWidths: section.columnWidths.map((value) => ({
        value: value * 100,
        unit: "%",
      })),
      rowHeights: Array.from({ length: section.rows }, () => ({
        value: 100 / section.rows,
        unit: "%",
      })),
      rowVisible: Array.from({ length: section.rows }, () => true),
    };
  };

  const toSideFrame = (frame: HfFrameSection) => {
    const cell = frame.cell;
    const legendTypes =
      cell.type === "legend"
        ? cell.legendTypes.length > 0
          ? cell.legendTypes
          : cell.content
            ? [cell.content]
            : []
        : [];
    return {
      enabled: frame.enabled,
      width: mmToPx(frame.widthMm),
      widthUnit: "px",
      rows: [
        {
          height: 100,
          heightUnit: "%",
          visible: true,
          columns: [
            {
              width: 100,
              widthUnit: "%",
              height: 100,
              heightUnit: "%",
              visible: true,
              contentType: cell.type,
              textContent: cell.type === "text" ? cell.content : "",
              imageSrc: cell.imageSrc,
              imageFit: cell.imageFit,
              backgroundColor: cell.backgroundColor,
              fontColor: cell.fontColor,
              fontFamily: cell.fontFamily,
              fontSize: cell.fontSize,
              fontBold: cell.fontBold,
              fontItalic: cell.fontItalic,
              fontUnderline: cell.fontUnderline,
              textAlign: cell.textAlign,
              verticalAlign: cell.verticalAlign,
              padding: cell.padding,
              borderTop: cell.borderTop,
              borderRight: cell.borderRight,
              borderBottom: cell.borderBottom,
              borderLeft: cell.borderLeft,
              borderColor: cell.borderColor,
              borderWidth: cell.borderWidth,
              borderStyle: cell.borderStyle,
              legendType: legendTypes[0] ?? cell.content,
              legendTypes,
              legendVisibility:
                cell.legendVisibility === "all" ? undefined : cell.legendVisibility,
              legendSort: cell.legendSort === "default" ? undefined : cell.legendSort,
              legendColumnDefs: cell.legendColumnDefs,
              legendImageHeightPx: cell.legendImageHeightPx ?? undefined,
              legendMaxRows: cell.legendMaxRows ?? undefined,
              legendTextAlign: cell.legendTextAlign,
              legendCustomLabels: cell.legendCustomLabels,
              legendCustomItems: cell.legendCustomItems,
            },
          ],
        },
      ],
    };
  };

  const mmToPx = (mm: number) => (mm / 25.4) * 96;
  const leftFrame = toSideFrame(content.sections.leftFrame);
  const rightFrame = toSideFrame(content.sections.rightFrame);

  // Flat left/right sections so resolveLegendData can discover frame legend types.
  const frameAsFlatSection = (frame: HfFrameSection) => ({
    rows: 1,
    cols: 1,
    cells: [[toRendererCell({ ...frame.cell, row: 0, col: 0 })]],
    colWidths: [{ value: 100, unit: "%" }],
    rowHeights: [{ value: 100, unit: "%" }],
    rowVisible: [true],
  });

  return {
    _gridVersion: 1,
    showHeader: content.sections.header.enabled,
    showContent: content.sections.content.enabled,
    showFooter: content.sections.footer.enabled,
    headerSettings: {
      position: "top",
      height: mmToPx(content.sections.header.heightMm),
      heightUnit: "px",
      backgroundColor: "#ffffff",
    },
    footerSettings: {
      position: "bottom",
      height: mmToPx(content.sections.footer.heightMm),
      heightUnit: "px",
      backgroundColor: "#ffffff",
    },
    contentFrameSettings: {
      height: 100,
      heightUnit: "%",
      width: 100,
      widthUnit: "%",
      align: "left",
      backgroundColor: "#ffffff",
      leftFrame,
      rightFrame,
    },
    sections: {
      header: toRendererSection(content.sections.header),
      footer: toRendererSection(content.sections.footer),
      left: frameAsFlatSection(content.sections.leftFrame),
      right: frameAsFlatSection(content.sections.rightFrame),
    },
    leftFrameSettings: {
      visible: content.sections.leftFrame.enabled,
      width: mmToPx(content.sections.leftFrame.widthMm),
      widthUnit: "px",
      cell: toRendererCell(content.sections.leftFrame.cell),
    },
    rightFrameSettings: {
      visible: content.sections.rightFrame.enabled,
      width: mmToPx(content.sections.rightFrame.widthMm),
      widthUnit: "px",
      cell: toRendererCell(content.sections.rightFrame.cell),
    },
    contentSettings: {
      visible: content.sections.content.enabled,
      cell: toRendererCell(content.sections.content.cell),
    },
  };
}
