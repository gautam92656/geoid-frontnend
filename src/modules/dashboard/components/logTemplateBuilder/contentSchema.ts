import type {
  LogTemplateColumn,
  LogTemplateColumnType,
  LogTemplateConfig,
  LogTemplateDataSource,
  LogTemplateNameConfig,
  LogTemplateTextFormatting,
  LogTemplateWidthBehavior,
} from "../../types/logTemplate";
import { applyPresetColumnGuards } from "./columnTypeFields";
import { asDataSourceObject } from "./selectDataBinding";

export const LOG_TEMPLATE_COLUMN_TYPES: Array<{
  value: LogTemplateColumnType;
  label: string;
}> = [
  { value: "text", label: "Text" },
  { value: "text_graphic", label: "Text + Graphic" },
  { value: "scale", label: "Scale" },
  { value: "graphic", label: "Graphic" },
  { value: "photo", label: "Photo" },
  { value: "chart", label: "Chart" },
];

export const LOG_TEMPLATE_PAGE_SIZES = ["A4", "Letter", "Legal"] as const;
export const LOG_TEMPLATE_ORIENTATIONS = ["portrait", "landscape"] as const;

export function createDefaultNameConfig(): LogTemplateNameConfig {
  return {
    fontSize: 8,
    fontFamily: "sans-serif",
    name_text_font_bold: true,
    name_text_font_italic: false,
    name_text_wrap: true,
    name_text_align_type: "text_align_center",
    name_text_vertical_align: "middle",
  };
}

export function createDefaultTextFormatting(): LogTemplateTextFormatting {
  return {
    bold: false,
    italic: false,
    alignLeft: true,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    fontFamily: "sans-serif",
    fontSize: 8,
    reversed: false,
    indent: false,
    outdent: false,
    text_font_bold: false,
    text_font_italic: false,
    material_text_align_type: "text_align_left",
    text_wrap: false,
    text_vertical_align: "middle",
  };
}

export function createEmptyDataSource(): LogTemplateDataSource {
  return { group: "", value: "" };
}

export function createBlankColumn(
  partial: Partial<LogTemplateColumn> & Pick<LogTemplateColumn, "text" | "code">
): LogTemplateColumn {
  const {
    text,
    code,
    column_type = "text",
    column_data_source = createEmptyDataSource(),
    ...rest
  } = partial;

  return {
    hidden: false,
    visibility: true,
    width: 10,
    default_column: false,
    copy_default_column: "Configurable",
    fontSize: 8,
    name_vertical: true,
    vertical_text: false,
    text_wrap: true,
    name_config: createDefaultNameConfig(),
    displayType: "Text",
    verticalHead: true,
    fontFamily: "sans-serif",
    isBold: true,
    isItalic: false,
    textWrap: true,
    alignment: "center",
    verticalAlign: "middle",
    width_behavior: "dynamic",
    textFormatting: createDefaultTextFormatting(),
    chart_data: [],
    stringBuilder: [],
    stringBuilderColumns: [],
    selectedFilterOptions: [],
    selectedColumnOptions: [],
    selected_option_keys: [],
    selectedOptions: [],
    ...rest,
    text,
    code,
    column_type,
    column_data_source,
  };
}

export function createDefaultLogTemplateConfig(): LogTemplateConfig {
  return {
    columnData: [],
    name_config: createDefaultNameConfig(),
    depth_per_page: 2,
    text_config: { fontFamily: "sans-serif" },
    templatePageSizeId: "A4",
    template_page_size: "A4",
    template_orientation: "portrait",
    percentages_header: "0",
    percentages_footer: "0",
    hide_all_column_headings: false,
    header_position: "top",
    finish_log_target_column_id: "",
    finish_log_wrap_at_column_boundary: true,
    finish_text_from: "log_configuration",
    template_finish_text_data: null,
    extend_column_boundaries_type: "bottom",
    hide_watermark: false,
    column_heading_height: null,
    parent_column_height_percentage: null,
    fence_stick_width: 80,
  };
}

export function cloneConfig(config: LogTemplateConfig): LogTemplateConfig {
  return structuredClone(config);
}

export function normalizeLogTemplateConfig(
  input: unknown,
  fallback: LogTemplateConfig = createDefaultLogTemplateConfig()
): LogTemplateConfig {
  if (!input || typeof input !== "object") return cloneConfig(fallback);

  const raw = input as Partial<LogTemplateConfig> & { columnData?: unknown };
  const columnData = Array.isArray(raw.columnData)
    ? raw.columnData.map((column, index) => normalizeColumn(column, index))
    : cloneConfig(fallback).columnData;

  return {
    ...cloneConfig(fallback),
    ...raw,
    columnData,
    name_config: {
      ...createDefaultNameConfig(),
      ...(raw.name_config ?? {}),
    },
    text_config: {
      fontFamily: "sans-serif",
      ...(raw.text_config ?? {}),
    },
  };
}

function normalizeColumn(input: unknown, index: number): LogTemplateColumn {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<LogTemplateColumn>;
  const code =
    typeof raw.code === "string" && raw.code.trim()
      ? raw.code
      : `column_${Date.now()}_${index}`;
  const text = typeof raw.text === "string" && raw.text.trim() ? raw.text : `Column ${index + 1}`;
  const columnType = (raw.column_type ?? "text") as LogTemplateColumnType;
  const widthBehavior = (raw.width_behavior ?? "dynamic") as LogTemplateWidthBehavior;

  return applyPresetColumnGuards({
    ...createBlankColumn({ text, code, column_type: columnType }),
    ...raw,
    text,
    code,
    column_type: columnType,
    hidden: Boolean(raw.hidden),
    visibility: raw.visibility !== false && !raw.hidden,
    width: raw.width ?? 10,
    width_behavior: widthBehavior,
    // Tablogs remarks/samples/testing store multi Select Data as a comma-separated string.
    column_data_source:
      typeof raw.column_data_source === "string"
        ? raw.column_data_source
        : asDataSourceObject(raw.column_data_source),
    name_config: {
      ...createDefaultNameConfig(),
      ...(raw.name_config ?? {}),
    },
    textFormatting: {
      ...createDefaultTextFormatting(),
      ...(raw.textFormatting ?? {}),
    },
    chart_data: Array.isArray(raw.chart_data) ? raw.chart_data : [],
  });
}

export function isColumnVisible(column: LogTemplateColumn): boolean {
  return column.visibility !== false && !column.hidden;
}

export function getColumnTypeLabel(type: LogTemplateColumnType): string {
  return LOG_TEMPLATE_COLUMN_TYPES.find((entry) => entry.value === type)?.label ?? type;
}
