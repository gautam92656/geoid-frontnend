import { getLogReportCatalog } from "../services/logTemplateApi";

export type LogReportFieldCodeGroup = "density" | "consistency" | "moisture";

export type LogReportFieldCodeRow = {
  group: LogReportFieldCodeGroup;
  code: string;
  name: string;
  aliases: string[];
};

type CodeEntry = {
  code: string;
  aliases: string[];
};

/** Same rows as `prisma/seed/logReportCatalog.ts` until the catalog API loads. */
const FALLBACK_FIELD_CODES: LogReportFieldCodeRow[] = [
  { group: "density", code: "VL", name: "Very Loose", aliases: ["vl", "very loose", "veryloose"] },
  { group: "density", code: "L", name: "Loose", aliases: ["l", "loose"] },
  { group: "density", code: "MD", name: "Medium Dense", aliases: ["md", "medium dense", "mediumdense", "medium"] },
  { group: "density", code: "D", name: "Dense", aliases: ["d", "dense"] },
  { group: "density", code: "VD", name: "Very Dense", aliases: ["vd", "very dense", "verydense"] },
  { group: "consistency", code: "VS", name: "Very Soft", aliases: ["vs", "very soft", "verysoft"] },
  { group: "consistency", code: "S", name: "Soft", aliases: ["s", "soft"] },
  { group: "consistency", code: "F", name: "Firm", aliases: ["f", "firm"] },
  { group: "consistency", code: "St", name: "Stiff", aliases: ["st", "stiff"] },
  { group: "consistency", code: "VSt", name: "Very Stiff", aliases: ["vst", "very stiff", "verystiff"] },
  { group: "consistency", code: "H", name: "Hard", aliases: ["h", "hard"] },
  { group: "consistency", code: "FR", name: "Friable", aliases: ["fr", "friable"] },
  { group: "moisture", code: "D", name: "Dry", aliases: ["d", "dry"] },
  { group: "moisture", code: "M", name: "Moist", aliases: ["m", "moist"] },
  { group: "moisture", code: "W", name: "Wet", aliases: ["w", "wet"] },
  { group: "moisture", code: "w < PL", name: "w < PL", aliases: ["w < pl", "w<pl"] },
  { group: "moisture", code: "w = PL", name: "w = PL", aliases: ["w = pl", "w=pl"] },
  { group: "moisture", code: "w > PL", name: "w > PL", aliases: ["w > pl", "w>pl"] },
  { group: "moisture", code: "w ≈ LL", name: "w ≈ LL", aliases: ["w ≈ ll", "w = ll", "w=ll", "w≈ll", "approximately ll"] },
  { group: "moisture", code: "w > LL", name: "w > LL", aliases: ["w > ll", "w>ll"] },
];

let activeCatalog: LogReportFieldCodeRow[] = FALLBACK_FIELD_CODES;
let loadPromise: Promise<void> | null = null;

function isFieldCodeGroup(value: string): value is LogReportFieldCodeGroup {
  return value === "density" || value === "consistency" || value === "moisture";
}

export function setLogReportFieldCodeCatalog(rows: LogReportFieldCodeRow[] | null | undefined) {
  const next = (rows ?? []).filter((row) => isFieldCodeGroup(row.group));
  activeCatalog = next.length > 0 ? next : FALLBACK_FIELD_CODES;
}

export async function ensureLogReportFieldCodeCatalog(): Promise<void> {
  if (!loadPromise) {
    loadPromise = getLogReportCatalog()
      .then((catalog) => {
        setLogReportFieldCodeCatalog(catalog.fieldCodes);
      })
      .catch(() => {
        loadPromise = null;
      });
  }
  await loadPromise;
}

function entriesByGroup(group: LogReportFieldCodeGroup): CodeEntry[] {
  return activeCatalog
    .filter((row) => row.group === group)
    .map((row) => ({ code: row.code, aliases: row.aliases }));
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/≈/g, "=").replace(/\s+/g, " ");
}

function lookupInEntries(token: string, entries: readonly CodeEntry[]): string | null {
  const normalized = normalizeToken(token);
  if (!normalized) return null;

  for (const entry of entries) {
    if (normalizeToken(entry.code) === normalized) return entry.code;
  }

  const ranked = entries
    .flatMap((entry) =>
      entry.aliases.map((alias) => ({ code: entry.code, alias: normalizeToken(alias) }))
    )
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const entry of ranked) {
    if (entry.alias === normalized) return entry.code;
  }
  return null;
}

export function groupForWorkflowStep(step: {
  name?: string;
  fieldName?: string;
  databaseField?: string;
}): LogReportFieldCodeGroup | null {
  const blob = `${step.fieldName ?? ""} ${step.name ?? ""} ${step.databaseField ?? ""}`.toLowerCase();
  if (blob.includes("moist")) return "moisture";
  if (blob.includes("densit")) return "density";
  if (blob.includes("consist") || blob.includes("stiff")) return "consistency";
  return null;
}

export function resolveLogReportFieldCode(
  raw: string,
  group?: LogReportFieldCodeGroup | null
): string {
  const token = raw.trim();
  if (!token) return "";

  const groups: LogReportFieldCodeGroup[] = group
    ? [group]
    : ["consistency", "density", "moisture"];

  for (const next of groups) {
    const code = lookupInEntries(token, entriesByGroup(next));
    if (code) return code;
  }
  return token;
}
