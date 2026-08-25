import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { ReportPreviewTypeId } from "../data/logReportOptions";
import { DEFAULT_LOG_BUILDER_VERSION } from "../data/logReportOptions";
import { parseEnabledModuleIds } from "../data/configModules";
import { listEquipment } from "../services/equipmentApi";
import {
  getHeaderFooterTemplate,
  listHeaderFooterTemplates,
} from "../services/headerFooterTemplateApi";
import {
  getUserDrillingTypes,
  getUserModuleWorkflow,
  getUserOriginOptions,
  getUserWaterObservationTypes,
  getUserWellBackfillTypes,
  getUserWellCasingTypes,
  getUserWellTypes,
  listConfigModules,
} from "../services/configModulesApi";
import { getLogConfiguration, listLogConfigurations } from "../services/logConfigurationApi";
import { listLogDrillingMethods } from "../services/logDrillingMethodApi";
import { listLogInsituTests } from "../services/logInsituTestApi";
import { getLogTemplate, listLogTemplates } from "../services/logTemplateApi";
import { listLogWaterObservations } from "../services/logWaterObservationApi";
import { listLogWellBackfills } from "../services/logWellBackfillApi";
import { listLogWellCasings } from "../services/logWellCasingApi";
import { listLogWellLogs } from "../services/logWellLogApi";
import { listLogSubsurfaces } from "../services/subsurfaceApi";
import { listSuppliers } from "../services/supplierApi";
import type { Equipment } from "../types/equipment";
import type { HeaderFooterTemplate } from "../types/headerFooterTemplate";
import type { Log, LogFormState } from "../types/log";
import { logToFormState } from "../types/log";
import type { LogConfiguration } from "../types/logConfiguration";
import type { LogTemplateRecord } from "../types/logTemplate";
import type { Project } from "../types/project";
import type { Supplier } from "../types/supplier";
import {
  DEFAULT_WELL_BACKFILL_TYPE_OPTIONS,
  DEFAULT_WELL_CASING_TYPE_OPTIONS,
  DEFAULT_WELL_TYPE_OPTIONS,
  DEFAULT_WORKFLOW_SETTINGS,
  CORE_LOGGING_MODULE_ID,
  DRILLING_OBSERVATIONS_MODULE_ID,
  LOG_REPORT_MODULE_ID,
  WATER_OBSERVATIONS_MODULE_ID,
  WELL_LOGS_MODULE_ID,
  ensureModuleSettingsForEnabledModules,
  getWaterObservationGraphicUrl,
  normalizeWorkflowSettings,
  parseConfigModuleSettings,
  parseDrillingTypeOptions,
  parseOriginOptions,
  parseStoredModuleSettings,
  parseWaterObservationTypeOptions,
  parseWellBackfillTypeOptions,
  parseWellCasingTypeOptions,
  parseWellTypeOptions,
  parseWorkflowSettings,
  SUBSURFACES_MODULE_ID,
  type DrillingTypeOption,
  type LogReportModuleConfig,
  type StoredModuleSettings,
  type WellBackfillTypeOption,
  type WellCasingTypeOption,
  type WellTypeOption,
  type WorkflowSettings,
} from "./configModules";
import {
  loadUserDataTypeOptionsForEnabledModules,
  mergeUserDataTypeOptionsIntoModuleSettings,
  type UserDataTypeOptionId,
} from "./userModuleDataTypeOptions";
import { mergeUserOriginsIntoModuleSettings } from "./userModuleOrigins";
import { hydrateModuleSettingsFromUserCatalog } from "./userModuleSettings";
import { ensureLogReportFieldCodeCatalog } from "./logReportFieldCodes";
import {
  buildDcpPointsFromInsituTests,
  buildDrillingIntervalsFromMethods,
  buildPspBandsFromInsituTests,
  buildStrataFromLayers,
  buildWaterObservationsForPreview,
  buildWellDiagramIntervals,
  EMPTY_LOG_REPORT_SELECTION,
  filterHfForReportType,
  getDcpTestTypeCodesFromLogTemplate,
  parseFinishEndDepthMetres,
  pickPreferredFooter,
  pickPreferredHeader,
  pickPreferredLogTemplate,
  reportPageHeightPx,
  reportPageWidthPx,
  selectionFromLogTemplate,
  type DcpPoint,
  type LogReportSelection,
  type PreviewDrillingInterval,
  type PreviewPspBand,
  type PreviewStratum,
  type PreviewWaterObservation,
  type PreviewWellInterval,
} from "./logReportPreviewUtils";

export type LogReportExportCatalogs = {
  borelogTemplates: LogTemplateRecord[];
  corelogTemplates: LogTemplateRecord[];
  headers: HeaderFooterTemplate[];
  footers: HeaderFooterTemplate[];
  configurations: Map<string, LogConfiguration>;
  equipment: Equipment[];
  suppliers: Supplier[];
};

export type LogReportExportSheetJob = {
  key: string;
  previewType: ReportPreviewTypeId;
  logNumber: string;
  pageWidthPx: number;
  pageHeightPx: number;
  form: LogFormState;
  selection: LogReportSelection;
  logTemplate: LogTemplateRecord | null;
  headerTemplate: HeaderFooterTemplate | null;
  footerTemplate: HeaderFooterTemplate | null;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  companyEmail?: string | null;
  phoneCode?: string | null;
  phoneNumber?: string | null;
  equipmentLabel?: string | null;
  supplierLabel?: string | null;
  subsurfaceLayers: PreviewStratum[];
  dcpPoints: DcpPoint[];
  drillingIntervals: PreviewDrillingInterval[];
  pspBands: PreviewPspBand[];
  waterObservations: PreviewWaterObservation[];
  wellIntervals: PreviewWellInterval[];
};

type SubsurfaceRuntimeContext = {
  workflow: WorkflowSettings;
  subsurfaceSettings: StoredModuleSettings;
};

function emptySubsurfaceSettings(): StoredModuleSettings {
  return parseStoredModuleSettings({}, SUBSURFACES_MODULE_ID);
}

async function loadSubsurfaceRuntimeContext(
  logConfigurationId: string
): Promise<SubsurfaceRuntimeContext | null> {
  if (!logConfigurationId.trim()) return null;

  try {
    const [workflowResult, originsResult, dataTypes, catalog] = await Promise.all([
      getUserModuleWorkflow(SUBSURFACES_MODULE_ID, logConfigurationId),
      getUserOriginOptions(SUBSURFACES_MODULE_ID, logConfigurationId),
      loadUserDataTypeOptionsForEnabledModules([SUBSURFACES_MODULE_ID], logConfigurationId),
      listConfigModules(1, 100, {
        availableOnly: true,
        logConfigurationId,
      }),
      ensureLogReportFieldCodeCatalog(),
    ]);

    const workflow = normalizeWorkflowSettings(parseWorkflowSettings(workflowResult.data));
    const origins = parseOriginOptions(originsResult.data, []);

    let settings = emptySubsurfaceSettings();
    const baseSettings = ensureModuleSettingsForEnabledModules([SUBSURFACES_MODULE_ID], {
      order: [SUBSURFACES_MODULE_ID],
      modules: { [SUBSURFACES_MODULE_ID]: settings },
      workflow: DEFAULT_WORKFLOW_SETTINGS,
    });
    const hydrated = hydrateModuleSettingsFromUserCatalog(
      [SUBSURFACES_MODULE_ID],
      baseSettings,
      catalog.data
    );
    settings = hydrated.modules[SUBSURFACES_MODULE_ID] ?? settings;
    settings = mergeUserOriginsIntoModuleSettings(settings, origins);

    const byType = dataTypes[SUBSURFACES_MODULE_ID] ?? {};
    for (const dataTypeId of Object.keys(byType) as UserDataTypeOptionId[]) {
      const optionsForType = byType[dataTypeId];
      if (!optionsForType) continue;
      settings = mergeUserDataTypeOptionsIntoModuleSettings(settings, dataTypeId, optionsForType);
    }

    return { workflow, subsurfaceSettings: settings };
  } catch {
    return null;
  }
}

export function resolveLogReportModuleConfig(
  configuration: LogConfiguration | undefined
): LogReportModuleConfig | null {
  if (!configuration) return null;
  const direct = configuration.moduleSettings?.modules?.[LOG_REPORT_MODULE_ID]?.report;
  if (direct) return direct;
  const enabled = parseEnabledModuleIds(configuration.enabledModules);
  const settings = parseConfigModuleSettings(configuration.moduleSettings, enabled);
  return settings.modules[LOG_REPORT_MODULE_ID]?.report ?? null;
}

export function resolveTemplateDisplayName(
  templates: LogTemplateRecord[],
  preferredId?: string | null
): string {
  const preferred = preferredId?.trim();
  if (!preferred) {
    return templates.find((template) => template.isDefault)?.name ?? templates[0]?.name ?? "—";
  }
  return pickPreferredLogTemplate(templates, preferred)?.name ?? preferred;
}

function hasAssignedLogTemplate(
  templates: LogTemplateRecord[],
  preferredId?: string | null
): boolean {
  const preferred = preferredId?.trim();
  if (!preferred) return false;
  const normalized = preferred.toLowerCase();
  return templates.some(
    (template) =>
      String(template.id) === preferred || template.name.trim().toLowerCase() === normalized
  );
}

/**
 * A log config can store both a borelog and a corelog template. Export only the
 * report type that was actually saved for this log:
 * - corelog template saved, borelog not → corelog
 * - borelog template saved, corelog not → borelog
 * - both saved and core logging enabled → corelog
 * - otherwise borelog
 */
export function resolveSavedLogReportType(
  log: Log,
  catalogs: LogReportExportCatalogs
): ReportPreviewTypeId {
  const configuration = catalogs.configurations.get(log.logConfigId);
  const report = resolveLogReportModuleConfig(configuration);
  const hasBorelog = hasAssignedLogTemplate(
    catalogs.borelogTemplates,
    report?.borelogTemplate
  );
  const hasCorelog = hasAssignedLogTemplate(
    catalogs.corelogTemplates,
    report?.corelogTemplate
  );

  if (hasCorelog && !hasBorelog) return "corelog";
  if (hasBorelog && !hasCorelog) return "borelog";

  const enabled = parseEnabledModuleIds(configuration?.enabledModules);
  if (hasCorelog && enabled.includes(CORE_LOGGING_MODULE_ID)) return "corelog";
  return "borelog";
}

export async function loadLogReportExportCatalogs(
  logs: Log[]
): Promise<LogReportExportCatalogs> {
  const [logList, headerList, footerList, configList, equipmentResult, suppliersResult] =
    await Promise.all([
      listLogTemplates(),
      listHeaderFooterTemplates(1, MAX_TABLE_PAGE_SIZE, {
        kind: "header",
        sortBy: "name",
        sortOrder: "asc",
      }),
      listHeaderFooterTemplates(1, MAX_TABLE_PAGE_SIZE, {
        kind: "footer",
        sortBy: "name",
        sortOrder: "asc",
      }),
      listLogConfigurations(1, MAX_TABLE_PAGE_SIZE),
      listEquipment(1, MAX_TABLE_PAGE_SIZE).catch(() => ({ data: [] as Equipment[] })),
      listSuppliers(1, MAX_TABLE_PAGE_SIZE, { supplierType: "Equipment", status: "active" }).catch(
        () => ({ data: [] as Supplier[] })
      ),
      ensureLogReportFieldCodeCatalog(),
    ]);

  const configurations = new Map(configList.data.map((config) => [config.id, config]));
  const missingIds = [
    ...new Set(logs.map((log) => log.logConfigId.trim()).filter(Boolean)),
  ].filter((id) => !configurations.has(id));

  await Promise.all(
    missingIds.map(async (id) => {
      try {
        configurations.set(id, await getLogConfiguration(id));
      } catch {
        // Template names fall back when a configuration cannot be loaded.
      }
    })
  );

  return {
    borelogTemplates: logList.borelog,
    corelogTemplates: logList.corelog,
    headers: headerList.data,
    footers: footerList.data,
    configurations,
    equipment: equipmentResult.data,
    suppliers: suppliersResult.data,
  };
}

async function loadFreshLogTemplate(
  templates: LogTemplateRecord[],
  preferredId?: string | null
): Promise<LogTemplateRecord | null> {
  const listed = pickPreferredLogTemplate(templates, preferredId) ?? null;
  if (!listed) return null;
  try {
    return await getLogTemplate(String(listed.id));
  } catch {
    return listed;
  }
}

async function loadFreshHeaderFooter(
  template: HeaderFooterTemplate | undefined
): Promise<HeaderFooterTemplate | null> {
  if (!template) return null;
  try {
    return await getHeaderFooterTemplate(template.id);
  } catch {
    return template;
  }
}

type ConfigTypeCache = {
  subsurface: SubsurfaceRuntimeContext | null;
  drillingTypes: DrillingTypeOption[];
  waterObservationTypes: ReturnType<typeof parseWaterObservationTypeOptions>;
  wellTypes: WellTypeOption[];
  wellBackfillTypes: WellBackfillTypeOption[];
  wellCasingTypes: WellCasingTypeOption[];
};

async function loadConfigTypeCache(logConfigId: string): Promise<ConfigTypeCache> {
  if (!logConfigId.trim()) {
    return {
      subsurface: null,
      drillingTypes: [],
      waterObservationTypes: [],
      wellTypes: [],
      wellBackfillTypes: [],
      wellCasingTypes: [],
    };
  }

  const [
    subsurface,
    drillingResult,
    waterResult,
    wellTypesRes,
    backfillTypesRes,
    casingTypesRes,
  ] = await Promise.all([
    loadSubsurfaceRuntimeContext(logConfigId),
    getUserDrillingTypes(DRILLING_OBSERVATIONS_MODULE_ID, logConfigId).catch(() => ({ data: [] })),
    getUserWaterObservationTypes(WATER_OBSERVATIONS_MODULE_ID, logConfigId).catch(() => ({
      data: [],
    })),
    getUserWellTypes(WELL_LOGS_MODULE_ID, logConfigId).catch(() => ({ data: [] })),
    getUserWellBackfillTypes(WELL_LOGS_MODULE_ID, logConfigId).catch(() => ({ data: [] })),
    getUserWellCasingTypes(WELL_LOGS_MODULE_ID, logConfigId).catch(() => ({ data: [] })),
  ]);

  return {
    subsurface,
    drillingTypes: parseDrillingTypeOptions(drillingResult.data, []),
    waterObservationTypes: parseWaterObservationTypeOptions(waterResult.data, []),
    wellTypes: parseWellTypeOptions(wellTypesRes.data, DEFAULT_WELL_TYPE_OPTIONS),
    wellBackfillTypes: parseWellBackfillTypeOptions(
      backfillTypesRes.data,
      DEFAULT_WELL_BACKFILL_TYPE_OPTIONS
    ),
    wellCasingTypes: parseWellCasingTypeOptions(
      casingTypesRes.data,
      DEFAULT_WELL_CASING_TYPE_OPTIONS
    ),
  };
}

function supplierAndEquipmentLabels(
  form: LogFormState,
  catalogs: LogReportExportCatalogs
): { supplierLabel: string; equipmentLabel: string } {
  const supplier = catalogs.suppliers.find((item) => String(item.id) === form.supplierId);
  const supplierLabel = supplier?.businessName ?? "";
  const equipmentLabel =
    catalogs.equipment.find(
      (item) =>
        String(item.id) === form.equipmentId &&
        (!supplierLabel || item.suppliers.includes(supplierLabel))
    )?.equipmentName ?? "";
  return { supplierLabel, equipmentLabel };
}

export async function buildLogReportExportJobs(input: {
  project: Project;
  log: Log;
  catalogs: LogReportExportCatalogs;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  companyEmail?: string | null;
  phoneCode?: string | null;
  phoneNumber?: string | null;
  configCache: Map<string, ConfigTypeCache>;
}): Promise<LogReportExportSheetJob[]> {
  const { project, log, catalogs } = input;
  const types: ReportPreviewTypeId[] = [resolveSavedLogReportType(log, catalogs)];
  const form = logToFormState(log);
  const logConfigId = form.logConfigId.trim();
  const reportConfig = resolveLogReportModuleConfig(catalogs.configurations.get(log.logConfigId));

  let typeCache = input.configCache.get(logConfigId);
  if (!typeCache) {
    typeCache = await loadConfigTypeCache(logConfigId);
    input.configCache.set(logConfigId, typeCache);
  }

  const [
    layersResult,
    insituResult,
    drillingResult,
    waterResult,
    wellLogsResult,
    backfillsResult,
    casingsResult,
  ] = await Promise.all([
    listLogSubsurfaces(project.id, log.id, 1, MAX_TABLE_PAGE_SIZE, {
      sortBy: "sortOrder",
      sortOrder: "asc",
    }).catch(() => ({ data: [] })),
    listLogInsituTests(project.id, log.id, 1, MAX_TABLE_PAGE_SIZE, {
      sortBy: "sortOrder",
      sortOrder: "asc",
    }).catch(() => ({ data: [] })),
    listLogDrillingMethods(project.id, log.id, 1, MAX_TABLE_PAGE_SIZE, {
      sortBy: "sortOrder",
      sortOrder: "asc",
    }).catch(() => ({ data: [] })),
    listLogWaterObservations(project.id, log.id, 1, MAX_TABLE_PAGE_SIZE, {
      sortBy: "sortOrder",
      sortOrder: "asc",
    }).catch(() => ({ data: [] })),
    listLogWellLogs(project.id, log.id, 1, MAX_TABLE_PAGE_SIZE, {
      sortBy: "sortOrder",
      sortOrder: "asc",
    }).catch(() => ({ data: [] })),
    listLogWellBackfills(project.id, log.id, 1, MAX_TABLE_PAGE_SIZE, {
      sortBy: "sortOrder",
      sortOrder: "asc",
    }).catch(() => ({ data: [] })),
    listLogWellCasings(project.id, log.id, 1, MAX_TABLE_PAGE_SIZE, {
      sortBy: "sortOrder",
      sortOrder: "asc",
    }).catch(() => ({ data: [] })),
  ]);

  const workflow = typeCache.subsurface?.workflow;
  const subsurfaceSettings = typeCache.subsurface?.subsurfaceSettings;
  const subsurfaceLayers = buildStrataFromLayers(
    layersResult.data,
    workflow
      ? {
          codes: workflow.classificationCodes,
          steps: workflow.steps,
          applyRules: workflow.applyClassificationRules,
          subsurfaceSettings,
        }
      : undefined,
    parseFinishEndDepthMetres(form.endDepth)
  );

  const drillingIntervals = buildDrillingIntervalsFromMethods(
    drillingResult.data,
    typeCache.drillingTypes
  );
  const pspBands = buildPspBandsFromInsituTests(insituResult.data);

  const typeById = new Map(
    typeCache.waterObservationTypes.map((entry) => [entry.id.trim().toLowerCase(), entry])
  );
  const typeByName = new Map(
    typeCache.waterObservationTypes.map((entry) => [entry.name.trim().toLowerCase(), entry])
  );
  const waterObservations = buildWaterObservationsForPreview(
    waterResult.data.map((entry) => {
      const idKey = entry.observationTypeId.trim().toLowerCase();
      const nameKey = entry.observationTypeName.trim().toLowerCase();
      const type = typeById.get(idKey) ?? typeByName.get(nameKey);
      const graphicUrl = type?.graphic ? getWaterObservationGraphicUrl(type.graphic) : undefined;
      return {
        depth: entry.depth,
        observationTypeName: entry.observationTypeName,
        observationTypeId: entry.observationTypeId,
        comments: entry.comments,
        graphicUrl,
      };
    })
  );

  const wellIntervals = buildWellDiagramIntervals({
    wellLogs: wellLogsResult.data.map((entry) => ({
      depthFrom: entry.depthFrom,
      depthTo: entry.depthTo,
      wellTypeId: entry.wellTypeId,
      wellTypeName: entry.wellTypeName,
    })),
    wellTypes: typeCache.wellTypes,
    backfills: backfillsResult.data.map((entry) => ({
      depthFrom: entry.depthFrom,
      depthTo: entry.depthTo,
      backfillTypeId: entry.backfillTypeId,
      backfillTypeName: entry.backfillTypeName,
    })),
    casings: casingsResult.data.map((entry) => ({
      depthFrom: entry.depthFrom,
      depthTo: entry.depthTo,
      casingTypeId: entry.casingTypeId,
      casingTypeName: entry.casingTypeName,
    })),
    backfillTypes: typeCache.wellBackfillTypes,
    casingTypes: typeCache.wellCasingTypes,
  });

  const { supplierLabel, equipmentLabel } = supplierAndEquipmentLabels(form, catalogs);
  const jobs: LogReportExportSheetJob[] = [];

  for (const previewType of types) {
    const templates =
      previewType === "corelog" ? catalogs.corelogTemplates : catalogs.borelogTemplates;
    if (templates.length === 0) continue;

    const preferredTemplateId =
      previewType === "corelog" ? reportConfig?.corelogTemplate : reportConfig?.borelogTemplate;
    const logTemplate = await loadFreshLogTemplate(templates, preferredTemplateId);
    if (!logTemplate) continue;

    const headers = filterHfForReportType(catalogs.headers, previewType);
    const footers = filterHfForReportType(catalogs.footers, previewType);
    const [headerTemplate, footerTemplate] = await Promise.all([
      loadFreshHeaderFooter(
        pickPreferredHeader(headers, previewType, reportConfig?.logHeader)
      ),
      loadFreshHeaderFooter(
        pickPreferredFooter(footers, previewType, reportConfig?.logFooter)
      ),
    ]);

    const pageDefaults = selectionFromLogTemplate(logTemplate, EMPTY_LOG_REPORT_SELECTION);
    const selection: LogReportSelection = {
      templateId: String(logTemplate.id),
      headerId: headerTemplate ? String(headerTemplate.id) : "",
      footerId: footerTemplate ? String(footerTemplate.id) : "",
      orientation: pageDefaults.orientation,
      pageSize: pageDefaults.pageSize,
      metresPerPage: pageDefaults.metresPerPage,
      builderVersion: DEFAULT_LOG_BUILDER_VERSION,
    };

    jobs.push({
      key: `${log.id}-${previewType}`,
      previewType,
      logNumber: form.logNumber,
      pageWidthPx: reportPageWidthPx(selection.pageSize, selection.orientation),
      pageHeightPx: reportPageHeightPx(selection.pageSize, selection.orientation),
      form,
      selection,
      logTemplate,
      headerTemplate,
      footerTemplate,
      companyName: input.companyName,
      companyLogoUrl: input.companyLogoUrl,
      companyEmail: input.companyEmail,
      phoneCode: input.phoneCode,
      phoneNumber: input.phoneNumber,
      equipmentLabel,
      supplierLabel,
      subsurfaceLayers,
      dcpPoints: buildDcpPointsFromInsituTests(
        insituResult.data,
        getDcpTestTypeCodesFromLogTemplate(logTemplate)
      ),
      drillingIntervals,
      pspBands,
      waterObservations,
      wellIntervals,
    });
  }

  return jobs;
}

export function createLogReportExportConfigCache(): Map<string, ConfigTypeCache> {
  return new Map();
}
