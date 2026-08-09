import { isRecord } from "./helpers";
import type { ModuleNamedOption } from "./types";

export type ColorOption = ModuleNamedOption & {
  /** Fill / chip background color (hex). */
  color?: string | null;
  /** Label text color over the swatch (hex). */
  textColor?: string | null;
};

export const COLOR_TEXT_COLOR_OPTIONS = [
  { value: "#ffffff", label: "White" },
  { value: "#000000", label: "Black" },
] as const;

export const DEFAULT_COLOR_OPTIONS: ColorOption[] = [
  { id: "pale-brown", name: "pale brown", color: "#cea475", textColor: "#ffffff" },
  { id: "white", name: "white", color: "#ffffff", textColor: "#000000" },
  { id: "pale-grey", name: "pale grey", color: "#d3d3d3", textColor: "#000000" },
  {
    id: "brown-to-orange-brown",
    name: "brown to orange brown",
    color: "#c46a2b",
    textColor: "#ffffff",
  },
  {
    id: "brown-to-dark-brown",
    name: "brown to dark brown",
    color: "#5d4037",
    textColor: "#ffffff",
  },
  { id: "brown-grey", name: "brown-grey", color: "#8d7b6a", textColor: "#ffffff" },
  { id: "brown", name: "Brown", color: "#795548", textColor: "#ffffff" },
  { id: "yellow", name: "Yellow", color: "#ffeb3b", textColor: "#000000" },
  { id: "orange", name: "Orange", color: "#ff9800", textColor: "#000000" },
  { id: "grey", name: "Grey", color: "#7f7f7f", textColor: "#ffffff" },
  { id: "black", name: "Black", color: "#000000", textColor: "#ffffff" },
  { id: "red", name: "Red", color: "#f44336", textColor: "#ffffff" },
  { id: "grey-brown", name: "Grey-Brown", color: "#6d5c4d", textColor: "#ffffff" },
  { id: "dark-brown", name: "dark brown", color: "#3e2723", textColor: "#ffffff" },
  { id: "to", name: "to", color: "#9e9e9e", textColor: "#000000" },
];

export function normalizeColorHex(value: string | null | undefined, fallback = "#795548"): string {
  const trimmed = (value ?? "").trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) {
    if (trimmed.length === 4) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    if (trimmed.length === 9) {
      return trimmed.slice(0, 7).toLowerCase();
    }
    return trimmed.toLowerCase();
  }

  const match = trimmed.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/i
  );
  if (!match) return fallback.toLowerCase();
  const toHex = (part: string) => Number(part).toString(16).padStart(2, "0");
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
}

export function normalizeTextColorHex(value: string | null | undefined): string {
  const hex = normalizeColorHex(value, "#ffffff");
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#ffffff" : "#000000";
}

export function createBlankColorOption(partial?: Partial<ColorOption>): ColorOption {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "",
    color: normalizeColorHex(partial?.color, "#795548"),
    textColor: normalizeTextColorHex(partial?.textColor ?? "#ffffff"),
  };
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseColorOption(value: unknown, index: number): ColorOption | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : typeof value.id === "number"
        ? String(value.id)
        : `color-${index + 1}`;

  const color =
    asNullableString(value.color) ??
    asNullableString(value.fill) ??
    null;
  const textColor =
    asNullableString(value.textColor) ??
    asNullableString(value.text_color) ??
    asNullableString(value.text) ??
    null;

  return {
    id,
    name,
    color: color ? normalizeColorHex(color) : "#795548",
    textColor: normalizeTextColorHex(textColor ?? "#ffffff"),
  };
}

export function parseColorOptions(
  value: unknown,
  fallback: ColorOption[] = DEFAULT_COLOR_OPTIONS
): ColorOption[] {
  if (!Array.isArray(value)) {
    return fallback.map((entry) => ({ ...entry }));
  }

  const options: ColorOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    const parsed = parseColorOption(entry, index);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(parsed);
  }

  return options.length > 0 ? options : fallback.map((entry) => ({ ...entry }));
}

export function cloneColorOption(entry: ColorOption): ColorOption {
  return { ...entry };
}

export function toColorModuleNamedOption(entry: ColorOption): ModuleNamedOption {
  return {
    id: entry.id,
    name: entry.name,
    color: entry.color ?? null,
    textColor: entry.textColor ?? null,
  };
}
