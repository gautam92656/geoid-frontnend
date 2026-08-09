import { isRecord, option } from "../helpers";
import { DEFAULT_ORIGIN_OPTIONS, toModuleNamedOption } from "../origin";
import {
  DEFAULT_FINISHING_REASON_OPTIONS,
  toFinishingReasonModuleNamedOption,
} from "../finishingReason";
import {
  DEFAULT_NON_SOIL_TYPE_OPTIONS,
  toNonSoilTypeModuleNamedOption,
} from "../nonSoilType";
import {
  DEFAULT_ROCK_TYPE_OPTIONS,
  toRockTypeModuleNamedOption,
} from "../rockType";
import {
  DEFAULT_COLOR_OPTIONS,
  toColorModuleNamedOption,
} from "../colorOption";
import {
  DEFAULT_GEOMODAL_LAYER_OPTIONS,
  toGeomodalLayerModuleNamedOption,
} from "../geomodalLayer";
import type { ModuleNamedOption, ModuleSettingsSpec, SubsurfacesModuleConfig } from "../types";

export const SUBSURFACES_MODULE_ID = "subsurfaces" as const;

export type { SubsurfacesModuleConfig };

const SUBSURFACE_DATA_TYPE_IDS = [
  "origin",
  "finish-reasons",
  "rock_type",
  "non_soil_type",
  "rock_texture",
  "colors",
  "geomodal_layer",
] as const;

const DEFAULT_ALLOW_USERS_TO_MANAGE: Record<
  (typeof SUBSURFACE_DATA_TYPE_IDS)[number],
  boolean
> = {
  origin: true,
  "finish-reasons": false,
  rock_type: true,
  non_soil_type: true,
  rock_texture: true,
  colors: true,
  geomodal_layer: true,
};

function parseNamedOptionsList(value: unknown): ModuleNamedOption[] {
  if (!Array.isArray(value)) return [];
  const options: ModuleNamedOption[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) continue;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const id =
      typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : `finish-text-${index + 1}`;
    options.push({ id, name });
  }

  return options;
}

export function createDefaultSubsurfacesConfig(): SubsurfacesModuleConfig {
  return {
    munsellColorPicker: false,
    applyColourAsOverlay: false,
    switchImperialMetric: false,
    switchFtInches: false,
    allowUsersToManage: { ...DEFAULT_ALLOW_USERS_TO_MANAGE },
    finishTexts: [],
  };
}

export function parseSubsurfacesConfig(value: unknown): SubsurfacesModuleConfig {
  const defaults = createDefaultSubsurfacesConfig();
  if (!isRecord(value)) return defaults;

  const allowSource = isRecord(value.allowUsersToManage) ? value.allowUsersToManage : {};
  const allowUsersToManage: Record<string, boolean> = { ...defaults.allowUsersToManage };
  for (const dataTypeId of SUBSURFACE_DATA_TYPE_IDS) {
    const entry = allowSource[dataTypeId];
    if (typeof entry === "boolean") allowUsersToManage[dataTypeId] = entry;
  }

  return {
    munsellColorPicker:
      typeof value.munsellColorPicker === "boolean"
        ? value.munsellColorPicker
        : defaults.munsellColorPicker,
    applyColourAsOverlay:
      typeof value.applyColourAsOverlay === "boolean"
        ? value.applyColourAsOverlay
        : defaults.applyColourAsOverlay,
    switchImperialMetric:
      typeof value.switchImperialMetric === "boolean"
        ? value.switchImperialMetric
        : defaults.switchImperialMetric,
    switchFtInches:
      typeof value.switchFtInches === "boolean" ? value.switchFtInches : defaults.switchFtInches,
    allowUsersToManage,
    finishTexts: parseNamedOptionsList(value.finishTexts),
  };
}

export const subsurfacesModule: ModuleSettingsSpec = {
  id: SUBSURFACES_MODULE_ID,
  displayName: "Subsurface",
  dataTypes: [
    { id: "origin", name: "Origin", editable: true },
    { id: "finish-reasons", name: "Finishing Reasons", editable: true },
    { id: "rock_type", name: "Rock Types", editable: true },
    { id: "non_soil_type", name: "Non-Soil Types", editable: true },
    { id: "rock_texture", name: "Rock Textures", editable: true },
    { id: "colors", name: "Colors", editable: true },
    { id: "geomodal_layer", name: "Geomodel Layers", editable: true },
  ],
  defaultOptions: {
    origin: DEFAULT_ORIGIN_OPTIONS.map((entry) => toModuleNamedOption(entry)),
    "finish-reasons": DEFAULT_FINISHING_REASON_OPTIONS.map((entry) =>
      toFinishingReasonModuleNamedOption(entry)
    ),
    "finish-texts": [],
    rock_type: DEFAULT_ROCK_TYPE_OPTIONS.map((entry) => toRockTypeModuleNamedOption(entry)),
    non_soil_type: DEFAULT_NON_SOIL_TYPE_OPTIONS.map((entry) =>
      toNonSoilTypeModuleNamedOption(entry)
    ),
    rock_texture: [
      option("glassy", "Glassy"),
      option("porphyritic", "Porphyritic"),
      option("crystalline", "Crystalline"),
      option("amorphous", "Amorphous"),
      option("vesicular", "Vesicular"),
    ],
    colors: DEFAULT_COLOR_OPTIONS.map((entry) => toColorModuleNamedOption(entry)),
    geomodal_layer: DEFAULT_GEOMODAL_LAYER_OPTIONS.map((entry) =>
      toGeomodalLayerModuleNamedOption(entry)
    ),
  },
  enrichDefaults: (settings) => ({
    ...settings,
    subsurface: createDefaultSubsurfacesConfig(),
  }),
  enrichParsed: (value, settings) => {
    const source = isRecord(value) && isRecord(value.subsurface) ? value.subsurface : value;
    return {
      ...settings,
      subsurface: parseSubsurfacesConfig(source),
    };
  },
  cloneExtra: (entry) =>
    entry.subsurface
      ? {
          subsurface: {
            ...entry.subsurface,
            allowUsersToManage: { ...entry.subsurface.allowUsersToManage },
            finishTexts: entry.subsurface.finishTexts.map((item) => ({ ...item })),
          },
        }
      : {},
};
