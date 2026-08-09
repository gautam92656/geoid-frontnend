import { listClassificationGraphics } from "../../services/classificationGraphicsApi";
import {
  getDrillingTypeTemplates,
  getSampleTypeTemplates,
  getWaterObservationTypeTemplates,
} from "../../services/configModulesApi";
import { DRILLING_OBSERVATIONS_MODULE_ID } from "../../utils/configModules/modules/drilling-observations";
import { SAMPLES_MODULE_ID } from "../../utils/configModules/modules/samples";
import { WATER_OBSERVATIONS_MODULE_ID } from "../../utils/configModules/modules/water-observations";
import {
  DEFAULT_WATER_OBSERVATION_TYPE_OPTIONS,
  getWaterObservationGraphicUrl,
} from "../../utils/configModules/waterObservationType";
import {
  DEFAULT_SAMPLE_TYPE_OPTIONS,
  getSampleTypeGraphicUrl,
} from "../../utils/configModules/sampleType";
import {
  createDrillingTypeOption,
  getDrillingGraphicUrl,
  type DrillingTypeOption,
} from "../../utils/configModules/drillingType";
import type { HfLegendCustomItem } from "./legendOptions";

export type LegendPreviewItem = {
  imageUrl: string;
  label: string;
  legendType?: string;
};

const FALLBACK_DRILLING_TYPES: DrillingTypeOption[] = [
  createDrillingTypeOption("auger", "Auger", { graphic: "graphic01.jpg", tablogsAlias: "auger" }),
  createDrillingTypeOption("washbore", "Washbore", {
    graphic: "graphic02.jpg",
    tablogsAlias: "washbore",
  }),
  createDrillingTypeOption("coring", "Coring", { graphic: "graphic03.jpg", tablogsAlias: "coring" }),
  createDrillingTypeOption("nmlc", "NMLC Coring", {
    graphic: "graphic04.jpg",
    tablogsAlias: "nmlc-coring",
  }),
  createDrillingTypeOption("hq", "HQ Coring", { graphic: "graphic05.jpg", tablogsAlias: "hq-coring" }),
  createDrillingTypeOption("direct-push", "Direct Push", {
    graphic: "graphic06.jpg",
    tablogsAlias: "direct-push",
  }),
];

const cache = new Map<string, Promise<LegendPreviewItem[]>>();

function namedGraphic(
  label: string,
  imageUrl: string,
  legendType?: string
): LegendPreviewItem | null {
  const trimmedLabel = label.trim();
  const trimmedUrl = imageUrl.trim();
  if (!trimmedLabel || !trimmedUrl) return null;
  return { label: trimmedLabel, imageUrl: trimmedUrl, ...(legendType ? { legendType } : {}) };
}

async function resolveWaterObservations(): Promise<LegendPreviewItem[]> {
  try {
    const { data } = await getWaterObservationTypeTemplates(WATER_OBSERVATIONS_MODULE_ID);
    if (Array.isArray(data) && data.length > 0) {
      return data
        .map((entry) =>
          namedGraphic(entry.name, getWaterObservationGraphicUrl(entry.graphic), "water_observations")
        )
        .filter((item): item is LegendPreviewItem => Boolean(item));
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_WATER_OBSERVATION_TYPE_OPTIONS.map((entry) =>
    namedGraphic(entry.name, getWaterObservationGraphicUrl(entry.graphic), "water_observations")
  ).filter((item): item is LegendPreviewItem => Boolean(item));
}

async function resolveTestingAndSample(): Promise<LegendPreviewItem[]> {
  try {
    const { data } = await getSampleTypeTemplates(SAMPLES_MODULE_ID);
    if (Array.isArray(data) && data.length > 0) {
      return data
        .map((entry) =>
          namedGraphic(
            entry.name,
            getSampleTypeGraphicUrl(entry.graphic, "test"),
            "testing_and_sample_type"
          )
        )
        .filter((item): item is LegendPreviewItem => Boolean(item));
    }
  } catch {
    // fall through
  }
  return DEFAULT_SAMPLE_TYPE_OPTIONS.map((entry) =>
    namedGraphic(
      entry.name,
      getSampleTypeGraphicUrl(entry.graphic, "test"),
      "testing_and_sample_type"
    )
  ).filter((item): item is LegendPreviewItem => Boolean(item));
}

async function resolveDrillingMethod(): Promise<LegendPreviewItem[]> {
  try {
    const { data } = await getDrillingTypeTemplates(DRILLING_OBSERVATIONS_MODULE_ID);
    if (Array.isArray(data) && data.length > 0) {
      return data
        .map((entry) =>
          namedGraphic(entry.name, getDrillingGraphicUrl(entry.graphic), "drilling_method")
        )
        .filter((item): item is LegendPreviewItem => Boolean(item));
    }
  } catch {
    // fall through
  }
  return FALLBACK_DRILLING_TYPES.map((entry) =>
    namedGraphic(entry.name, getDrillingGraphicUrl(entry.graphic), "drilling_method")
  ).filter((item): item is LegendPreviewItem => Boolean(item));
}

async function resolveSubsurfaceGraphics(): Promise<LegendPreviewItem[]> {
  try {
    const graphics = await listClassificationGraphics();
    return graphics
      .slice(0, 40)
      .map((entry) =>
        namedGraphic(entry.code, entry.full_path || `${entry.url}${entry.path}`, "subsurface_graphics")
      )
      .filter((item): item is LegendPreviewItem => Boolean(item));
  } catch {
    return [];
  }
}

async function resolveOne(legendType: string): Promise<LegendPreviewItem[]> {
  switch (legendType) {
    case "water_observations":
      return resolveWaterObservations();
    case "testing_and_sample_type":
      return resolveTestingAndSample();
    case "drilling_method":
      return resolveDrillingMethod();
    case "subsurface_graphics":
      return resolveSubsurfaceGraphics();
    case "site_plan_icons":
      return [];
    default:
      return [];
  }
}

/** Resolve legend symbol items for a single legend type (cached). */
export function resolveLegendType(legendType: string): Promise<LegendPreviewItem[]> {
  const key = legendType.trim();
  if (!key) return Promise.resolve([]);
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = resolveOne(key).catch(() => [] as LegendPreviewItem[]);
  cache.set(key, pending);
  return pending;
}

/** Resolve one or more legend types and concatenate items. */
export async function resolveLegendTypes(
  legendTypes: string[]
): Promise<LegendPreviewItem[]> {
  const unique = [...new Set(legendTypes.map((t) => t.trim()).filter(Boolean))];
  const groups = await Promise.all(unique.map((type) => resolveLegendType(type)));
  return groups.flat();
}

export function applyLegendVisibility(
  items: LegendPreviewItem[],
  visibility: string | undefined,
  customLabels: string[] | undefined,
  customItems: HfLegendCustomItem[] | undefined
): LegendPreviewItem[] {
  if (visibility === "custom") {
    if (customItems && customItems.length > 0) {
      return customItems.map((item) => ({
        label: item.label,
        imageUrl: item.imageUrl,
        legendType: item.legendType,
      }));
    }
    if (customLabels && customLabels.length > 0) {
      const allow = new Set(customLabels);
      return items.filter((item) => allow.has(item.label));
    }
  }
  // used-only needs live log presence — builder preview shows the full module set
  return items;
}

export function sortLegendItems(
  items: LegendPreviewItem[],
  sort: string | undefined
): LegendPreviewItem[] {
  const next = [...items];
  if (sort === "az") next.sort((a, b) => a.label.localeCompare(b.label));
  else if (sort === "za") next.sort((a, b) => b.label.localeCompare(a.label));
  return next;
}
