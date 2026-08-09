import { RENDERER_PLACEHOLDERS, type RendererPlaceholder } from "./rendererRegistry";

export type DynamicStringToken =
  | { kind: "variable"; token: string; label: string }
  | { kind: "text"; value: string };

const TOKEN_RE = /\{\{\s*[^}]+\s*\}\}/g;

const PLACEHOLDER_BY_TOKEN = new Map(
  RENDERER_PLACEHOLDERS.map((placeholder) => [placeholder.token, placeholder] as const)
);

export function findRendererPlaceholder(token: string): RendererPlaceholder | undefined {
  return PLACEHOLDER_BY_TOKEN.get(token);
}

export function parseDynamicString(value: string): DynamicStringToken[] {
  if (!value) return [];
  const tokens: DynamicStringToken[] = [];
  let cursor = 0;
  for (const match of value.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      tokens.push({ kind: "text", value: value.slice(cursor, index) });
    }
    const raw = match[0];
    const placeholder = PLACEHOLDER_BY_TOKEN.get(raw);
    if (placeholder) {
      tokens.push({
        kind: "variable",
        token: placeholder.token,
        label: placeholder.label,
      });
    } else {
      tokens.push({ kind: "text", value: raw });
    }
    cursor = index + raw.length;
  }
  if (cursor < value.length) {
    tokens.push({ kind: "text", value: value.slice(cursor) });
  }
  return mergeAdjacentTextTokens(tokens);
}

export function serializeDynamicString(tokens: readonly DynamicStringToken[]): string {
  return tokens
    .map((token) => (token.kind === "variable" ? token.token : token.value))
    .join("");
}

export function mergeAdjacentTextTokens(tokens: DynamicStringToken[]): DynamicStringToken[] {
  const merged: DynamicStringToken[] = [];
  for (const token of tokens) {
    const last = merged[merged.length - 1];
    if (token.kind === "text" && last?.kind === "text") {
      last.value += token.value;
      continue;
    }
    if (token.kind === "text" && token.value.length === 0) continue;
    merged.push(token.kind === "text" ? { ...token } : { ...token });
  }
  return merged;
}

export function previewDynamicString(value: string): string {
  let resolved = value;
  for (const placeholder of RENDERER_PLACEHOLDERS) {
    resolved = resolved.split(placeholder.token).join(placeholder.sample || placeholder.label);
  }
  return resolved.replace(/\{\{\s*[^}]+\s*\}\}/g, "");
}
