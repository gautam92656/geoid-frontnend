import apiClient from "@/shared/services/apiClient";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type {
  ConfigModuleDefinition,
  ConfigModuleScope,
  PaginatedConfigModules,
} from "../data/configModules";
import type { StoredModuleSettings } from "../utils/configModules";
import type { OriginOption } from "../utils/configModules/origin";
import type { InsituTestTypeOption } from "../utils/configModules/insituTestType";
import type { CoreDefectTypeOption } from "../utils/configModules/coreDefectType";
import type { ColorOption } from "../utils/configModules/colorOption";
import type { ApertureMineralOption } from "../utils/configModules/apertureMineral";
import type { InfillMaterialOption } from "../utils/configModules/infillMaterial";
import type { DrillingTypeOption } from "../utils/configModules/drillingType";
import type { DrillingResistanceOption } from "../utils/configModules/drillingResistance";
import type { DrillingObservationOption } from "../utils/configModules/drillingObservation";
import type { DrillingCasingOption } from "../utils/configModules/drillingCasing";
import type { RemarkTypeOption } from "../utils/configModules/remarkType";
import type { RemarksQuickNoteOption } from "../utils/configModules/remarksQuickNote";
import type { WaterObservationTypeOption } from "../utils/configModules/waterObservationType";
import type { SampleTypeOption } from "../utils/configModules/sampleType";
import type { LabTestTypeOption } from "../utils/configModules/labTestType";
import type { LabTestPresetOption } from "../utils/configModules/labTestPreset";
import type { WellTypeOption } from "../utils/configModules/wellType";
import type { WellCasingTypeOption } from "../utils/configModules/wellCasingType";
import type { WellCasingTopTypeOption } from "../utils/configModules/wellCasingTopType";
import type { WellCoverTypeOption } from "../utils/configModules/wellCoverType";
import type { WellProbeTypeOption } from "../utils/configModules/wellProbeType";
import type { WellBackfillTypeOption } from "../utils/configModules/wellBackfillType";
import type {
  WorkflowSettings,
  ModuleNamedOption,
} from "../utils/configModules/types";

type ApiEnvelope<T> = {
  message?: string;
  data: T;
};

const configParams = (id: string | number) => ({
  logConfigurationId: Number(id),
});

export type ListConfigModulesOptions = {
  search?: string;
  scope?: ConfigModuleScope;
  category?: string;
  availableOnly?: boolean;
  logConfigurationId?: string | number;
};

export type CreateConfigModulePayload = {
  slug: string;
  title: string;
  description: string;
  logConfigurationId: string | number;
  tags?: ConfigModuleDefinition["tags"];
  filterCategories?: string[];
  sourceSlug?: string | null;
  settings?: StoredModuleSettings | null;
  isAvailable?: boolean;
  sortOrder?: number;
};

export async function listConfigModules(
  page = 1,
  limit = MAX_TABLE_PAGE_SIZE,
  options: ListConfigModulesOptions = {}
): Promise<PaginatedConfigModules> {
  const params: Record<string, string | number> = {
    page,
    limit: Math.min(limit, MAX_TABLE_PAGE_SIZE),
    sortOrder: "asc",
    availableOnly: options.availableOnly === false ? "false" : "true",
  };

  const trimmedSearch = options.search?.trim();
  if (trimmedSearch) params.search = trimmedSearch;
  if (options.scope) params.scope = options.scope;
  if (options.category) params.category = options.category;
  if (options.logConfigurationId != null && options.logConfigurationId !== "") {
    Object.assign(params, configParams(options.logConfigurationId));
  }

  const res = await apiClient.get<ApiEnvelope<PaginatedConfigModules>>(
    "/config-modules",
    { params }
  );
  return res.data.data;
}

export async function createConfigModule(
  payload: CreateConfigModulePayload
): Promise<{ data: ConfigModuleDefinition; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<ConfigModuleDefinition>>(
    "/config-modules",
    payload
  );
  return { data: res.data.data, message: res.data.message };
}

/** Adopt a common template into the current user's module library for a log configuration (idempotent). */
export async function adoptConfigModule(
  templateSlug: string,
  logConfigurationId: string | number
): Promise<{ data: ConfigModuleDefinition; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<ConfigModuleDefinition>>(
    "/config-modules/adopt",
    { templateSlug, ...configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

/** Soft-remove an adopted module from this log configuration (idempotent). */
export async function unadoptConfigModule(
  templateSlug: string,
  logConfigurationId: string | number
): Promise<{ data: { message?: string; removed?: boolean }; message?: string }> {
  const res = await apiClient.post<
    ApiEnvelope<{ message?: string; removed?: boolean }>
  >("/config-modules/unadopt", {
    templateSlug,
    ...configParams(logConfigurationId),
  });
  return { data: res.data.data, message: res.data.message };
}

/** Persist per-log-configuration customizations keyed by template slug. */
export async function syncUserModuleSettings(
  modules: Record<string, StoredModuleSettings>,
  logConfigurationId: string | number
): Promise<{ data: ConfigModuleDefinition[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<ConfigModuleDefinition[]>>(
    "/config-modules/mine/settings",
    { modules, ...configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

/** Common workflow + classification defaults for a module template. */
export async function getWorkflowTemplate(
  moduleSlug: string
): Promise<{ data: WorkflowSettings }> {
  const res = await apiClient.get<ApiEnvelope<WorkflowSettings>>(
    `/config-modules/workflow-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped customized workflow + classification codes for a module. */
export async function getUserModuleWorkflow(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WorkflowSettings }> {
  const res = await apiClient.get<ApiEnvelope<WorkflowSettings>>(
    `/config-modules/mine/workflow/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

export async function saveUserModuleWorkflow(
  moduleSlug: string,
  workflow: WorkflowSettings,
  logConfigurationId: string | number
): Promise<{ data: WorkflowSettings; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<WorkflowSettings>>(
    `/config-modules/mine/workflow/${encodeURIComponent(moduleSlug)}`,
    workflow,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserModuleWorkflow(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WorkflowSettings; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WorkflowSettings>>(
    `/config-modules/mine/workflow/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

/** Common origin-option catalog defaults for a module template. */
export async function getOriginOptionTemplates(
  moduleSlug: string
): Promise<{ data: OriginOption[] }> {
  const res = await apiClient.get<ApiEnvelope<OriginOption[]>>(
    `/config-modules/origin-option-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped origin options (auto-seeded from templates on first load). */
export async function getUserOriginOptions(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: OriginOption[] }> {
  const res = await apiClient.get<ApiEnvelope<OriginOption[]>>(
    `/config-modules/mine/origin-options/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full origin-option list for a module on this log configuration. */
export async function saveUserOriginOptions(
  moduleSlug: string,
  options: OriginOption[],
  logConfigurationId: string | number
): Promise<{ data: OriginOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<OriginOption[]>>(
    `/config-modules/mine/origin-options/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserOriginOptions(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: OriginOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<OriginOption[]>>(
    `/config-modules/mine/origin-options/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserOriginOption(
  moduleSlug: string,
  option: OriginOption,
  logConfigurationId: string | number
): Promise<{ data: OriginOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<OriginOption>>(
    `/config-modules/mine/origin-options/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserOriginOption(
  moduleSlug: string,
  optionKey: string,
  option: OriginOption,
  logConfigurationId: string | number
): Promise<{ data: OriginOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<OriginOption>>(
    `/config-modules/mine/origin-options/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserOriginOption(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/origin-options/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common insitu testing-type catalog defaults for a module template. */
export async function getInsituTestTypeTemplates(
  moduleSlug: string
): Promise<{ data: InsituTestTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<InsituTestTypeOption[]>>(
    `/config-modules/insitu-test-type-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped insitu testing types (auto-seeded from templates on first load). */
export async function getUserInsituTestTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: InsituTestTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<InsituTestTypeOption[]>>(
    `/config-modules/mine/insitu-test-types/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full insitu testing-type list for a module on this log configuration. */
export async function saveUserInsituTestTypes(
  moduleSlug: string,
  options: InsituTestTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: InsituTestTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<InsituTestTypeOption[]>>(
    `/config-modules/mine/insitu-test-types/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserInsituTestTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: InsituTestTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<InsituTestTypeOption[]>>(
    `/config-modules/mine/insitu-test-types/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserInsituTestType(
  moduleSlug: string,
  option: InsituTestTypeOption,
  logConfigurationId: string | number
): Promise<{ data: InsituTestTypeOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<InsituTestTypeOption>>(
    `/config-modules/mine/insitu-test-types/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserInsituTestType(
  moduleSlug: string,
  optionKey: string,
  option: InsituTestTypeOption,
  logConfigurationId: string | number
): Promise<{ data: InsituTestTypeOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<InsituTestTypeOption>>(
    `/config-modules/mine/insitu-test-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserInsituTestType(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/insitu-test-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

export type InsituUnitSettingOption = Pick<ModuleNamedOption, "id" | "name">;

/** Common insitu unit-setting catalog defaults for a module template. */
export async function getInsituUnitSettingTemplates(
  moduleSlug: string
): Promise<{ data: InsituUnitSettingOption[] }> {
  const res = await apiClient.get<ApiEnvelope<InsituUnitSettingOption[]>>(
    `/config-modules/insitu-unit-setting-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped insitu unit settings (auto-seeded from templates on first load). */
export async function getUserInsituUnitSettings(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: InsituUnitSettingOption[] }> {
  const res = await apiClient.get<ApiEnvelope<InsituUnitSettingOption[]>>(
    `/config-modules/mine/insitu-unit-settings/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full insitu unit-setting list for a module on this log configuration. */
export async function saveUserInsituUnitSettings(
  moduleSlug: string,
  options: InsituUnitSettingOption[],
  logConfigurationId: string | number
): Promise<{ data: InsituUnitSettingOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<InsituUnitSettingOption[]>>(
    `/config-modules/mine/insitu-unit-settings/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserInsituUnitSettings(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: InsituUnitSettingOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<InsituUnitSettingOption[]>>(
    `/config-modules/mine/insitu-unit-settings/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserInsituUnitSetting(
  moduleSlug: string,
  option: InsituUnitSettingOption,
  logConfigurationId: string | number
): Promise<{ data: InsituUnitSettingOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<InsituUnitSettingOption>>(
    `/config-modules/mine/insitu-unit-settings/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserInsituUnitSetting(
  moduleSlug: string,
  optionKey: string,
  option: InsituUnitSettingOption,
  logConfigurationId: string | number
): Promise<{ data: InsituUnitSettingOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<InsituUnitSettingOption>>(
    `/config-modules/mine/insitu-unit-settings/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserInsituUnitSetting(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/insitu-unit-settings/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common core-defect-type catalog defaults for a module template. */
export async function getCoreDefectTypeTemplates(
  moduleSlug: string
): Promise<{ data: CoreDefectTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<CoreDefectTypeOption[]>>(
    `/config-modules/core-defect-type-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped core defect types (auto-seeded from templates on first load). */
export async function getUserCoreDefectTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: CoreDefectTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<CoreDefectTypeOption[]>>(
    `/config-modules/mine/core-defect-types/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full core-defect-type list for a module on this log configuration. */
export async function saveUserCoreDefectTypes(
  moduleSlug: string,
  options: CoreDefectTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: CoreDefectTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<CoreDefectTypeOption[]>>(
    `/config-modules/mine/core-defect-types/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserCoreDefectTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: CoreDefectTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<CoreDefectTypeOption[]>>(
    `/config-modules/mine/core-defect-types/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserCoreDefectType(
  moduleSlug: string,
  option: CoreDefectTypeOption,
  logConfigurationId: string | number
): Promise<{ data: CoreDefectTypeOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<CoreDefectTypeOption>>(
    `/config-modules/mine/core-defect-types/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserCoreDefectType(
  moduleSlug: string,
  optionKey: string,
  option: CoreDefectTypeOption,
  logConfigurationId: string | number
): Promise<{ data: CoreDefectTypeOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<CoreDefectTypeOption>>(
    `/config-modules/mine/core-defect-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserCoreDefectType(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/core-defect-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common aperture-color catalog defaults for a module template. */
export async function getApertureColorTemplates(
  moduleSlug: string
): Promise<{ data: ColorOption[] }> {
  const res = await apiClient.get<ApiEnvelope<ColorOption[]>>(
    `/config-modules/aperture-color-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped aperture colors (auto-seeded from templates on first load). */
export async function getUserApertureColors(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: ColorOption[] }> {
  const res = await apiClient.get<ApiEnvelope<ColorOption[]>>(
    `/config-modules/mine/aperture-colors/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full aperture-color list for a module on this log configuration. */
export async function saveUserApertureColors(
  moduleSlug: string,
  options: ColorOption[],
  logConfigurationId: string | number
): Promise<{ data: ColorOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<ColorOption[]>>(
    `/config-modules/mine/aperture-colors/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserApertureColors(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: ColorOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<ColorOption[]>>(
    `/config-modules/mine/aperture-colors/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserApertureColor(
  moduleSlug: string,
  option: ColorOption,
  logConfigurationId: string | number
): Promise<{ data: ColorOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<ColorOption>>(
    `/config-modules/mine/aperture-colors/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserApertureColor(
  moduleSlug: string,
  optionKey: string,
  option: ColorOption,
  logConfigurationId: string | number
): Promise<{ data: ColorOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<ColorOption>>(
    `/config-modules/mine/aperture-colors/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserApertureColor(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/aperture-colors/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common aperture-mineral catalog defaults for a module template. */
export async function getApertureMineralTemplates(
  moduleSlug: string
): Promise<{ data: ApertureMineralOption[] }> {
  const res = await apiClient.get<ApiEnvelope<ApertureMineralOption[]>>(
    `/config-modules/aperture-mineral-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped aperture minerals (auto-seeded from templates on first load). */
export async function getUserApertureMinerals(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: ApertureMineralOption[] }> {
  const res = await apiClient.get<ApiEnvelope<ApertureMineralOption[]>>(
    `/config-modules/mine/aperture-minerals/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full aperture-mineral list for a module on this log configuration. */
export async function saveUserApertureMinerals(
  moduleSlug: string,
  options: ApertureMineralOption[],
  logConfigurationId: string | number
): Promise<{ data: ApertureMineralOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<ApertureMineralOption[]>>(
    `/config-modules/mine/aperture-minerals/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserApertureMinerals(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: ApertureMineralOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<ApertureMineralOption[]>>(
    `/config-modules/mine/aperture-minerals/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserApertureMineral(
  moduleSlug: string,
  option: ApertureMineralOption,
  logConfigurationId: string | number
): Promise<{ data: ApertureMineralOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<ApertureMineralOption>>(
    `/config-modules/mine/aperture-minerals/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserApertureMineral(
  moduleSlug: string,
  optionKey: string,
  option: ApertureMineralOption,
  logConfigurationId: string | number
): Promise<{ data: ApertureMineralOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<ApertureMineralOption>>(
    `/config-modules/mine/aperture-minerals/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserApertureMineral(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/aperture-minerals/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common infill-material catalog defaults for a module template. */
export async function getInfillMaterialTemplates(
  moduleSlug: string
): Promise<{ data: InfillMaterialOption[] }> {
  const res = await apiClient.get<ApiEnvelope<InfillMaterialOption[]>>(
    `/config-modules/infill-material-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped infill materials (auto-seeded from templates on first load). */
export async function getUserInfillMaterials(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: InfillMaterialOption[] }> {
  const res = await apiClient.get<ApiEnvelope<InfillMaterialOption[]>>(
    `/config-modules/mine/infill-materials/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full infill-material list for a module on this log configuration. */
export async function saveUserInfillMaterials(
  moduleSlug: string,
  options: InfillMaterialOption[],
  logConfigurationId: string | number
): Promise<{ data: InfillMaterialOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<InfillMaterialOption[]>>(
    `/config-modules/mine/infill-materials/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserInfillMaterials(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: InfillMaterialOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<InfillMaterialOption[]>>(
    `/config-modules/mine/infill-materials/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserInfillMaterial(
  moduleSlug: string,
  option: InfillMaterialOption,
  logConfigurationId: string | number
): Promise<{ data: InfillMaterialOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<InfillMaterialOption>>(
    `/config-modules/mine/infill-materials/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserInfillMaterial(
  moduleSlug: string,
  optionKey: string,
  option: InfillMaterialOption,
  logConfigurationId: string | number
): Promise<{ data: InfillMaterialOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<InfillMaterialOption>>(
    `/config-modules/mine/infill-materials/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserInfillMaterial(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/infill-materials/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common drilling-type catalog defaults for a module template. */
export async function getDrillingTypeTemplates(
  moduleSlug: string
): Promise<{ data: DrillingTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<DrillingTypeOption[]>>(
    `/config-modules/drilling-type-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped drilling types (auto-seeded from templates on first load). */
export async function getUserDrillingTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: DrillingTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<DrillingTypeOption[]>>(
    `/config-modules/mine/drilling-types/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full drilling-type list for a module on this log configuration. */
export async function saveUserDrillingTypes(
  moduleSlug: string,
  options: DrillingTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: DrillingTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<DrillingTypeOption[]>>(
    `/config-modules/mine/drilling-types/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserDrillingTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: DrillingTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<DrillingTypeOption[]>>(
    `/config-modules/mine/drilling-types/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserDrillingType(
  moduleSlug: string,
  option: DrillingTypeOption,
  logConfigurationId: string | number
): Promise<{ data: DrillingTypeOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<DrillingTypeOption>>(
    `/config-modules/mine/drilling-types/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserDrillingType(
  moduleSlug: string,
  optionKey: string,
  option: DrillingTypeOption,
  logConfigurationId: string | number
): Promise<{ data: DrillingTypeOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<DrillingTypeOption>>(
    `/config-modules/mine/drilling-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserDrillingType(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/drilling-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common drilling-resistance catalog defaults for a module template. */
export async function getDrillingResistanceTemplates(
  moduleSlug: string
): Promise<{ data: DrillingResistanceOption[] }> {
  const res = await apiClient.get<ApiEnvelope<DrillingResistanceOption[]>>(
    `/config-modules/drilling-resistance-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped drilling resistances (auto-seeded from templates on first load). */
export async function getUserDrillingResistances(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: DrillingResistanceOption[] }> {
  const res = await apiClient.get<ApiEnvelope<DrillingResistanceOption[]>>(
    `/config-modules/mine/drilling-resistances/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full drilling-resistance list for a module on this log configuration. */
export async function saveUserDrillingResistances(
  moduleSlug: string,
  options: DrillingResistanceOption[],
  logConfigurationId: string | number
): Promise<{ data: DrillingResistanceOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<DrillingResistanceOption[]>>(
    `/config-modules/mine/drilling-resistances/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserDrillingResistances(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: DrillingResistanceOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<DrillingResistanceOption[]>>(
    `/config-modules/mine/drilling-resistances/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserDrillingResistance(
  moduleSlug: string,
  option: DrillingResistanceOption,
  logConfigurationId: string | number
): Promise<{ data: DrillingResistanceOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<DrillingResistanceOption>>(
    `/config-modules/mine/drilling-resistances/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserDrillingResistance(
  moduleSlug: string,
  optionKey: string,
  option: DrillingResistanceOption,
  logConfigurationId: string | number
): Promise<{ data: DrillingResistanceOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<DrillingResistanceOption>>(
    `/config-modules/mine/drilling-resistances/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserDrillingResistance(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/drilling-resistances/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common drilling-observation catalog defaults for a module template. */
export async function getDrillingObservationTemplates(
  moduleSlug: string
): Promise<{ data: DrillingObservationOption[] }> {
  const res = await apiClient.get<ApiEnvelope<DrillingObservationOption[]>>(
    `/config-modules/drilling-observation-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped drilling observations (auto-seeded from templates on first load). */
export async function getUserDrillingObservations(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: DrillingObservationOption[] }> {
  const res = await apiClient.get<ApiEnvelope<DrillingObservationOption[]>>(
    `/config-modules/mine/drilling-observations/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full drilling-observation list for a module on this log configuration. */
export async function saveUserDrillingObservations(
  moduleSlug: string,
  options: DrillingObservationOption[],
  logConfigurationId: string | number
): Promise<{ data: DrillingObservationOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<DrillingObservationOption[]>>(
    `/config-modules/mine/drilling-observations/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserDrillingObservations(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: DrillingObservationOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<DrillingObservationOption[]>>(
    `/config-modules/mine/drilling-observations/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserDrillingObservation(
  moduleSlug: string,
  option: DrillingObservationOption,
  logConfigurationId: string | number
): Promise<{ data: DrillingObservationOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<DrillingObservationOption>>(
    `/config-modules/mine/drilling-observations/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserDrillingObservation(
  moduleSlug: string,
  optionKey: string,
  option: DrillingObservationOption,
  logConfigurationId: string | number
): Promise<{ data: DrillingObservationOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<DrillingObservationOption>>(
    `/config-modules/mine/drilling-observations/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserDrillingObservation(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/drilling-observations/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common drilling-casing catalog defaults for a module template. */
export async function getDrillingCasingTemplates(
  moduleSlug: string
): Promise<{ data: DrillingCasingOption[] }> {
  const res = await apiClient.get<ApiEnvelope<DrillingCasingOption[]>>(
    `/config-modules/drilling-casing-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped drilling casings (auto-seeded from templates on first load). */
export async function getUserDrillingCasings(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: DrillingCasingOption[] }> {
  const res = await apiClient.get<ApiEnvelope<DrillingCasingOption[]>>(
    `/config-modules/mine/drilling-casings/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full drilling-casing list for a module on this log configuration. */
export async function saveUserDrillingCasings(
  moduleSlug: string,
  options: DrillingCasingOption[],
  logConfigurationId: string | number
): Promise<{ data: DrillingCasingOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<DrillingCasingOption[]>>(
    `/config-modules/mine/drilling-casings/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserDrillingCasings(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: DrillingCasingOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<DrillingCasingOption[]>>(
    `/config-modules/mine/drilling-casings/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserDrillingCasing(
  moduleSlug: string,
  option: DrillingCasingOption,
  logConfigurationId: string | number
): Promise<{ data: DrillingCasingOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<DrillingCasingOption>>(
    `/config-modules/mine/drilling-casings/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserDrillingCasing(
  moduleSlug: string,
  optionKey: string,
  option: DrillingCasingOption,
  logConfigurationId: string | number
): Promise<{ data: DrillingCasingOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<DrillingCasingOption>>(
    `/config-modules/mine/drilling-casings/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserDrillingCasing(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/drilling-casings/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common remark-type catalog defaults for a module template. */
export async function getRemarkTypeTemplates(
  moduleSlug: string
): Promise<{ data: RemarkTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<RemarkTypeOption[]>>(
    `/config-modules/remark-type-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped remark types (auto-seeded from templates on first load). */
export async function getUserRemarkTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: RemarkTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<RemarkTypeOption[]>>(
    `/config-modules/mine/remark-types/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full remark-type list for a module on this log configuration. */
export async function saveUserRemarkTypes(
  moduleSlug: string,
  options: RemarkTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: RemarkTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<RemarkTypeOption[]>>(
    `/config-modules/mine/remark-types/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserRemarkTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: RemarkTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<RemarkTypeOption[]>>(
    `/config-modules/mine/remark-types/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserRemarkType(
  moduleSlug: string,
  option: RemarkTypeOption,
  logConfigurationId: string | number
): Promise<{ data: RemarkTypeOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<RemarkTypeOption>>(
    `/config-modules/mine/remark-types/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserRemarkType(
  moduleSlug: string,
  optionKey: string,
  option: RemarkTypeOption,
  logConfigurationId: string | number
): Promise<{ data: RemarkTypeOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<RemarkTypeOption>>(
    `/config-modules/mine/remark-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserRemarkType(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/remark-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common remarks-quick-note catalog defaults for a module template. */
export async function getRemarksQuickNoteTemplates(
  moduleSlug: string
): Promise<{ data: RemarksQuickNoteOption[] }> {
  const res = await apiClient.get<ApiEnvelope<RemarksQuickNoteOption[]>>(
    `/config-modules/remarks-quick-note-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped remarks quick notes (auto-seeded from templates on first load). */
export async function getUserRemarksQuickNotes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: RemarksQuickNoteOption[] }> {
  const res = await apiClient.get<ApiEnvelope<RemarksQuickNoteOption[]>>(
    `/config-modules/mine/remarks-quick-notes/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full remarks-quick-note list for a module on this log configuration. */
export async function saveUserRemarksQuickNotes(
  moduleSlug: string,
  options: RemarksQuickNoteOption[],
  logConfigurationId: string | number
): Promise<{ data: RemarksQuickNoteOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<RemarksQuickNoteOption[]>>(
    `/config-modules/mine/remarks-quick-notes/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserRemarksQuickNotes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: RemarksQuickNoteOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<RemarksQuickNoteOption[]>>(
    `/config-modules/mine/remarks-quick-notes/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserRemarksQuickNote(
  moduleSlug: string,
  option: RemarksQuickNoteOption,
  logConfigurationId: string | number
): Promise<{ data: RemarksQuickNoteOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<RemarksQuickNoteOption>>(
    `/config-modules/mine/remarks-quick-notes/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserRemarksQuickNote(
  moduleSlug: string,
  optionKey: string,
  option: RemarksQuickNoteOption,
  logConfigurationId: string | number
): Promise<{ data: RemarksQuickNoteOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<RemarksQuickNoteOption>>(
    `/config-modules/mine/remarks-quick-notes/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserRemarksQuickNote(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/remarks-quick-notes/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common water-observation-type catalog defaults for a module template. */
export async function getWaterObservationTypeTemplates(
  moduleSlug: string
): Promise<{ data: WaterObservationTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WaterObservationTypeOption[]>>(
    `/config-modules/water-observation-type-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped water observation types (auto-seeded from templates on first load). */
export async function getUserWaterObservationTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WaterObservationTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WaterObservationTypeOption[]>>(
    `/config-modules/mine/water-observation-types/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full water-observation-type list for a module on this log configuration. */
export async function saveUserWaterObservationTypes(
  moduleSlug: string,
  options: WaterObservationTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: WaterObservationTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<WaterObservationTypeOption[]>>(
    `/config-modules/mine/water-observation-types/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserWaterObservationTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WaterObservationTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WaterObservationTypeOption[]>>(
    `/config-modules/mine/water-observation-types/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserWaterObservationType(
  moduleSlug: string,
  option: WaterObservationTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WaterObservationTypeOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WaterObservationTypeOption>>(
    `/config-modules/mine/water-observation-types/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserWaterObservationType(
  moduleSlug: string,
  optionKey: string,
  option: WaterObservationTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WaterObservationTypeOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<WaterObservationTypeOption>>(
    `/config-modules/mine/water-observation-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserWaterObservationType(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/water-observation-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common well-type catalog defaults for a module template. */
export async function getWellTypeTemplates(
  moduleSlug: string
): Promise<{ data: WellTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellTypeOption[]>>(
    `/config-modules/well-type-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped well types (auto-seeded from templates on first load). */
export async function getUserWellTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellTypeOption[]>>(
    `/config-modules/mine/well-types/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full well-type list for a module on this log configuration. */
export async function saveUserWellTypes(
  moduleSlug: string,
  options: WellTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: WellTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<WellTypeOption[]>>(
    `/config-modules/mine/well-types/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserWellTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellTypeOption[]>>(
    `/config-modules/mine/well-types/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserWellType(
  moduleSlug: string,
  option: WellTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WellTypeOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellTypeOption>>(
    `/config-modules/mine/well-types/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserWellType(
  moduleSlug: string,
  optionKey: string,
  option: WellTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WellTypeOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<WellTypeOption>>(
    `/config-modules/mine/well-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserWellType(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/well-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common well-casing-type catalog defaults for a module template. */
export async function getWellCasingTypeTemplates(
  moduleSlug: string
): Promise<{ data: WellCasingTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellCasingTypeOption[]>>(
    `/config-modules/well-casing-type-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped well casing types (auto-seeded from templates on first load). */
export async function getUserWellCasingTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellCasingTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellCasingTypeOption[]>>(
    `/config-modules/mine/well-casing-types/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full well-casing-type list for a module on this log configuration. */
export async function saveUserWellCasingTypes(
  moduleSlug: string,
  options: WellCasingTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: WellCasingTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<WellCasingTypeOption[]>>(
    `/config-modules/mine/well-casing-types/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserWellCasingTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellCasingTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellCasingTypeOption[]>>(
    `/config-modules/mine/well-casing-types/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserWellCasingType(
  moduleSlug: string,
  option: WellCasingTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WellCasingTypeOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellCasingTypeOption>>(
    `/config-modules/mine/well-casing-types/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserWellCasingType(
  moduleSlug: string,
  optionKey: string,
  option: WellCasingTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WellCasingTypeOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<WellCasingTypeOption>>(
    `/config-modules/mine/well-casing-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserWellCasingType(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/well-casing-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common well-casing-top catalog defaults for a module template. */
export async function getWellCasingTopTemplates(
  moduleSlug: string
): Promise<{ data: WellCasingTopTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellCasingTopTypeOption[]>>(
    `/config-modules/well-casing-top-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped well casing tops (auto-seeded from templates on first load). */
export async function getUserWellCasingTops(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellCasingTopTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellCasingTopTypeOption[]>>(
    `/config-modules/mine/well-casing-tops/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full well-casing-top list for a module on this log configuration. */
export async function saveUserWellCasingTops(
  moduleSlug: string,
  options: WellCasingTopTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: WellCasingTopTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<WellCasingTopTypeOption[]>>(
    `/config-modules/mine/well-casing-tops/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserWellCasingTops(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellCasingTopTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellCasingTopTypeOption[]>>(
    `/config-modules/mine/well-casing-tops/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserWellCasingTop(
  moduleSlug: string,
  option: WellCasingTopTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WellCasingTopTypeOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellCasingTopTypeOption>>(
    `/config-modules/mine/well-casing-tops/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserWellCasingTop(
  moduleSlug: string,
  optionKey: string,
  option: WellCasingTopTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WellCasingTopTypeOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<WellCasingTopTypeOption>>(
    `/config-modules/mine/well-casing-tops/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserWellCasingTop(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/well-casing-tops/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common well-cover-type catalog defaults for a module template. */
export async function getWellCoverTypeTemplates(
  moduleSlug: string
): Promise<{ data: WellCoverTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellCoverTypeOption[]>>(
    `/config-modules/well-cover-type-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped well cover types (auto-seeded from templates on first load). */
export async function getUserWellCoverTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellCoverTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellCoverTypeOption[]>>(
    `/config-modules/mine/well-cover-types/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full well-cover-type list for a module on this log configuration. */
export async function saveUserWellCoverTypes(
  moduleSlug: string,
  options: WellCoverTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: WellCoverTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<WellCoverTypeOption[]>>(
    `/config-modules/mine/well-cover-types/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserWellCoverTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellCoverTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellCoverTypeOption[]>>(
    `/config-modules/mine/well-cover-types/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserWellCoverType(
  moduleSlug: string,
  option: WellCoverTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WellCoverTypeOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellCoverTypeOption>>(
    `/config-modules/mine/well-cover-types/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserWellCoverType(
  moduleSlug: string,
  optionKey: string,
  option: WellCoverTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WellCoverTypeOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<WellCoverTypeOption>>(
    `/config-modules/mine/well-cover-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserWellCoverType(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/well-cover-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common well-probe-type catalog defaults for a module template. */
export async function getWellProbeTypeTemplates(
  moduleSlug: string
): Promise<{ data: WellProbeTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellProbeTypeOption[]>>(
    `/config-modules/well-probe-type-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped well probe types (auto-seeded from templates on first load). */
export async function getUserWellProbeTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellProbeTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellProbeTypeOption[]>>(
    `/config-modules/mine/well-probe-types/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full well-probe-type list for a module on this log configuration. */
export async function saveUserWellProbeTypes(
  moduleSlug: string,
  options: WellProbeTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: WellProbeTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<WellProbeTypeOption[]>>(
    `/config-modules/mine/well-probe-types/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserWellProbeTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellProbeTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellProbeTypeOption[]>>(
    `/config-modules/mine/well-probe-types/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserWellProbeType(
  moduleSlug: string,
  option: WellProbeTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WellProbeTypeOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellProbeTypeOption>>(
    `/config-modules/mine/well-probe-types/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserWellProbeType(
  moduleSlug: string,
  optionKey: string,
  option: WellProbeTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WellProbeTypeOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<WellProbeTypeOption>>(
    `/config-modules/mine/well-probe-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserWellProbeType(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/well-probe-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common well-backfill-type catalog defaults for a module template. */
export async function getWellBackfillTypeTemplates(
  moduleSlug: string
): Promise<{ data: WellBackfillTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellBackfillTypeOption[]>>(
    `/config-modules/well-backfill-type-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped well backfill types (auto-seeded from templates on first load). */
export async function getUserWellBackfillTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellBackfillTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellBackfillTypeOption[]>>(
    `/config-modules/mine/well-backfill-types/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full well-backfill-type list for a module on this log configuration. */
export async function saveUserWellBackfillTypes(
  moduleSlug: string,
  options: WellBackfillTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: WellBackfillTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<WellBackfillTypeOption[]>>(
    `/config-modules/mine/well-backfill-types/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserWellBackfillTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellBackfillTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellBackfillTypeOption[]>>(
    `/config-modules/mine/well-backfill-types/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserWellBackfillType(
  moduleSlug: string,
  option: WellBackfillTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WellBackfillTypeOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellBackfillTypeOption>>(
    `/config-modules/mine/well-backfill-types/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserWellBackfillType(
  moduleSlug: string,
  optionKey: string,
  option: WellBackfillTypeOption,
  logConfigurationId: string | number
): Promise<{ data: WellBackfillTypeOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<WellBackfillTypeOption>>(
    `/config-modules/mine/well-backfill-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserWellBackfillType(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/well-backfill-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

export type WellDefaultWellIdOption = Pick<ModuleNamedOption, "id" | "name">;

/** Common default-well-id catalog defaults for a module template. */
export async function getWellDefaultWellIdTemplates(
  moduleSlug: string
): Promise<{ data: WellDefaultWellIdOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellDefaultWellIdOption[]>>(
    `/config-modules/well-default-well-id-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped default well IDs (auto-seeded from templates on first load). */
export async function getUserWellDefaultWellIds(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellDefaultWellIdOption[] }> {
  const res = await apiClient.get<ApiEnvelope<WellDefaultWellIdOption[]>>(
    `/config-modules/mine/well-default-well-ids/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full default-well-id list for a module on this log configuration. */
export async function saveUserWellDefaultWellIds(
  moduleSlug: string,
  options: WellDefaultWellIdOption[],
  logConfigurationId: string | number
): Promise<{ data: WellDefaultWellIdOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<WellDefaultWellIdOption[]>>(
    `/config-modules/mine/well-default-well-ids/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserWellDefaultWellIds(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: WellDefaultWellIdOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellDefaultWellIdOption[]>>(
    `/config-modules/mine/well-default-well-ids/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserWellDefaultWellId(
  moduleSlug: string,
  option: WellDefaultWellIdOption,
  logConfigurationId: string | number
): Promise<{ data: WellDefaultWellIdOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<WellDefaultWellIdOption>>(
    `/config-modules/mine/well-default-well-ids/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserWellDefaultWellId(
  moduleSlug: string,
  optionKey: string,
  option: WellDefaultWellIdOption,
  logConfigurationId: string | number
): Promise<{ data: WellDefaultWellIdOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<WellDefaultWellIdOption>>(
    `/config-modules/mine/well-default-well-ids/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserWellDefaultWellId(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/well-default-well-ids/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common sample-type catalog defaults for a module template. */
export async function getSampleTypeTemplates(
  moduleSlug: string
): Promise<{ data: SampleTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<SampleTypeOption[]>>(
    `/config-modules/sample-type-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

/** Configuration-scoped sample types (auto-seeded from templates on first load). */
export async function getUserSampleTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: SampleTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<SampleTypeOption[]>>(
    `/config-modules/mine/sample-types/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

/** Replace the full sample-type list for a module on this log configuration. */
export async function saveUserSampleTypes(
  moduleSlug: string,
  options: SampleTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: SampleTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<SampleTypeOption[]>>(
    `/config-modules/mine/sample-types/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserSampleTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: SampleTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<SampleTypeOption[]>>(
    `/config-modules/mine/sample-types/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserSampleType(
  moduleSlug: string,
  option: SampleTypeOption,
  logConfigurationId: string | number
): Promise<{ data: SampleTypeOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<SampleTypeOption>>(
    `/config-modules/mine/sample-types/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserSampleType(
  moduleSlug: string,
  optionKey: string,
  option: SampleTypeOption,
  logConfigurationId: string | number
): Promise<{ data: SampleTypeOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<SampleTypeOption>>(
    `/config-modules/mine/sample-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserSampleType(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/sample-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common lab-test-type catalog defaults for a module template. */
export async function getLabTestTypeTemplates(
  moduleSlug: string
): Promise<{ data: LabTestTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<LabTestTypeOption[]>>(
    `/config-modules/lab-test-type-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

export async function getUserLabTestTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: LabTestTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<LabTestTypeOption[]>>(
    `/config-modules/mine/lab-test-types/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

export async function saveUserLabTestTypes(
  moduleSlug: string,
  options: LabTestTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: LabTestTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<LabTestTypeOption[]>>(
    `/config-modules/mine/lab-test-types/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserLabTestTypes(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: LabTestTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<LabTestTypeOption[]>>(
    `/config-modules/mine/lab-test-types/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserLabTestType(
  moduleSlug: string,
  option: LabTestTypeOption,
  logConfigurationId: string | number
): Promise<{ data: LabTestTypeOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<LabTestTypeOption>>(
    `/config-modules/mine/lab-test-types/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserLabTestType(
  moduleSlug: string,
  optionKey: string,
  option: LabTestTypeOption,
  logConfigurationId: string | number
): Promise<{ data: LabTestTypeOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<LabTestTypeOption>>(
    `/config-modules/mine/lab-test-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserLabTestType(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/lab-test-types/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

/** Common lab-test-preset catalog defaults for a module template. */
export async function getLabTestPresetTemplates(
  moduleSlug: string
): Promise<{ data: LabTestPresetOption[] }> {
  const res = await apiClient.get<ApiEnvelope<LabTestPresetOption[]>>(
    `/config-modules/lab-test-preset-templates/${encodeURIComponent(moduleSlug)}`
  );
  return { data: res.data.data };
}

export async function getUserLabTestPresets(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: LabTestPresetOption[] }> {
  const res = await apiClient.get<ApiEnvelope<LabTestPresetOption[]>>(
    `/config-modules/mine/lab-test-presets/${encodeURIComponent(moduleSlug)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

export async function saveUserLabTestPresets(
  moduleSlug: string,
  options: LabTestPresetOption[],
  logConfigurationId: string | number
): Promise<{ data: LabTestPresetOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<LabTestPresetOption[]>>(
    `/config-modules/mine/lab-test-presets/${encodeURIComponent(moduleSlug)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserLabTestPresets(
  moduleSlug: string,
  logConfigurationId: string | number
): Promise<{ data: LabTestPresetOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<LabTestPresetOption[]>>(
    `/config-modules/mine/lab-test-presets/${encodeURIComponent(moduleSlug)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function createUserLabTestPreset(
  moduleSlug: string,
  option: LabTestPresetOption,
  logConfigurationId: string | number
): Promise<{ data: LabTestPresetOption; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<LabTestPresetOption>>(
    `/config-modules/mine/lab-test-presets/${encodeURIComponent(moduleSlug)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function updateUserLabTestPreset(
  moduleSlug: string,
  optionKey: string,
  option: LabTestPresetOption,
  logConfigurationId: string | number
): Promise<{ data: LabTestPresetOption; message?: string }> {
  const res = await apiClient.patch<ApiEnvelope<LabTestPresetOption>>(
    `/config-modules/mine/lab-test-presets/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    option,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function deleteUserLabTestPreset(
  moduleSlug: string,
  optionKey: string,
  logConfigurationId: string | number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/config-modules/mine/lab-test-presets/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(optionKey)}`,
    { params: configParams(logConfigurationId) }
  );
  return { message: res.data.message };
}

export type ModuleDataTypeOption = {
  id: string;
  name: string;
  code?: string | null;
  abbreviation?: string | null;
  graphic?: string | null;
  rockGroup?: string | null;
  color?: string | null;
  overlayColor?: string | null;
  textColor?: string | null;
  showAutoScale?: boolean;
};

export async function getDataTypeOptionTemplates(
  moduleSlug: string,
  dataTypeId: string
): Promise<{ data: ModuleDataTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<ModuleDataTypeOption[]>>(
    `/config-modules/data-type-option-templates/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(dataTypeId)}`
  );
  return { data: res.data.data };
}

export async function getUserDataTypeOptions(
  moduleSlug: string,
  dataTypeId: string,
  logConfigurationId: string | number
): Promise<{ data: ModuleDataTypeOption[] }> {
  const res = await apiClient.get<ApiEnvelope<ModuleDataTypeOption[]>>(
    `/config-modules/mine/data-type-options/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(dataTypeId)}`,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data };
}

export async function saveUserDataTypeOptions(
  moduleSlug: string,
  dataTypeId: string,
  options: ModuleDataTypeOption[],
  logConfigurationId: string | number
): Promise<{ data: ModuleDataTypeOption[]; message?: string }> {
  const res = await apiClient.put<ApiEnvelope<ModuleDataTypeOption[]>>(
    `/config-modules/mine/data-type-options/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(dataTypeId)}`,
    { options },
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}

export async function resetUserDataTypeOptions(
  moduleSlug: string,
  dataTypeId: string,
  logConfigurationId: string | number
): Promise<{ data: ModuleDataTypeOption[]; message?: string }> {
  const res = await apiClient.post<ApiEnvelope<ModuleDataTypeOption[]>>(
    `/config-modules/mine/data-type-options/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(dataTypeId)}/reset`,
    undefined,
    { params: configParams(logConfigurationId) }
  );
  return { data: res.data.data, message: res.data.message };
}
