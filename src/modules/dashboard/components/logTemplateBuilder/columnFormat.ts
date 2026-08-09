import type { LogTemplateColumn } from "../../types/logTemplate";
import { createDefaultNameConfig, createDefaultTextFormatting } from "./contentSchema";

export const LOG_TEMPLATE_FONT_FAMILIES = [
  "sans-serif",
  "Arial",
  "Arial Narrow",
  "Helvetica",
  "Roboto",
  "Roboto Condensed",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
  "Calibri",
  "Trebuchet MS",
  "Impact",
  "Palatino",
  "Garamond",
  "Book Antiqua",
  "Comic Sans MS",
  "Arial Black",
  "Lucida Sans Unicode",
  "Tahoma",
  "Franklin Gothic Medium",
  "Century Gothic",
  "Candara",
  "Segoe UI",
] as const;

export type TextAlign = "left" | "center" | "right" | "justify";
export type VerticalAlign = "top" | "middle" | "bottom";

export const TEXT_ALIGN_OPTIONS: TextAlign[] = ["left", "center", "right", "justify"];
export const VERTICAL_ALIGN_OPTIONS: VerticalAlign[] = ["top", "middle", "bottom"];

/** The renderer stores alignment as `text_align_<x>`; the UI works with the bare value. */
function toAlignToken(align: TextAlign): string {
  return `text_align_${align}`;
}

function fromAlignToken(token: unknown, fallback: TextAlign): TextAlign {
  const value = String(token ?? "").replace("text_align_", "");
  return TEXT_ALIGN_OPTIONS.includes(value as TextAlign) ? (value as TextAlign) : fallback;
}

function toVerticalAlign(value: unknown, fallback: VerticalAlign = "middle"): VerticalAlign {
  return VERTICAL_ALIGN_OPTIONS.includes(value as VerticalAlign)
    ? (value as VerticalAlign)
    : fallback;
}

export type TextFormatValue = {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  verticalAlign: VerticalAlign;
  wrap: boolean;
  vertical: boolean;
};

export type TextFormatTarget = "heading" | "body";

export function readTextFormat(
  column: LogTemplateColumn,
  target: TextFormatTarget
): TextFormatValue {
  if (target === "heading") {
    const name = { ...createDefaultNameConfig(), ...column.name_config };
    return {
      fontFamily: name.fontFamily || "sans-serif",
      fontSize: Number(name.fontSize) || 8,
      bold: Boolean(name.name_text_font_bold),
      italic: Boolean(name.name_text_font_italic),
      align: fromAlignToken(name.name_text_align_type, "center"),
      verticalAlign: toVerticalAlign(name.name_text_vertical_align),
      wrap: name.name_text_wrap !== false,
      vertical: Boolean(column.name_vertical ?? column.verticalHead),
    };
  }

  const body = { ...createDefaultTextFormatting(), ...column.textFormatting };
  return {
    fontFamily: body.fontFamily || "sans-serif",
    fontSize: Number(body.fontSize) || 8,
    bold: Boolean(body.text_font_bold),
    italic: Boolean(body.text_font_italic),
    align: fromAlignToken(body.material_text_align_type, "left"),
    verticalAlign: toVerticalAlign(body.text_vertical_align),
    wrap: Boolean(body.text_wrap ?? column.text_wrap),
    vertical: Boolean(column.vertical_text),
  };
}

export function applyTextFormat(
  column: LogTemplateColumn,
  target: TextFormatTarget,
  patch: Partial<TextFormatValue>
): Partial<LogTemplateColumn> {
  const next = { ...readTextFormat(column, target), ...patch };

  if (target === "heading") {
    return {
      name_config: {
        ...createDefaultNameConfig(),
        ...column.name_config,
        fontFamily: next.fontFamily,
        fontSize: next.fontSize,
        name_text_font_bold: next.bold,
        name_text_font_italic: next.italic,
        name_text_align_type: toAlignToken(next.align),
        name_text_vertical_align: next.verticalAlign,
        name_text_wrap: next.wrap,
      },
      fontFamily: next.fontFamily,
      fontSize: next.fontSize,
      isBold: next.bold,
      isItalic: next.italic,
      alignment: next.align,
      verticalAlign: next.verticalAlign,
      textWrap: next.wrap,
      name_vertical: next.vertical,
      verticalHead: next.vertical,
    };
  }

  return {
    textFormatting: {
      ...createDefaultTextFormatting(),
      ...column.textFormatting,
      fontFamily: next.fontFamily,
      fontSize: next.fontSize,
      bold: next.bold,
      italic: next.italic,
      text_font_bold: next.bold,
      text_font_italic: next.italic,
      alignLeft: next.align === "left",
      alignCenter: next.align === "center",
      alignRight: next.align === "right",
      alignJustify: next.align === "justify",
      material_text_align_type: toAlignToken(next.align),
      text_vertical_align: next.verticalAlign,
      text_wrap: next.wrap,
    },
    material_text_align_type: toAlignToken(next.align),
    text_wrap: next.wrap,
    vertical_text: next.vertical,
  };
}
