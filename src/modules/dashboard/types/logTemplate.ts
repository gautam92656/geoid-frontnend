export type LogTemplateLogType = "borelog" | "corelog";

export type LogTemplateColumnType =
  | "text"
  | "text_graphic"
  | "scale"
  | "graphic"
  | "photo"
  | "chart";

export type LogTemplateWidthBehavior = "dynamic" | "fixed";

export type LogTemplateDataSource = {
  group: string;
  value: string;
};

export type LogTemplateNameConfig = {
  fontSize: number;
  fontFamily: string;
  name_text_font_bold: boolean;
  name_text_font_italic: boolean;
  name_text_wrap: boolean;
  name_text_align_type: string;
  name_text_vertical_align: string;
  name_font_size?: number;
  name_font_weight?: string;
};

export type LogTemplateTextFormatting = {
  bold: boolean;
  italic: boolean;
  alignLeft: boolean;
  alignCenter: boolean;
  alignRight: boolean;
  alignJustify: boolean;
  fontFamily: string;
  fontSize: number;
  reversed: boolean;
  indent: boolean;
  outdent: boolean;
  text_font_bold: boolean;
  text_font_italic: boolean;
  material_text_align_type: string;
  text_wrap: boolean;
  text_vertical_align: string;
};

export type LogTemplateChartSeries = Record<string, unknown> & {
  chart_type?: string;
  column_data_source?: LogTemplateDataSource;
  fill_color?: string;
  line_color?: string;
  line_type?: string;
  axis_bounds_min?: number | string;
  axis_bounds_max?: number | string;
  axis_units_minor?: number | string;
  axis_units_major?: number | string;
  axis_label?: boolean;
  symbol_type?: string;
  symbol_color?: string;
};

export type LogTemplateColumn = Record<string, unknown> & {
  text: string;
  code: string;
  hidden: boolean;
  visibility: boolean;
  width: number | string;
  column_type: LogTemplateColumnType;
  column_data_source: LogTemplateDataSource | string;
  default_column?: boolean;
  fontSize?: number | string;
  name_vertical?: boolean;
  vertical_text?: boolean;
  text_wrap?: boolean;
  name_config?: LogTemplateNameConfig;
  displayType?: string;
  fontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  textWrap?: boolean;
  alignment?: string;
  verticalAlign?: string;
  width_behavior?: LogTemplateWidthBehavior;
  textFormatting?: LogTemplateTextFormatting;
  chart_data?: LogTemplateChartSeries[];
  chart_type?: string;
  stringBuilder?: Array<Record<string, unknown>>;
  stringBuilderColumns?: Array<Record<string, unknown>>;
  child_columns?: LogTemplateColumn[];
  isParent?: boolean;
};

export type LogTemplateConfig = {
  columnData: LogTemplateColumn[];
  name_config?: LogTemplateNameConfig;
  depth_per_page?: number;
  text_config?: { fontFamily?: string };
  templatePageSizeId?: string;
  template_page_size?: string;
  template_orientation?: "portrait" | "landscape";
  percentages_header?: string | number;
  percentages_footer?: string | number;
  hide_all_column_headings?: boolean;
  header_position?: string;
  finish_log_target_column_id?: string;
  finish_log_wrap_at_column_boundary?: boolean;
  finish_text_from?: string;
  template_finish_text_data?: unknown;
  extend_column_boundaries_type?: string;
  hide_watermark?: boolean;
  column_heading_height?: number | null;
  parent_column_height_percentage?: number | null;
  fence_stick_width?: number;
};

export type LogTemplateRecord = {
  id: string;
  name: string;
  logType: LogTemplateLogType;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
  logConfigurationIds: string[];
  config: LogTemplateConfig;
  templateVersion?: number;
};

export type LogTemplateSelectionItem = {
  name: string;
  code: string;
  group_code: string;
};

export type LogTemplateSelectionGroup = {
  name: string;
  code: string;
  data: LogTemplateSelectionItem[];
};

export type LogTemplateSoilGraphic = {
  code: string;
  path: string;
  url: string;
  full_path: string;
};

export type LogTemplateListPayload = {
  borelog: LogTemplateRecord[];
  corelog: LogTemplateRecord[];
};
