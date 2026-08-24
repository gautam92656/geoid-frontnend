"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DatePicker, FormField, Input, Select, TimePicker, UiButton } from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { getApiErrorMessage, showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { COORDINATE_SYSTEMS } from "../data/coordinateSystems";
import { LOG_TYPES, LOG_WORKFLOW_STATUSES } from "../data/logOptions";
import {
  getVisibleLogSections,
  isLogSectionVisible,
  LOG_SECTIONS,
  type LogSectionId,
} from "../data/logSections";
import { listEquipment } from "../services/equipmentApi";
import { formToLogPayload, listProjectLogs, updateLog } from "../services/logApi";
import { listLogConfigurations } from "../services/logConfigurationApi";
import { listSuppliers } from "../services/supplierApi";
import type { Equipment } from "../types/equipment";
import type { Log, LogFormState } from "../types/log";
import { logToFormState } from "../types/log";
import type { LogConfiguration } from "../types/logConfiguration";
import type { Project } from "../types/project";
import type { Supplier } from "../types/supplier";
import { projectDetailPath } from "../utils/projectPaths";
import { UTM_ZONES } from "../data/utmZones";
import {
  type LogFormErrors,
  prepareLogFormForSubmit,
  showEastingNorthingFields,
  showInclinationFields,
  showStationField,
  validateLogForm,
} from "../utils/logFormUtils";
import {
  areCoordinatesRequired,
  coordinateUnitLabel,
  resolveLogConfigRuntimeSettings,
} from "../utils/projectLogConfigUtils";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUserFinishingReasons } from "../hooks/useUserFinishingReasons";
import { LogReportPreview } from "./LogReportPreview";
import { LogReportSection } from "./LogReportSection";
import { SubsurfaceSection } from "./SubsurfaceSection";
import { InsituTestsSection } from "./InsituTestsSection";
import { RemarksSection } from "./RemarksSection";
import { SamplesSection } from "./SamplesSection";
import { DrillingObservationsSection } from "./DrillingObservationsSection";
import { WellLogsSection } from "./WellLogsSection";
import { WaterObservationsSection } from "./WaterObservationsSection";
import { CoreLoggingSection } from "./CoreLoggingSection";
import { LogLabTestsSection } from "./LogLabTestsSection";
import { FinishLogModal } from "./FinishLogModal";
import { ProjectSidebar, type ProjectSidebarSectionId } from "./ProjectSidebar";
import { useLogReportPreviewState } from "../hooks/useLogReportPreviewState";
import { useSubsurfaceRuntime } from "../hooks/useSubsurfaceRuntime";
import { listLogSubsurfaces } from "../services/subsurfaceApi";
import { listLogInsituTests } from "../services/logInsituTestApi";
import { listLogDrillingMethods } from "../services/logDrillingMethodApi";
import { getUserDrillingTypes, getUserWaterObservationTypes } from "../services/configModulesApi";
import { createLogFinishLog } from "../services/logFinishLogApi";
import type { SubsurfaceLayer } from "../types/subsurfaceLayer";
import type { LogInsituTest } from "../types/logInsituTest";
import type { LogDrillingMethod } from "../types/logDrillingMethod";
import type { LogFinishLogFormPayload } from "../types/logFinishLog";
import { listLogWaterObservations } from "../services/logWaterObservationApi";
import {
  buildDcpPointsFromInsituTests,
  buildDrillingIntervalsFromMethods,
  buildPspBandsFromInsituTests,
  buildStrataFromLayers,
  buildWaterObservationsForPreview,
  getDcpTestTypeCodesFromLogTemplate,
  parseFinishEndDepthMetres,
} from "../utils/logReportPreviewUtils";
import { getWaterObservationGraphicUrl } from "../utils/configModules/waterObservationType";
import {
  DRILLING_OBSERVATIONS_MODULE_ID,
  LOG_REPORT_MODULE_ID,
  parseDrillingTypeOptions,
  parseWaterObservationTypeOptions,
  WATER_OBSERVATIONS_MODULE_ID,
  type DrillingTypeOption,
} from "../utils/configModules";

function ReportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type UpdateLogPageProps = Readonly<{
  project: Project;
  log: Log;
}>;

export function UpdateLogPage({ project, log }: UpdateLogPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const projectHref = projectDetailPath(project.id);
  const [activeSection, setActiveSection] = useState<LogSectionId>("details");
  const [showReport, setShowReport] = useState(true);
  const [form, setForm] = useState<LogFormState>(() => logToFormState(log));
  const [errors, setErrors] = useState<LogFormErrors>({});
  const [logConfigurations, setLogConfigurations] = useState<LogConfiguration[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [existingLogNumbers, setExistingLogNumbers] = useState<string[]>([]);
  const [loadingReferenceData, setLoadingReferenceData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finishLogOpen, setFinishLogOpen] = useState(false);
  const [subsurfaceLayers, setSubsurfaceLayers] = useState<SubsurfaceLayer[]>([]);
  const [insituTests, setInsituTests] = useState<LogInsituTest[]>([]);
  const [drillingMethods, setDrillingMethods] = useState<LogDrillingMethod[]>([]);
  const [waterObservationRows, setWaterObservationRows] = useState<
    Array<{ depth: string; observationTypeName: string; observationTypeId: string }>
  >([]);
  const [waterObservationTypes, setWaterObservationTypes] = useState<
    ReturnType<typeof parseWaterObservationTypeOptions>
  >([]);
  const [drillingTypes, setDrillingTypes] = useState<DrillingTypeOption[]>([]);
  // Shared with LogReportSection so its "Open in new tab"/"Save as PDF" buttons can act on
  // the actual rendered sheet, which lives in the sibling LogReportPreview panel.
  const reportSheetRef = useRef<HTMLElement>(null);

  const selectedLogConfig = useMemo(
    () => logConfigurations.find((config) => config.id === form.logConfigId) ?? null,
    [form.logConfigId, logConfigurations]
  );

  const selectedLogConfigEnabledModules = selectedLogConfig?.enabledModules ?? [];

  const visibleLogSections = useMemo(() => {
    // Until the selected config is loaded, keep the full tab list to avoid a flash.
    if (!selectedLogConfig && loadingReferenceData) return [...LOG_SECTIONS];
    return getVisibleLogSections(selectedLogConfigEnabledModules);
  }, [loadingReferenceData, selectedLogConfig, selectedLogConfigEnabledModules]);

  const reportModuleEnabled = useMemo(() => {
    if (!selectedLogConfig && loadingReferenceData) return true;
    return isLogSectionVisible("report", selectedLogConfigEnabledModules);
  }, [loadingReferenceData, selectedLogConfig, selectedLogConfigEnabledModules]);

  const reportEnabled = reportModuleEnabled && (activeSection === "report" || showReport);
  const logReportModuleConfig = selectedLogConfig?.moduleSettings.modules[LOG_REPORT_MODULE_ID]
    ?.report;
  const report = useLogReportPreviewState({
    enabled: reportEnabled,
    preferredBorelogTemplateId: logReportModuleConfig?.borelogTemplate,
    preferredCorelogTemplateId: logReportModuleConfig?.corelogTemplate,
    preferredHeaderId: logReportModuleConfig?.logHeader,
    preferredFooterId: logReportModuleConfig?.logFooter,
  });
  const subsurfaceRuntime = useSubsurfaceRuntime({
    logConfigurationId: form.logConfigId,
    enabled: reportEnabled,
  });
  const companyName = user?.companyName ?? null;
  const companyLogoUrl = user?.companyLogoUrl ?? null;
  const companyEmail = user?.email ?? null;
  const phoneCode = user?.phoneCode ?? null;
  const phoneNumber = user?.phoneNumber ?? null;

  const reportStrata = useMemo(() => {
    const workflow = subsurfaceRuntime.context?.workflow;
    const subsurfaceSettings = subsurfaceRuntime.context?.subsurfaceSettings;
    return buildStrataFromLayers(
      subsurfaceLayers,
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
  }, [subsurfaceLayers, subsurfaceRuntime.context, form.endDepth]);

  const reportDcpPoints = useMemo(
    () =>
      buildDcpPointsFromInsituTests(
        insituTests,
        getDcpTestTypeCodesFromLogTemplate(report.selectedLogTemplate)
      ),
    [insituTests, report.selectedLogTemplate]
  );

  const reportDrillingIntervals = useMemo(
    () => buildDrillingIntervalsFromMethods(drillingMethods, drillingTypes),
    [drillingMethods, drillingTypes]
  );

  const reportPspBands = useMemo(
    () => buildPspBandsFromInsituTests(insituTests),
    [insituTests]
  );

  const reportWaterObservations = useMemo(() => {
    const typeById = new Map(
      waterObservationTypes.map((entry) => [entry.id.trim().toLowerCase(), entry])
    );
    const typeByName = new Map(
      waterObservationTypes.map((entry) => [entry.name.trim().toLowerCase(), entry])
    );
    return buildWaterObservationsForPreview(
      waterObservationRows.map((row) => {
        const idKey = row.observationTypeId.trim().toLowerCase();
        const nameKey = row.observationTypeName.trim().toLowerCase();
        const type = typeById.get(idKey) ?? typeByName.get(nameKey);
        const graphicUrl = type?.graphic
          ? getWaterObservationGraphicUrl(type.graphic)
          : undefined;
        return { ...row, graphicUrl };
      })
    );
  }, [waterObservationRows, waterObservationTypes]);

  const handleActiveLayersChange = useCallback((layers: SubsurfaceLayer[]) => {
    setSubsurfaceLayers(layers);
  }, []);

  const handleActiveInsituTestsChange = useCallback((tests: LogInsituTest[]) => {
    setInsituTests(tests);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await listLogSubsurfaces(project.id, log.id, 1, MAX_TABLE_PAGE_SIZE, {
          sortBy: "sortOrder",
          sortOrder: "asc",
        });
        if (!cancelled) setSubsurfaceLayers(result.data);
      } catch {
        if (!cancelled) setSubsurfaceLayers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id, log.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await listLogInsituTests(project.id, log.id, 1, MAX_TABLE_PAGE_SIZE, {
          sortBy: "sortOrder",
          sortOrder: "asc",
        });
        if (!cancelled) setInsituTests(result.data);
      } catch {
        if (!cancelled) setInsituTests([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id, log.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await listLogWaterObservations(project.id, log.id, 1, MAX_TABLE_PAGE_SIZE, {
          sortBy: "sortOrder",
          sortOrder: "asc",
        });
        if (!cancelled) {
          setWaterObservationRows(
            result.data.map((entry) => ({
              depth: entry.depth,
              observationTypeName: entry.observationTypeName,
              observationTypeId: entry.observationTypeId,
            }))
          );
        }
      } catch {
        if (!cancelled) setWaterObservationRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id, log.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!form.logConfigId.trim()) {
        setWaterObservationTypes([]);
        return;
      }
      try {
        const { data } = await getUserWaterObservationTypes(
          WATER_OBSERVATIONS_MODULE_ID,
          form.logConfigId
        );
        if (!cancelled) {
          setWaterObservationTypes(parseWaterObservationTypeOptions(data, []));
        }
      } catch {
        if (!cancelled) setWaterObservationTypes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.logConfigId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await listLogDrillingMethods(project.id, log.id, 1, MAX_TABLE_PAGE_SIZE, {
          sortBy: "sortOrder",
          sortOrder: "asc",
        });
        if (!cancelled) setDrillingMethods(result.data);
      } catch {
        if (!cancelled) setDrillingMethods([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id, log.id, activeSection]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!form.logConfigId.trim()) {
        setDrillingTypes([]);
        return;
      }
      try {
        const { data } = await getUserDrillingTypes(
          DRILLING_OBSERVATIONS_MODULE_ID,
          form.logConfigId
        );
        if (!cancelled) setDrillingTypes(parseDrillingTypeOptions(data, []));
      } catch {
        if (!cancelled) setDrillingTypes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.logConfigId]);

  useEffect(() => {
    setForm(logToFormState(log));
    setErrors({});
  }, [log]);

  const loadReferenceData = useCallback(async () => {
    setLoadingReferenceData(true);
    try {
      const [logConfigsResult, suppliersResult, equipmentResult, logsResult] = await Promise.all([
        listLogConfigurations(1, MAX_TABLE_PAGE_SIZE, { status: "active" }),
        listSuppliers(1, MAX_TABLE_PAGE_SIZE, { supplierType: "Equipment", status: "active" }),
        listEquipment(1, MAX_TABLE_PAGE_SIZE),
        listProjectLogs(project.id, 1, MAX_TABLE_PAGE_SIZE),
      ]);

      setLogConfigurations(logConfigsResult.data);
      setSuppliers(suppliersResult.data);
      setEquipment(equipmentResult.data);
      setExistingLogNumbers(
        logsResult.data
          .filter((item) => item.id !== log.id)
          .map((item) => item.logNumber)
      );

      const settings = resolveLogConfigRuntimeSettings(log.logConfigId, logConfigsResult.data);
      if (!settings.allowCoordinateSystemAtLog) {
        setForm((current) => ({
          ...current,
          coordinateSystem: settings.coordinateSystem,
        }));
      }
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_FORM);
    } finally {
      setLoadingReferenceData(false);
    }
  }, [log.id, log.logConfigId, project.id]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  const logConfigOptions = useMemo(
    () =>
      logConfigurations
        .filter((config) => config.status === "active" || config.id === form.logConfigId)
        .map((config) => ({
          value: config.id,
          label: config.name,
        })),
    [form.logConfigId, logConfigurations]
  );

  useEffect(() => {
    if (!visibleLogSections.some((section) => section.id === activeSection)) {
      setActiveSection("details");
    }
  }, [activeSection, visibleLogSections]);

  useEffect(() => {
    if (!reportModuleEnabled && showReport) {
      setShowReport(false);
    }
  }, [reportModuleEnabled, showReport]);

  const logTypeOptions = useMemo(
    () => LOG_TYPES.map((type) => ({ value: type.id, label: type.name })),
    []
  );

  const supplierOptions = useMemo(
    () =>
      suppliers
        .filter((supplier) => supplier.status === "active" && supplier.supplierType === "Equipment")
        .map((supplier) => ({
          value: String(supplier.id),
          label: supplier.businessName,
        })),
    [suppliers]
  );

  const selectedSupplierName = useMemo(
    () => supplierOptions.find((option) => option.value === form.supplierId)?.label ?? "",
    [form.supplierId, supplierOptions]
  );

  const equipmentOptions = useMemo(() => {
    if (!selectedSupplierName) return [];

    return equipment
      .filter((item) => item.suppliers.includes(selectedSupplierName))
      .map((item) => ({
        value: String(item.id),
        label: item.equipmentName,
      }));
  }, [equipment, selectedSupplierName]);

  const selectedEquipmentLabel = useMemo(
    () => equipmentOptions.find((option) => option.value === form.equipmentId)?.label ?? "",
    [equipmentOptions, form.equipmentId]
  );

  const selectedConfigName = useMemo(
    () =>
      logConfigurations.find((config) => config.id === form.logConfigId)?.name ??
      (form.logConfigId ? form.logConfigId : "No configuration selected"),
    [form.logConfigId, logConfigurations]
  );

  const selectedCoordinateSystemLabel = useMemo(
    () =>
      COORDINATE_SYSTEMS.find((system) => system.value === form.coordinateSystem)?.label ??
      form.coordinateSystem,
    [form.coordinateSystem]
  );

  const selectedLogConfigSettings = useMemo(
    () => resolveLogConfigRuntimeSettings(form.logConfigId, logConfigurations),
    [form.logConfigId, logConfigurations]
  );

  const finishingReasonsApi = useUserFinishingReasons({
    enabled: Boolean(form.logConfigId.trim()),
    logConfigurationId: form.logConfigId,
  });

  const finishingReasonOptions = useMemo(() => {
    const options = [...finishingReasonsApi.selectOptions];
    const current = form.finishingReason.trim();
    if (current && !options.some((option) => option.value === current)) {
      options.unshift({ value: current, label: current });
    }
    return options;
  }, [finishingReasonsApi.selectOptions, form.finishingReason]);

  const coordinatesRequired = areCoordinatesRequired(selectedLogConfigSettings);
  const coordinateUnit = coordinateUnitLabel(selectedLogConfigSettings.coordinateSystemUnit);
  const elevationUnit = coordinateUnitLabel(selectedLogConfigSettings.elevationUnit);
  const canEditCoordinateSystem = selectedLogConfigSettings.allowCoordinateSystemAtLog;

  const selectedLogTypeName = useMemo(
    () => LOG_TYPES.find((type) => type.id === form.logType)?.name ?? log.logTypeLabel,
    [form.logType, log.logTypeLabel]
  );

  const logStatusOptions = useMemo(() => {
    const options: string[] = [...LOG_WORKFLOW_STATUSES];
    if (form.logStatus && !options.includes(form.logStatus)) {
      options.unshift(form.logStatus);
    }
    return options;
  }, [form.logStatus]);

  const update = <K extends keyof LogFormState>(key: K, value: LogFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleLogConfigChange = (logConfigId: string) => {
    const settings = resolveLogConfigRuntimeSettings(logConfigId, logConfigurations);
    setForm((current) => ({
      ...current,
      logConfigId,
      coordinateSystem: settings.coordinateSystem,
    }));
    setErrors((current) => ({
      ...current,
      logConfigId: undefined,
      coordinateSystem: undefined,
    }));
  };

  const showEastingNorthing = showEastingNorthingFields(form.coordinateSystem);
  const showStation = showStationField(form.coordinateSystem);
  const showInclination = showInclinationFields(form.logType);
  const isBusy = loadingReferenceData || submitting;

  const handleShowReportChange = () => {
    setShowReport((current) => !current);
  };

  const handleSidebarChange = (_section: ProjectSidebarSectionId) => {
    router.push(projectHref);
  };

  const handleSupplierChange = (supplierId: string) => {
    setForm((current) => ({
      ...current,
      supplierId,
      equipmentId: "",
    }));
    setErrors((current) => ({ ...current, supplierId: undefined, equipmentId: undefined }));
  };

  const handleCancel = () => {
    router.push(projectHref);
  };

  const handleFinishLogSubmit = async (payload: LogFinishLogFormPayload) => {
    await createLogFinishLog(project.id, log.id, payload);
    setForm((current) => ({
      ...current,
      finishingReason: payload.finishTypeName,
      finishLogDate: payload.completedDate,
      endDepth: payload.endDepth,
      finishingComment: payload.comments,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusy) return;

    const preparedForm = prepareLogFormForSubmit(form, {
      defaultLogConfigId: log.logConfigId,
      logConfigurations,
    });

    const nextErrors = validateLogForm(preparedForm, existingLogNumbers, {
      coordinatesRequired,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!preparedForm.logConfigId.trim()) {
      setErrors((current) => ({
        ...current,
        logConfigId: "Log configuration is required.",
      }));
      return;
    }

    setSubmitting(true);

    try {
      const payload = formToLogPayload(preparedForm);
      const { data, message } = await updateLog(project.id, log.id, payload);
      setForm(logToFormState(data));
      showApiSuccess(message, API_MESSAGES.LOG_UPDATED);
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, API_ERROR_MESSAGES.UPDATE_LOG);
      if (errorMessage.toLowerCase().includes("log number")) {
        setErrors((current) => ({
          ...current,
          logNumber: "A log with this log number already exists.",
        }));
      }
      showApiError(err, errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="project-dashboard update-log-page">
      <div className="project-dashboard__layout">
        <ProjectSidebar activeSection="logs" onSectionChange={handleSidebarChange} />

        <div className="project-dashboard__main">
          <header className="project-dashboard__header update-log-page__header">
            <nav className="project-dashboard__breadcrumbs" aria-label="Breadcrumb">
              <Link href="/dashboard">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/dashboard/projects">Projects</Link>
              <span aria-hidden="true">/</span>
              <Link href={projectHref}>{project.projectNo}</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{log.logNumber}</span>
            </nav>

            <div className="update-log-page__header-main">
              <div className="update-log-page__header-copy">
                <div className="project-dashboard__title-row">
                  <h1 className="project-dashboard__title">{form.logNumber || log.logNumber}</h1>
                  <span className="update-log-page__type-badge">{selectedLogTypeName}</span>
                </div>
                <p className="project-dashboard__subtitle">{selectedConfigName}</p>
              </div>

              <div className="update-log-page__header-actions">
                <FormField label="Log Status" className="update-log-page__status-field">
                  <Select
                    value={form.logStatus}
                    onChange={(value) => update("logStatus", value)}
                    options={logStatusOptions}
                    disabled={isBusy}
                  />
                </FormField>

                <div className="update-log-page__header-btns">
                  <UiButton
                    type="button"
                    variant="primary"
                    disabled={isBusy}
                    onClick={() => setFinishLogOpen(true)}
                  >
                    Finish Log
                  </UiButton>

                  <UiButton
                    type="button"
                    variant={showReport ? "secondary" : "outline"}
                    className={showReport ? "is-active" : undefined}
                    aria-pressed={showReport}
                    onClick={handleShowReportChange}
                    disabled={!reportModuleEnabled}
                  >
                    <ReportIcon />
                    {showReport ? "Hide Log Report" : "Show Log Report"}
                  </UiButton>
                </div>
              </div>
            </div>
          </header>

          <div className="project-dashboard__container update-log-page__container">
            <div className="update-log-page__tabs ui-scrollbar" role="tablist" aria-label="Log sections">
              {visibleLogSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === section.id}
                  className={`update-log-page__tab${activeSection === section.id ? " is-active" : ""}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </div>

            <div
              className={`update-log-page__workspace${showReport ? " is-split" : ""}`}
            >
              <div className="update-log-page__workspace-main">
                {activeSection === "details" ? (
                  <form className="update-log-page__form" onSubmit={(event) => void handleSubmit(event)} noValidate>
                    <div className="update-log-page__form-toolbar">
                      <h2 className="update-log-page__form-title">Update Log</h2>
                    </div>

                    <div className="update-log-page__grid">
                      <section className="update-log-page__panel" aria-labelledby="log-information-title">
                        <div className="update-log-page__panel-head">
                          <h3 id="log-information-title" className="update-log-page__panel-title">
                            Log Information
                          </h3>
                        </div>

                        <div className="update-log-page__fields update-log-page__fields--stack">
                          <FormField label="Log Number" required error={errors.logNumber}>
                            <Input
                              variant="ui"
                              type="text"
                              maxLength={50}
                              value={form.logNumber}
                              onChange={(event) => update("logNumber", event.target.value)}
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField label="Select Log Configuration" required error={errors.logConfigId}>
                            <Select
                              value={form.logConfigId}
                              onChange={handleLogConfigChange}
                              options={logConfigOptions}
                              search
                              searchPlaceholder="Search configurations…"
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField label="Log Type" required error={errors.logType}>
                            <Select
                              value={form.logType}
                              onChange={(value) => update("logType", value)}
                              options={logTypeOptions}
                              placeholder="Select log type"
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField label="Log Status" error={errors.logStatus}>
                            <Select
                              value={form.logStatus}
                              onChange={(value) => update("logStatus", value)}
                              options={logStatusOptions}
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField label="Drilling Date" error={errors.drillingDate}>
                            <DatePicker
                              value={form.drillingDate}
                              onChange={(value) => update("drillingDate", value)}
                              placeholder={selectedLogConfigSettings.dateFormat}
                              displayFormat={selectedLogConfigSettings.dateFormat}
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField label="Drilling Time" error={errors.drillingTime}>
                            <TimePicker
                              value={form.drillingTime}
                              onChange={(value) => update("drillingTime", value)}
                              placeholder="Drilling Time"
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField label="Finish Log Date" error={errors.finishLogDate}>
                            <DatePicker
                              value={form.finishLogDate}
                              onChange={(value) => update("finishLogDate", value)}
                              placeholder={selectedLogConfigSettings.dateFormat}
                              displayFormat={selectedLogConfigSettings.dateFormat}
                              min={form.drillingDate || undefined}
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField label="Finish Log Time" error={errors.finishLogTime}>
                            <TimePicker
                              value={form.finishLogTime}
                              onChange={(value) => update("finishLogTime", value)}
                              placeholder="Finish Log Time"
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField label="End Depth (m)" error={errors.endDepth}>
                            <Input
                              variant="ui"
                              type="text"
                              value={form.endDepth}
                              onChange={(event) => update("endDepth", event.target.value)}
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField label="Finishing Reason" error={errors.finishingReason}>
                            <Select
                              value={form.finishingReason}
                              onChange={(value) => update("finishingReason", value)}
                              options={finishingReasonOptions}
                              placeholder="Select finishing reason"
                              search
                              searchPlaceholder="Search finishing reasons…"
                              disabled={isBusy || finishingReasonsApi.loading}
                            />
                          </FormField>

                          <FormField label="Supplier" error={errors.supplierId}>
                            <Select
                              value={form.supplierId}
                              onChange={handleSupplierChange}
                              options={supplierOptions}
                              placeholder="Select supplier"
                              search
                              searchPlaceholder="Search suppliers…"
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField label="Equipment" error={errors.equipmentId}>
                            <Select
                              value={form.equipmentId}
                              onChange={(value) => update("equipmentId", value)}
                              options={equipmentOptions}
                              placeholder={form.supplierId ? "Select equipment" : "Select a supplier first"}
                              disabled={isBusy || !form.supplierId}
                              search={equipmentOptions.length > 0}
                              searchPlaceholder="Search equipment…"
                            />
                          </FormField>

                          <FormField label="Finishing Comment">
                            <textarea
                              className="ui-textarea"
                              rows={5}
                              value={form.finishingComment}
                              onChange={(event) => update("finishingComment", event.target.value)}
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField label="General Comments">
                            <textarea
                              className="ui-textarea"
                              rows={5}
                              value={form.generalComments}
                              onChange={(event) => update("generalComments", event.target.value)}
                              disabled={isBusy}
                            />
                          </FormField>

                          {canEditCoordinateSystem ? (
                            <FormField label="Coordinate System" className="update-log-page__field--full">
                              <Select
                                value={form.coordinateSystem}
                                onChange={(value) => update("coordinateSystem", value)}
                                options={COORDINATE_SYSTEMS}
                                search
                                searchPlaceholder="Search coordinate system…"
                                floatingMenu
                                disabled={isBusy}
                              />
                            </FormField>
                          ) : (
                            <p className="update-log-page__meta update-log-page__field--full">
                              Coordinate System: {selectedCoordinateSystemLabel}
                            </p>
                          )}

                          <FormField
                            label="Latitude (WGS84)"
                            required={coordinatesRequired}
                            error={errors.latitude}
                          >
                            <Input
                              variant="ui"
                              type="text"
                              inputMode="decimal"
                              value={form.latitude}
                              onChange={(event) => update("latitude", event.target.value)}
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField
                            label="Longitude (WGS84)"
                            required={coordinatesRequired}
                            error={errors.longitude}
                          >
                            <Input
                              variant="ui"
                              type="text"
                              inputMode="decimal"
                              value={form.longitude}
                              onChange={(event) => update("longitude", event.target.value)}
                              disabled={isBusy}
                            />
                          </FormField>

                          {showEastingNorthing ? (
                            <>
                              {canEditCoordinateSystem ? (
                                <p className="update-log-page__meta update-log-page__field--full">
                                  Coordinate System: {selectedCoordinateSystemLabel}
                                </p>
                              ) : null}

                              <FormField label={`Easting (${coordinateUnit})`}>
                                <Input
                                  variant="ui"
                                  type="text"
                                  inputMode="decimal"
                                  value={form.easting}
                                  onChange={(event) => update("easting", event.target.value)}
                                  disabled={isBusy}
                                />
                              </FormField>

                              <FormField label={`Northing (${coordinateUnit})`}>
                                <Input
                                  variant="ui"
                                  type="text"
                                  inputMode="decimal"
                                  value={form.northing}
                                  onChange={(event) => update("northing", event.target.value)}
                                  disabled={isBusy}
                                />
                              </FormField>

                              <FormField label="UTM Zone" className="update-log-page__field--full">
                                <Select
                                  value={form.utmZone}
                                  onChange={(value) => update("utmZone", value)}
                                  options={UTM_ZONES}
                                  placeholder="Select UTM Zone"
                                  search
                                  searchPlaceholder="Search UTM zone…"
                                  floatingMenu
                                  disabled={isBusy}
                                />
                              </FormField>
                            </>
                          ) : null}

                          <FormField label={`Elevation (${elevationUnit})`} error={errors.elevation}>
                            <Input
                              variant="ui"
                              type="text"
                              value={form.elevation}
                              onChange={(event) => update("elevation", event.target.value)}
                              disabled={isBusy}
                            />
                          </FormField>

                          {showStation ? (
                            <FormField label="Station" error={errors.station}>
                              <Input
                                variant="ui"
                                type="text"
                                value={form.station}
                                onChange={(event) => update("station", event.target.value)}
                                disabled={isBusy}
                              />
                            </FormField>
                          ) : null}

                          {showInclination ? (
                            <>
                              <FormField label="Inclination (°)" error={errors.inclination}>
                                <Input
                                  variant="ui"
                                  type="text"
                                  value={form.inclination}
                                  onChange={(event) => update("inclination", event.target.value)}
                                  disabled={isBusy}
                                />
                              </FormField>

                              <FormField label="Azimuth (°)" error={errors.azimuth}>
                                <Input
                                  variant="ui"
                                  type="text"
                                  value={form.azimuth}
                                  onChange={(event) => update("azimuth", event.target.value)}
                                  disabled={isBusy}
                                />
                              </FormField>
                            </>
                          ) : null}

                          <FormField label="Logged By" error={errors.loggedBy}>
                            <Input
                              variant="ui"
                              type="text"
                              placeholder="Logged By"
                              value={form.loggedBy}
                              onChange={(event) => update("loggedBy", event.target.value)}
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField label="Reviewed By" error={errors.reviewedBy}>
                            <Input
                              variant="ui"
                              type="text"
                              placeholder="Reviewed By"
                              value={form.reviewedBy}
                              onChange={(event) => update("reviewedBy", event.target.value)}
                              disabled={isBusy}
                            />
                          </FormField>

                          <FormField label="Location Comment" className="update-log-page__field--full">
                            <textarea
                              className="ui-textarea"
                              rows={5}
                              value={form.locationComment}
                              onChange={(event) => update("locationComment", event.target.value)}
                              disabled={isBusy}
                            />
                          </FormField>
                        </div>
                      </section>
                    </div>

                    <div className="update-log-page__footer">
                      <UiButton type="button" variant="ghost" onClick={handleCancel} disabled={submitting}>
                        Cancel
                      </UiButton>
                      <UiButton type="submit" variant="primary" disabled={isBusy}>
                        {submitting ? "Saving…" : "Submit"}
                      </UiButton>
                    </div>
                  </form>
                ) : activeSection === "report" ? (
                  <LogReportSection
                    project={project}
                    form={form}
                    report={report}
                    companyName={companyName}
                    companyLogoUrl={companyLogoUrl}
                    companyEmail={companyEmail}
                    phoneCode={phoneCode}
                    phoneNumber={phoneNumber}
                    equipmentLabel={selectedEquipmentLabel}
                    supplierLabel={selectedSupplierName}
                    sheetRef={reportSheetRef}
                  />
                ) : activeSection === "subsurface" ? (
                  <SubsurfaceSection
                    projectId={project.id}
                    logId={log.id}
                    logConfigurationId={form.logConfigId}
                    onActiveLayersChange={handleActiveLayersChange}
                  />
                ) : activeSection === "insitu-tests" ? (
                  <InsituTestsSection
                    projectId={project.id}
                    logId={log.id}
                    logConfigurationId={form.logConfigId}
                    onActiveTestsChange={handleActiveInsituTestsChange}
                  />
                ) : activeSection === "remarks" ? (
                  <RemarksSection
                    projectId={project.id}
                    logId={log.id}
                    logConfigurationId={form.logConfigId}
                  />
                ) : activeSection === "samples" ? (
                  <SamplesSection
                    projectId={project.id}
                    logId={log.id}
                    logConfigurationId={form.logConfigId}
                  />
                ) : activeSection === "drilling-observations" ? (
                  <DrillingObservationsSection
                    projectId={project.id}
                    logId={log.id}
                    logConfigurationId={form.logConfigId}
                  />
                ) : activeSection === "well-logs" ? (
                  <WellLogsSection
                    projectId={project.id}
                    logId={log.id}
                    logConfigurationId={form.logConfigId}
                  />
                ) : activeSection === "water-observations" ? (
                  <WaterObservationsSection
                    projectId={project.id}
                    logId={log.id}
                    logConfigurationId={form.logConfigId}
                  />
                ) : activeSection === "core-logging" ? (
                  <CoreLoggingSection
                    projectId={project.id}
                    logId={log.id}
                    logConfigurationId={form.logConfigId}
                  />
                ) : activeSection === "lab-tests" ? (
                  <LogLabTestsSection
                    projectId={project.id}
                    logId={log.id}
                    logConfigurationId={form.logConfigId}
                  />
                ) : (
                  <div className="update-log-page__placeholder">
                    <p>{LOG_SECTIONS.find((section) => section.id === activeSection)?.label}</p>
                    <span>This section is coming soon.</span>
                  </div>
                )}
              </div>

              {showReport && reportModuleEnabled ? (
                <LogReportPreview
                  project={project}
                  form={form}
                  report={report}
                  companyName={companyName}
                  companyLogoUrl={companyLogoUrl}
                  companyEmail={companyEmail}
                  phoneCode={phoneCode}
                  phoneNumber={phoneNumber}
                  equipmentLabel={selectedEquipmentLabel}
                  supplierLabel={selectedSupplierName}
                  subsurfaceLayers={reportStrata}
                  dcpPoints={reportDcpPoints}
                  drillingIntervals={reportDrillingIntervals}
                  pspBands={reportPspBands}
                  waterObservations={reportWaterObservations}
                  sheetRef={reportSheetRef}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <FinishLogModal
        open={finishLogOpen}
        onClose={() => setFinishLogOpen(false)}
        logConfigurationId={form.logConfigId}
        dateFormat={selectedLogConfigSettings.dateFormat}
        minDate={form.drillingDate || undefined}
        initialValues={{
          finishTypeName: form.finishingReason,
          completedDate: form.finishLogDate,
          endDepth: form.endDepth,
          comments: form.finishingComment,
        }}
        onSubmit={handleFinishLogSubmit}
      />
    </div>
  );
}
