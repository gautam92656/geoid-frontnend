import type {
  LogTemplateChartSeries,
  LogTemplateColumn,
  LogTemplateColumnType,
} from "../../types/logTemplate";

export type FieldToggle = {
  key: string;
  label: string;
};

export type ColumnTypeUi = {
  /** Body (content) text format toolbar */
  showBodyFormat: boolean;
  /** Body text-direction control (vertical/horizontal) */
  showBodyTextDirection: boolean;
  /** Vertical body text toggle in Visual Style */
  showVerticalText: boolean;
  /** Primary data-source group/field selectors (non-configurable columns) */
  showDataSource: boolean;
  /** Text + Graphic layout picker */
  showTextGraphicLayout: boolean;
  /** Scale-only controls */
  showScaleSettings: boolean;
  /** Photo-only controls */
  showPhotoSettings: boolean;
  /** Chart-only controls */
  showChartSettings: boolean;
  /** Data Display group (e.g. Include depth) */
  dataDisplayToggles: FieldToggle[];
  /** Visual Style group (shade / boundaries) */
  visualStyleToggles: FieldToggle[];
  /** Type-specific behaviour toggles (Text / Graphic Behavior) */
  behaviourToggles: FieldToggle[];
  /** Structure toggles */
  structureToggles: FieldToggle[];
};

const DATA_DISPLAY_COMMON: FieldToggle[] = [
  { key: "include_depth", label: "Include depth" },
];

const VISUAL_STYLE_COMMON: FieldToggle[] = [
  { key: "shaded_column", label: "Shade column" },
  { key: "remove_boundary_lines", label: "Remove value boundaries lines" },
];

const STRUCTURE_COMMON: FieldToggle[] = [
  { key: "column_separation", label: "Column separation" },
  { key: "hide_column_title", label: "Hide column title" },
];

/**
 * Field visibility for the column inspector.
 * Matches the Angular `app-*-display` / `app-display-options` components.
 */
export function getColumnTypeUi(type: LogTemplateColumnType): ColumnTypeUi {
  switch (type) {
    case "text":
      return {
        showBodyFormat: true,
        showBodyTextDirection: true,
        showVerticalText: false,
        showDataSource: true,
        showTextGraphicLayout: false,
        showScaleSettings: false,
        showPhotoSettings: false,
        showChartSettings: false,
        dataDisplayToggles: DATA_DISPLAY_COMMON,
        visualStyleToggles: VISUAL_STYLE_COMMON,
        behaviourToggles: [
          { key: "continue_text_if_unchanged", label: "Continue text if unchanged" },
        ],
        structureToggles: [],
      };

    case "text_graphic":
      return {
        showBodyFormat: true,
        showBodyTextDirection: true,
        showVerticalText: false,
        showDataSource: false,
        showTextGraphicLayout: true,
        showScaleSettings: false,
        showPhotoSettings: false,
        showChartSettings: false,
        dataDisplayToggles: DATA_DISPLAY_COMMON,
        visualStyleToggles: VISUAL_STYLE_COMMON,
        behaviourToggles: [
          { key: "continue_graphic_if_unchanged", label: "Continue graphic if unchanged" },
          { key: "empty_graphic_if_not_sampled", label: "Empty graphic if not sampled" },
          { key: "continue_text_if_unchanged", label: "Continue text if unchanged" },
        ],
        structureToggles: [],
      };

    case "graphic":
      // Angular app-graphic-display: Data Display, Visual Style, Graphic Behavior.
      return {
        showBodyFormat: true,
        showBodyTextDirection: true,
        showVerticalText: false,
        showDataSource: false,
        showTextGraphicLayout: false,
        showScaleSettings: false,
        showPhotoSettings: false,
        showChartSettings: false,
        dataDisplayToggles: DATA_DISPLAY_COMMON,
        visualStyleToggles: VISUAL_STYLE_COMMON,
        behaviourToggles: [
          { key: "continue_graphic_if_unchanged", label: "Continue graphic if unchanged" },
          { key: "empty_graphic_if_not_sampled", label: "Empty graphic if not sampled" },
        ],
        structureToggles: [],
      };

    case "scale":
      // Angular app-scale-display: Data Display + Visual Style only (no Text Behavior / Structure).
      return {
        showBodyFormat: true,
        showBodyTextDirection: true,
        showVerticalText: false,
        showDataSource: false,
        showTextGraphicLayout: false,
        showScaleSettings: true,
        showPhotoSettings: false,
        showChartSettings: false,
        dataDisplayToggles: DATA_DISPLAY_COMMON,
        visualStyleToggles: VISUAL_STYLE_COMMON,
        behaviourToggles: [],
        structureToggles: [],
      };

    case "photo":
      return {
        showBodyFormat: true,
        showBodyTextDirection: false,
        showVerticalText: false,
        showDataSource: false,
        showTextGraphicLayout: false,
        showScaleSettings: false,
        showPhotoSettings: true,
        showChartSettings: false,
        dataDisplayToggles: [],
        visualStyleToggles: [],
        behaviourToggles: [],
        structureToggles: [],
      };

    case "chart":
      return {
        showBodyFormat: true,
        showBodyTextDirection: false,
        showVerticalText: false,
        showDataSource: false,
        showTextGraphicLayout: false,
        showScaleSettings: false,
        showPhotoSettings: false,
        showChartSettings: true,
        dataDisplayToggles: [],
        visualStyleToggles: [],
        behaviourToggles: [],
        structureToggles: [],
      };

    default:
      return {
        showBodyFormat: true,
        showBodyTextDirection: true,
        showVerticalText: false,
        showDataSource: true,
        showTextGraphicLayout: false,
        showScaleSettings: false,
        showPhotoSettings: false,
        showChartSettings: false,
        dataDisplayToggles: DATA_DISPLAY_COMMON,
        visualStyleToggles: VISUAL_STYLE_COMMON,
        behaviourToggles: [],
        structureToggles: STRUCTURE_COMMON,
      };
  }
}

export const COPY_PRESET_CONFIGURABLE = "Configurable";

/** Types that default (system) columns are not allowed to switch away from. */
const INHERENTLY_LOCKED_SCALE_CODES = new Set([
  "depth",
  "elevation",
  "depth_m",
  "depth_ft",
  "elevation_m",
  "elevation_ft",
]);

/**
 * Only inherently Scale/Photo/Chart default columns stay locked.
 * Do NOT lock based on the current display type — otherwise switching Remarks → Scale
 * freezes every other Display Type tab.
 */
export function isDisplayTypeLocked(column: LogTemplateColumn): boolean {
  if (!column.default_column) return false;
  if (isDrillingMethodColumn(column)) return false;
  const code = String(column.code ?? "").toLowerCase();
  if (INHERENTLY_LOCKED_SCALE_CODES.has(code)) return true;
  // Photo / chart default columns stay on their catalog type
  if (column.column_type === "photo" && code.includes("photo")) return true;
  if (column.column_type === "chart" && (code.includes("chart") || code.includes("graph"))) {
    // Only lock when the column was created as a chart/graph default — not when user
    // temporarily switched a text column (e.g. remarks) to chart.
    const copy = String(column.copy_default_column ?? "").toLowerCase();
    if (copy === code || copy.includes("chart") || copy.includes("graph")) return true;
  }
  return false;
}

export function getCopyPresetValue(column: LogTemplateColumn): string {
  const value = String(column.copy_default_column ?? "").trim();
  if (value && value !== COPY_PRESET_CONFIGURABLE) return value;

  // Default system columns often omit copy_default_column — infer from code.
  const code = String(column.code ?? "").toLowerCase();
  if (
    column.default_column &&
    [
      "psp",
      "drilling method",
      "water",
      "soil origin",
      "graphic log",
      "classification code",
      "weathering",
      "moisture",
      "material description",
      "consistency",
      "well diagram",
      "remarks",
      "samples",
      "testing",
    ].includes(code)
  ) {
    return code;
  }

  return COPY_PRESET_CONFIGURABLE;
}

export function isConfigurableColumn(column: LogTemplateColumn): boolean {
  return getCopyPresetValue(column) === COPY_PRESET_CONFIGURABLE && !column.default_column;
}

/**
 * Angular/Vue: string builders show for Configurable text / graphic / text+graphic
 * and for remarks / samples / testing module columns (Select Data + String).
 * (not scale, photo, chart; not samples/testing parent children).
 */
export function shouldShowStringBuilders(column: LogTemplateColumn): boolean {
  if (["scale", "photo", "chart"].includes(column.column_type)) return false;
  const parent = String(column.parent_code ?? "").toLowerCase();
  if (parent === "samples" || parent === "testing") return false;

  const isTextFamily =
    column.column_type === "text" ||
    column.column_type === "text_graphic" ||
    column.column_type === "graphic";
  if (!isTextFamily) return false;

  if (isMultiModuleBoundColumn(column)) return true;
  if (!isConfigurableColumn(column)) return false;
  return true;
}

/** Remarks / Samples / Testing — Select Data is a multi-select of module types. */
export function isMultiModuleBoundColumn(column: LogTemplateColumn): boolean {
  const code = String(column.code ?? "").toLowerCase();
  if (code === "remarks" || code === "samples" || code === "testing") return true;
  const copy = String(column.copy_default_column ?? "").trim().toLowerCase();
  return copy === "remarks" || copy === "samples" || copy === "testing";
}

export function isRemarksColumn(column: LogTemplateColumn): boolean {
  const code = String(column.code ?? "").toLowerCase();
  if (code === "remarks") return true;
  return String(column.copy_default_column ?? "").trim().toLowerCase() === "remarks";
}

/** Angular text-display structure toggles for remarks/samples/testing. */
export const MULTI_MODULE_STRUCTURE_TOGGLES: FieldToggle[] = [
  { key: "column_static_columns", label: "Static column" },
  { key: "column_separation", label: "Column separation" },
  { key: "flexible_line_borders", label: "Flexible line border" },
];

/** Graphic-style builders (Select Data + Filter Data) vs text String builders. */
export function usesGraphicStringBuilders(column: LogTemplateColumn): boolean {
  return column.column_type === "graphic" || column.column_type === "text_graphic";
}

export function isWellDiagramColumn(column: LogTemplateColumn): boolean {
  const code = String(column.code ?? "").toLowerCase();
  const value =
    typeof column.column_data_source === "string"
      ? column.column_data_source
      : String(column.column_data_source?.value ?? "");
  return code === "well diagram" || value === "well_diagram_backfill_logs";
}

export function isDrillingMethodColumn(column: LogTemplateColumn): boolean {
  const code = String(column.code ?? "").toLowerCase();
  const copyPreset = String(column.copy_default_column ?? "").toLowerCase();
  const group =
    typeof column.column_data_source === "string"
      ? ""
      : String(column.column_data_source?.group ?? "");
  return (
    group === "all_drilling_methods" ||
    code === "drilling method" ||
    copyPreset === "drilling method"
  );
}

/** Defaults applied when a known Column Type preset is selected or loaded. */
export function getPresetColumnDefaults(
  presetCode: string
): Partial<LogTemplateColumn> | null {
  const code = presetCode.trim().toLowerCase();
  if (code === "drilling method") {
    return {
      copy_default_column: "drilling method",
      column_type: "text",
      displayType: "Text",
      column_data_source: {
        group: "all_drilling_methods",
        value: "drill_method",
      },
      show_arrows: true,
      vertical_text: true,
      name_vertical: true,
    };
  }
  if (code === "well diagram") {
    return {
      copy_default_column: "well diagram",
      column_type: "graphic",
      displayType: "Graphic",
      column_data_source: {
        group: "all_wells",
        value: "well_diagram_backfill_logs",
      },
      name_vertical: true,
      vertical_text: false,
      show_well_name: true,
      show_well: true,
      well_width: 50,
      show_well_type: true,
      show_well_type_labels: true,
      show_casing_labels: true,
      show_regular_casing_spacing: true,
      regular_casing_spacing_width: 50,
      show_surface_casing_spacing: false,
      surface_casing_spacing_width: 0,
      show_surface_casing: false,
      surface_casing_width: 0,
      show_regular_casing: false,
      regular_casing_width: 0,
      selected_water_types_on_well_log: [],
      show_well_logs_comments: false,
      show_well_backfills_comments: false,
      show_well_casing_comments: false,
      show_well_casing_top_comments: false,
      show_well_probes_comments: false,
    };
  }
  if (code === "remarks") {
    return {
      copy_default_column: "remarks",
      column_type: "text",
      displayType: "Text",
      column_data_source: "",
      selectedFilterOptions: [],
      hide_multiple_data_name: false,
      name_vertical: true,
      vertical_text: false,
    };
  }
  if (code === "samples") {
    return {
      copy_default_column: "samples",
      column_type: "text",
      displayType: "Text",
      column_data_source: "",
      selectedFilterOptions: [],
      hide_multiple_data_name: false,
      only_show_sample_id: false,
      name_vertical: true,
      vertical_text: false,
    };
  }
  if (code === "testing") {
    return {
      copy_default_column: "testing",
      column_type: "text",
      displayType: "Text",
      column_data_source: "",
      selectedFilterOptions: [],
      hide_multiple_data_name: false,
      name_vertical: true,
      vertical_text: false,
    };
  }
  return null;
}

/** Correct known preset columns that were saved with the wrong display type. */
export function applyPresetColumnGuards(
  column: LogTemplateColumn
): LogTemplateColumn {
  if (!isDrillingMethodColumn(column)) return column;
  if (column.column_type === "text" && column.show_arrows !== undefined) {
    return {
      ...column,
      copy_default_column: column.copy_default_column || "drilling method",
      displayType: "Text",
      show_arrows: column.show_arrows !== false,
    };
  }
  return {
    ...column,
    ...getPresetColumnDefaults("drilling method"),
    text: column.text || "Drilling Method",
    code: column.code,
    hidden: column.hidden,
    visibility: column.visibility,
    width: column.width,
    default_column: column.default_column,
  };
}

export function isSubsurfaceColumn(column: LogTemplateColumn): boolean {
  const code = String(column.code ?? "").toLowerCase();
  const subsurfaceCodes = [
    "graphic log",
    "classification code",
    "material description",
    "weathering",
    "soil origin",
    "moisture",
    "consistency",
  ];
  return (
    subsurfaceCodes.includes(code) ||
    (typeof column.column_data_source !== "string" &&
      column.column_data_source?.group === "all_subsurface_profiles")
  );
}

export function isCombineRepeatedNamesColumn(column: LogTemplateColumn): boolean {
  const code = String(column.code ?? "").toLowerCase();
  return (
    Boolean(column.default_column) &&
    ["soil origin", "moisture", "consistency", "material description", "classification code"].includes(
      code
    )
  );
}

export function isOptionOn(column: LogTemplateColumn, key: string): boolean {
  if (key === "show_well_type_labels") {
    return Boolean(column.show_well_type_labels ?? column.show_well_type);
  }
  if (key === "show_casing_labels") {
    // Angular falls back to show_well_type when the split casing toggle is unset.
    if (column.show_casing_labels !== undefined) return Boolean(column.show_casing_labels);
    return Boolean(column.show_well_type_labels ?? column.show_well_type);
  }
  return Boolean(column[key as keyof LogTemplateColumn]);
}

export type StringBuilderItem = {
  text: string;
  type?: string;
  code?: string;
  group?: string;
};

export type StringBuilderColumn = {
  column_data_source: { group: string; value: string };
  column_type?: string;
  default_column?: boolean;
  parent_default_column?: boolean;
  selectedFilterOptions?: unknown[];
  selectedColumnOptions?: unknown[];
  stringBuilder?: StringBuilderItem[];
  inputText?: string;
  chart_data?: unknown[];
};

export function createEmptyStringBuilderColumn(
  partial: Partial<StringBuilderColumn> = {}
): StringBuilderColumn {
  return {
    column_type: "text",
    default_column: false,
    parent_default_column: false,
    selectedFilterOptions: [],
    selectedColumnOptions: [],
    stringBuilder: [],
    inputText: "",
    chart_data: [],
    ...partial,
    column_data_source: partial.column_data_source ?? { group: "", value: "" },
  };
}

export function getStringBuilderColumns(column: LogTemplateColumn): StringBuilderColumn[] {
  const raw = column.stringBuilderColumns;
  if (!Array.isArray(raw)) return [];
  return raw as StringBuilderColumn[];
}

export function getStringBuilderTokens(column: LogTemplateColumn): StringBuilderItem[] {
  const raw = column.stringBuilder;
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    if (typeof entry === "string") return { text: entry, type: "freeText" };
    const item = entry as StringBuilderItem;
    return { text: String(item.text ?? ""), type: item.type ?? "freeText", code: item.code, group: item.group };
  });
}

export const TEXT_GRAPHIC_LAYOUTS = [
  { value: "text_vertical_right", label: "Text vertical right" },
  { value: "text_vertical_left", label: "Text vertical left" },
  { value: "text_horizontal_bottom", label: "Text horizontal bottom" },
  { value: "text_horizontal_top", label: "Text horizontal top" },
  { value: "text_horizontal_middle", label: "Text horizontal middle" },
] as const;

export const CHART_TYPE_OPTIONS = [
  { value: "bar_chart", label: "Bar", imageKey: "bar" },
  { value: "scatter_line_chart", label: "Scatter", imageKey: "scatter" },
  { value: "mean_chart", label: "Mean", imageKey: "mean" },
  { value: "area_chart", label: "Area", imageKey: "area" },
  { value: "subsurface_bar_chart", label: "Subsurface Bar", imageKey: "subsurface_bar" },
  { value: "stacked_bar_chart", label: "Stacked Bar", imageKey: "stacked_bar" },
] as const;

export function getChartTypeImageUrl(chartType: string, selected: boolean): string {
  const option = CHART_TYPE_OPTIONS.find((entry) => entry.value === chartType);
  const key = option?.imageKey ?? "bar";
  const suffix = selected ? "selected" : "unselected";
  return `/api/v1/chart-graphics/files/${encodeURIComponent(`${key}-${suffix}.svg`)}`;
}

export function createEmptyChartSeries(
  partial: Partial<LogTemplateChartSeries> = {}
): LogTemplateChartSeries {
  return {
    chart_type: "bar_chart",
    column_data_source: { group: "", value: "" },
    fill_color: "#83BEEC",
    line_color: "#83BEEC",
    line_type: "solid",
    axis_bounds_min: 0,
    axis_bounds_max: 10,
    axis_units_minor: 1,
    axis_units_major: 2,
    axis_label: true,
    show_axis: true,
    show_name_in_legend: true,
    show_symbol_in_legend: false,
    hide_legend_if_no_data: true,
    hidden: false,
    data_label_font_size: 8,
    data_label_mode: "always",
    data_label_position: "right",
    x_axis_scale: "linear",
    y_depth_unit: "units_of_data",
    selectedMultiChartOptions: [],
    ...partial,
  };
}

/** Per-series row inside a chart (`selectedMultiChartOptions`). */
export type MultiChartOption = {
  name: string;
  text?: string;
  code?: string;
  group_code?: string;
  column_data_source?: { group: string; value: string };
  line_visibility?: boolean;
  line_color?: string;
  line_type?: string;
  symbol_visibility?: boolean;
  fill_color?: string;
  symbol_color?: string;
  symbol_type?: string;
  chart_transparency_width?: number | string;
};

export const CHART_SERIES_LINE_TYPES = [
  { value: "dashed-end", label: "Dashed end", image: "dashed-end.svg" },
  { value: "solid-end", label: "Solid end", image: "solid-end.svg" },
  { value: "solid_around", label: "Solid around", image: "solid_around.svg" },
  { value: "dotted_around", label: "Dotted around", image: "dotted_around.svg" },
] as const;

const LINE_TYPE_ALIASES: Record<string, string> = {
  dashed_around: "dotted_around",
  dotted: "dotted_around",
};

export function getChartLineTypeImageUrl(lineType: string): string {
  const normalized = LINE_TYPE_ALIASES[lineType] ?? lineType;
  const option =
    CHART_SERIES_LINE_TYPES.find((entry) => entry.value === normalized) ??
    CHART_SERIES_LINE_TYPES[0];
  return `/api/v1/chart-graphics/files/${encodeURIComponent(option.image)}`;
}

export function supportsMultiChartData(chartType: string): boolean {
  return chartType === "bar_chart" || chartType === "scatter_line_chart";
}

export function createEmptyMultiChartOption(
  partial: Partial<MultiChartOption> = {}
): MultiChartOption {
  const name = String(partial.name ?? "");
  const text =
    partial.text !== undefined ? String(partial.text) : String(partial.name ?? name);
  return {
    code: "",
    group_code: "",
    column_data_source: { group: "", value: "" },
    line_visibility: true,
    line_color: "#83BEEC",
    line_type: "dashed-end",
    symbol_visibility: true,
    fill_color: "#83BEEC",
    symbol_color: "#83BEEC",
    symbol_type: "symbol_01",
    chart_transparency_width: 80,
    ...partial,
    // Keep name/text defaults when partial omits them.
    name: String(partial.name ?? name),
    text,
  };
}

export function getMultiChartOptions(chart: LogTemplateChartSeries): MultiChartOption[] {
  const raw = chart.selectedMultiChartOptions;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((entry) => {
      const item = entry as MultiChartOption;
      return createEmptyMultiChartOption({
        ...item,
        name: String(item.name ?? item.code ?? ""),
        text: String(item.text || item.name || item.code || ""),
        column_data_source: {
          group: String(item.column_data_source?.group ?? item.group_code ?? ""),
          value: String(item.column_data_source?.value ?? item.code ?? ""),
        },
      });
    });
  }

  // Migrate legacy single data-source into one series row.
  const source = chart.column_data_source;
  if (source?.value) {
    return [
      createEmptyMultiChartOption({
        name: String(source.value),
        code: String(source.value),
        group_code: String(source.group ?? ""),
        column_data_source: {
          group: String(source.group ?? ""),
          value: String(source.value),
        },
        line_color: String(chart.line_color ?? "#83BEEC"),
        fill_color: String(chart.fill_color ?? "#83BEEC"),
        line_type: String(chart.line_type ?? "dashed-end"),
      }),
    ];
  }
  return [];
}

/** Angular / Vue `all_depths_filter` options for scale Depth Markers. */
export const DEPTH_MARKER_OPTIONS = [
  { value: "origin", label: "Subsurface Origin" },
  { value: "subsurface", label: "Subsurface Type" },
  { value: "all_depth_markers", label: "Depth Scale" },
] as const;

export type DepthMarkerOption = {
  value: string;
  label: string;
};

/** Angular app-scale-display Scale Source options (`column_data_source.value`). */
export const SCALE_SOURCE_OPTIONS = [
  { value: "depth_ft", label: "Depth(ft)" },
  { value: "depth_m", label: "Depth(m)" },
  { value: "depth_in", label: "Depth(in)" },
  { value: "elevation_ft", label: "Elevation(ft)" },
  { value: "elevation_m", label: "Elevation(m)" },
  { value: "elevation_in", label: "Elevation(in)" },
  { value: "vertical_depth_ft", label: "Vertical Depth(ft)" },
  { value: "vertical_depth_m", label: "Vertical Depth(m)" },
  { value: "vertical_depth_in", label: "Vertical Depth(in)" },
  { value: "elevation_depth_ft", label: "Elevation/Depth(ft)" },
  { value: "elevation_depth_m", label: "Elevation/Depth(m)" },
  { value: "elevation_depth_in", label: "Elevation/Depth(in)" },
  // Legacy seed / catalog values still present in saved templates
  { value: "depth", label: "Depth" },
  { value: "elevation", label: "Elevation" },
] as const;

export const SCALE_DECIMAL_OPTIONS = [
  { value: "", label: "Please choose data..." },
  { value: "no", label: "no decimals" },
  { value: "one", label: "1 decimal place" },
  { value: "two", label: "2 decimal places" },
] as const;

const ELEVATION_ONLY_VALUES = new Set([
  "elevation",
  "elevation_m",
  "elevation_ft",
  "elevation_in",
]);

const ELEVATION_DEPTH_VALUES = new Set([
  "elevation_depth_ft",
  "elevation_depth_m",
  "elevation_depth_in",
  "elevation/depth",
  "elevation_depth",
]);

function scaleSourceValue(column: LogTemplateColumn): string {
  return (
    typeof column.column_data_source === "string"
      ? column.column_data_source
      : String(column.column_data_source?.value ?? "")
  ).toLowerCase();
}

export function isElevationDepthScale(column: LogTemplateColumn): boolean {
  if (String(column.code ?? "").toLowerCase() === "elevation/depth") return true;
  const source = scaleSourceValue(column);
  const text = String(column.text ?? "").toLowerCase();
  return (
    ELEVATION_DEPTH_VALUES.has(source) ||
    source.includes("elevation_depth") ||
    source.includes("elevation/depth") ||
    /elevation\s*\/\s*depth/.test(text)
  );
}

/** Elevation(m/ft) scale — labels are reduced level (ground elevation minus depth). */
export function isElevationScale(column: LogTemplateColumn): boolean {
  if (isElevationDepthScale(column)) return false;
  const code = String(column.code ?? "").toLowerCase();
  if (code === "elevation") return true;
  const source = scaleSourceValue(column);
  if (ELEVATION_ONLY_VALUES.has(source) || source.includes("elevation")) return true;
  const text = String(column.text ?? "").toLowerCase();
  return text.includes("elevation") && !text.includes("depth");
}

export function getSelectedDepthOptions(column: LogTemplateColumn): DepthMarkerOption[] {
  const raw = column.selectedDepthOptions;
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    if (typeof entry === "string") {
      const known = DEPTH_MARKER_OPTIONS.find((option) => option.value === entry);
      return known ? { ...known } : { value: entry, label: entry };
    }
    const item = entry as { value?: string; label?: string };
    const value = String(item.value ?? "");
    const known = DEPTH_MARKER_OPTIONS.find((option) => option.value === value);
    return {
      value,
      label: String(item.label ?? known?.label ?? value),
    };
  });
}

export function shouldShowScaleMajorMinor(column: LogTemplateColumn): boolean {
  if (isElevationDepthScale(column)) return false;
  return getSelectedDepthOptions(column).some(
    (option) => option.value === "all_depth_markers"
  );
}

/** Angular: Select Graphics (+) for Configurable scale columns. */
export function shouldShowScaleGraphics(column: LogTemplateColumn): boolean {
  return isConfigurableColumn(column);
}

export const AS_ABOVE_LINE_OPTIONS = [
  { value: "no_line", label: "No Line" },
  { value: "dotted_line", label: "Dotted Line" },
  { value: "solid_line", label: "Solid Line" },
] as const;

export const WELL_DIAGRAM_LABEL_TOGGLES: FieldToggle[] = [
  { key: "show_well_name", label: "Show well ID Tag" },
  { key: "horizontal_well_name", label: "Horizontal Well ID Tag" },
  { key: "show_cover_in_header", label: "Show cover in header" },
  { key: "show_well_type_labels", label: "Label well types and casing" },
  { key: "show_casing_labels", label: "Label casing" },
  { key: "show_backfill_type", label: "Label for backfills" },
];

export const WELL_DIAGRAM_COMMENT_TOGGLES: FieldToggle[] = [
  { key: "show_well_logs_comments", label: "Show Well Logs Comments" },
  { key: "show_well_backfills_comments", label: "Show Well Backfills Comments" },
  { key: "show_well_casing_comments", label: "Show Well Casing Comments" },
  { key: "show_well_casing_top_comments", label: "Show Well Casing Top Comments" },
  { key: "show_well_probes_comments", label: "Show Well Probes and Instruments Comments" },
];

/** @deprecated Prefer WELL_DIAGRAM_LABEL_TOGGLES + WELL_DIAGRAM_COMMENT_TOGGLES */
export const WELL_DIAGRAM_TOGGLES: FieldToggle[] = [
  ...WELL_DIAGRAM_LABEL_TOGGLES,
  ...WELL_DIAGRAM_COMMENT_TOGGLES,
  { key: "show_well", label: "Show well" },
];

export type WellDiagramWidthRow = {
  toggleKey: string;
  widthKey: string;
  label: string;
  showWidthLabel?: boolean;
  hint?: string;
};

export const WELL_DIAGRAM_WIDTH_ROWS: WellDiagramWidthRow[] = [
  {
    toggleKey: "show_well",
    widthKey: "well_width",
    label: "Well",
    showWidthLabel: true,
  },
  {
    toggleKey: "show_surface_casing_spacing",
    widthKey: "surface_casing_spacing_width",
    label: "Surface Casing Backfill",
  },
  {
    toggleKey: "show_surface_casing",
    widthKey: "surface_casing_width",
    label: "Surface Casing",
  },
  {
    toggleKey: "show_regular_casing_spacing",
    widthKey: "regular_casing_spacing_width",
    label: "Regular Casing Backfill",
    hint: "If no casing applied, regular casing backfill % will be applied across entire well!",
  },
  {
    toggleKey: "show_regular_casing",
    widthKey: "regular_casing_width",
    label: "Regular Casing",
  },
];

export function getWellDiagramRemainingWidth(column: LogTemplateColumn): number {
  const sum =
    (Number(column.well_width) || 0) +
    (Number(column.surface_casing_spacing_width) || 0) +
    (Number(column.surface_casing_width) || 0) +
    (Number(column.regular_casing_spacing_width) || 0) +
    (Number(column.regular_casing_width) || 0);
  return 100 - sum;
}

export const PHOTO_TOGGLES: FieldToggle[] = [
  { key: "show_photo_column", label: "Column" },
  { key: "show_photo_row", label: "Row" },
  { key: "show_captions", label: "Captions" },
  { key: "photo_grid_background", label: "Grid background" },
  { key: "first_page_only", label: "First page only" },
];

export const PHOTO_LAYOUT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "fixed", label: "Fixed" },
] as const;
