export type SampleIdFormatVariable = {
  /** Token stored in the format string (e.g. `{{project_number}}` or `%%lastUpdatedDateAU%%`). */
  value: string;
  /** Sidebar / chip label. */
  name: string;
  /** Optional hint shown under the variable name. */
  hint?: string;
  /** Example value used in the live preview. */
  example: string;
};

export const DEFAULT_AUTO_SAMPLE_ID_FORMAT_STRING =
  "{{project_number}}_{{log_name}}_{{depth_from}}_{{depth_to}}_{{qc_sample_id}}";

/** Tablogs `/api/sample-id-variable` catalog + date tokens from the Angular string builder. */
export const SAMPLE_ID_FORMAT_VARIABLES: readonly SampleIdFormatVariable[] = [
  { value: "{{project_number}}", name: "project_number", example: "RTG123" },
  { value: "{{project_name}}", name: "project_name", example: "Project Alpha" },
  { value: "{{log_name}}", name: "log_name", example: "th1" },
  { value: "{{sample_type}}", name: "sample_type", example: "U50 Tube" },
  { value: "{{depth_from}}", name: "depth_from", example: "3" },
  { value: "{{depth_to}}", name: "depth_to", example: "5" },
  { value: "{{qc_sample_id}}", name: "qc_sample_id", example: "QC001" },
  {
    value: "{{sample_type_count}}",
    name: "sample_type_count",
    hint: "Count as 1, 2, 3...",
    example: "1",
  },
  {
    value: "{{sample_type_count_padded}}",
    name: "sample_type_count_padded",
    hint: "Count as 01, 02, 03...",
    example: "01",
  },
  { value: "{{sample_count}}", name: "sample_count", example: "6" },
  { value: "{{sample_abbreviation}}", name: "sample_abbreviation", example: "U50T" },
  { value: "%%lastUpdatedDateAU%%", name: "DD/MM/YYYY", example: "29/07/2026" },
  { value: "%%lastUpdatedDateUS%%", name: "MM/DD/YYYY", example: "07/29/2026" },
];

const VARIABLE_BY_VALUE = new Map(
  SAMPLE_ID_FORMAT_VARIABLES.map((entry) => [entry.value, entry] as const)
);

export type SampleIdFormatToken =
  | { kind: "variable"; value: string; name: string }
  | { kind: "text"; value: string };

const TOKEN_PATTERN = /(\{\{[^{}]+\}\}|%%[A-Za-z0-9_]+%%)/g;

export function findSampleIdFormatVariable(value: string): SampleIdFormatVariable | undefined {
  return VARIABLE_BY_VALUE.get(value);
}

export function parseSampleIdFormatString(format: string | null | undefined): SampleIdFormatToken[] {
  const source = typeof format === "string" ? format : "";
  if (!source) return [];

  const tokens: SampleIdFormatToken[] = [];
  let lastIndex = 0;

  for (const match of source.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ kind: "text", value: source.slice(lastIndex, index) });
    }

    const raw = match[0];
    const known = findSampleIdFormatVariable(raw);
    tokens.push({
      kind: "variable",
      value: raw,
      name: known?.name ?? raw.replace(/^\{\{|\}\}$/g, "").replace(/^%%|%%$/g, ""),
    });
    lastIndex = index + raw.length;
  }

  if (lastIndex < source.length) {
    tokens.push({ kind: "text", value: source.slice(lastIndex) });
  }

  return tokens;
}

export function serializeSampleIdFormatTokens(tokens: readonly SampleIdFormatToken[]): string {
  return tokens
    .map((token) => (token.kind === "variable" ? token.value : token.value))
    .join("");
}

export function previewSampleIdFormatString(format: string | null | undefined): string {
  const tokens = parseSampleIdFormatString(format);
  return tokens
    .map((token) => {
      if (token.kind === "text") return token.value;
      return findSampleIdFormatVariable(token.value)?.example ?? token.name;
    })
    .join("");
}

export function normalizeAutoSampleIdFormatString(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_AUTO_SAMPLE_ID_FORMAT_STRING;
  const trimmed = value.trim();
  return trimmed || DEFAULT_AUTO_SAMPLE_ID_FORMAT_STRING;
}
