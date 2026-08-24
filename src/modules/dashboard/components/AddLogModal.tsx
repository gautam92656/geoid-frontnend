"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { DatePicker, FormField, Input, Select, TimePicker, UiButton, ProjectModalPortal } from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { getApiErrorMessage, showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { COORDINATE_SYSTEMS } from "../data/coordinateSystems";
import {
  LOG_CREATION_STATUSES,
  LOG_TYPES,
} from "../data/logOptions";
import { UTM_ZONES } from "../data/utmZones";
import { useUserFinishingReasons } from "../hooks/useUserFinishingReasons";
import { listEquipment } from "../services/equipmentApi";
import { createLog, formToLogPayload, listProjectLogs } from "../services/logApi";
import { listLogConfigurations } from "../services/logConfigurationApi";
import { listSuppliers } from "../services/supplierApi";
import type { Equipment } from "../types/equipment";
import type { Log, LogFormState } from "../types/log";
import type { LogConfiguration } from "../types/logConfiguration";
import type { Supplier } from "../types/supplier";
import {
  createEmptyLogForm,
  type LogFormErrors,
  prepareLogFormForSubmit,
  resolveDefaultLogConfigId,
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

type AddLogModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  projectId: number;
  defaultLogConfigId?: string;
  onSubmit: (log: Log) => void;
}>;

export function AddLogModal({
  open,
  onClose,
  projectId,
  defaultLogConfigId = "",
  onSubmit,
}: AddLogModalProps) {
  const formId = useId();
  const [form, setForm] = useState<LogFormState>(() => createEmptyLogForm());
  const [errors, setErrors] = useState<LogFormErrors>({});
  const [logConfigurations, setLogConfigurations] = useState<LogConfiguration[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [existingLogNumbers, setExistingLogNumbers] = useState<string[]>([]);
  const [loadingReferenceData, setLoadingReferenceData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const logConfigOptions = useMemo(
    () =>
      logConfigurations
        .filter((config) => config.status === "active")
        .map((config) => ({
          value: config.id,
          label: config.name,
        })),
    [logConfigurations]
  );

  const logTypeOptions = useMemo(
    () => LOG_TYPES.map((type) => ({ value: type.id, label: type.name })),
    []
  );

  const logStatusOptions = useMemo(
    () => LOG_CREATION_STATUSES.map((status) => ({ value: status, label: status })),
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
    enabled: open && Boolean(form.logConfigId.trim()),
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

  const showEastingNorthing = showEastingNorthingFields(form.coordinateSystem);
  const showStation = showStationField(form.coordinateSystem);
  const showInclination = showInclinationFields(form.logType);

  const loadSelectReferenceData = useCallback(async () => {
    const [logConfigsResult, suppliersResult, equipmentResult] = await Promise.all([
      listLogConfigurations(1, MAX_TABLE_PAGE_SIZE, { status: "active" }),
      listSuppliers(1, MAX_TABLE_PAGE_SIZE, { supplierType: "Equipment", status: "active" }),
      listEquipment(1, MAX_TABLE_PAGE_SIZE),
    ]);

    setLogConfigurations(logConfigsResult.data);
    setSuppliers(suppliersResult.data);
    setEquipment(equipmentResult.data);

    const resolvedLogConfigId = resolveDefaultLogConfigId(
      defaultLogConfigId,
      logConfigsResult.data
    );
    const settings = resolveLogConfigRuntimeSettings(resolvedLogConfigId, logConfigsResult.data);
    setForm(createEmptyLogForm(resolvedLogConfigId, settings.coordinateSystem));

    return logConfigsResult.data;
  }, [defaultLogConfigId]);

  const loadProjectLogData = useCallback(async () => {
    const logsResult = await listProjectLogs(projectId, 1, MAX_TABLE_PAGE_SIZE);
    setExistingLogNumbers(logsResult.data.map((log) => log.logNumber));
  }, [projectId]);

  const loadReferenceData = useCallback(async () => {
    setLoadingReferenceData(true);
    try {
      await loadSelectReferenceData();
      await loadProjectLogData();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_FORM);
    } finally {
      setLoadingReferenceData(false);
    }
  }, [loadProjectLogData, loadSelectReferenceData]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setForm(createEmptyLogForm());
      setLogConfigurations([]);
      setSuppliers([]);
      setEquipment([]);
      setExistingLogNumbers([]);
      setErrors({});
      setSubmitting(false);
      return;
    }

    void loadReferenceData();
  }, [open, loadReferenceData]);

  const isBusy = loadingReferenceData || submitting;

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

  const handleSupplierChange = (supplierId: string) => {
    setForm((current) => ({
      ...current,
      supplierId,
      equipmentId: "",
    }));
    setErrors((current) => ({ ...current, supplierId: undefined, equipmentId: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusy) return;

    const preparedForm = prepareLogFormForSubmit(form, {
      defaultLogConfigId,
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
      const { data, message } = await createLog(projectId, payload);

      showApiSuccess(message, API_MESSAGES.LOG_ADDED);
      onSubmit(data);
      onClose();
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, API_ERROR_MESSAGES.ADD_LOG);
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
    <ProjectModalPortal open={open}>
      <div className="project-modal" role="presentation">
      <button
        type="button"
        className="project-modal__backdrop"
        aria-label="Close add log dialog"
        onClick={onClose}
      />

      <div
        className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--wide project-modal__dialog--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-log-title"
      >
        <div className="project-modal__header">
          <h2 id="add-log-title" className="project-modal__title">
            Add New Log
          </h2>
          <p className="project-modal__subtitle">Fill in the log details.</p>
        </div>

        <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
          <div className="project-modal__body ui-scrollbar">
            <section className="project-modal__section">
              {/* <h3 className="project-modal__section-title">Log Information</h3> */}

              <div className="project-modal__fields">
                <FormField
                  label="Log Number"
                  required
                  error={errors.logNumber}
                  className="project-modal__field--full"
                >
                  <Input
                    variant="ui"
                    type="text"
                    maxLength={50}
                    placeholder="Log Number"
                    value={form.logNumber}
                    onChange={(event) => update("logNumber", event.target.value)}
                    autoFocus
                  />
                </FormField>

                <FormField
                  label="Log Configuration"
                  error={errors.logConfigId}
                  className="project-modal__field--full"
                >
                  <Select
                    value={form.logConfigId}
                    onChange={handleLogConfigChange}
                    options={logConfigOptions}
                    placeholder={loadingReferenceData ? "Loading configurations…" : "Select configuration"}
                    search
                    searchPlaceholder="Search configurations…"
                    disabled={loadingReferenceData}
                  />
                </FormField>

                <FormField label="Log Type" required error={errors.logType}>
                  <Select
                    value={form.logType}
                    onChange={(value) => update("logType", value)}
                    options={logTypeOptions}
                    placeholder="Select log type"
                    search
                    searchPlaceholder="Search log types…"
                  />
                </FormField>

                <FormField label="Log Status" error={errors.logStatus}>
                  <Select
                    value={form.logStatus}
                    onChange={(value) => update("logStatus", value)}
                    options={logStatusOptions}
                    placeholder="Select log status"
                  />
                </FormField>

                <FormField label="Drilling Date" error={errors.drillingDate}>
                  <DatePicker
                    value={form.drillingDate}
                    onChange={(value) => update("drillingDate", value)}
                    placeholder={selectedLogConfigSettings.dateFormat}
                    displayFormat={selectedLogConfigSettings.dateFormat}
                  />
                </FormField>

                <FormField label="Drilling Time" error={errors.drillingTime}>
                  <TimePicker
                    value={form.drillingTime}
                    onChange={(value) => update("drillingTime", value)}
                    placeholder="Drilling Time"
                  />
                </FormField>

                <FormField label="Finish Log Date" error={errors.finishLogDate}>
                  <DatePicker
                    value={form.finishLogDate}
                    onChange={(value) => update("finishLogDate", value)}
                    placeholder={selectedLogConfigSettings.dateFormat}
                    displayFormat={selectedLogConfigSettings.dateFormat}
                    min={form.drillingDate || undefined}
                  />
                </FormField>

                <FormField label="Finish Log Time" error={errors.finishLogTime}>
                  <TimePicker
                    value={form.finishLogTime}
                    onChange={(value) => update("finishLogTime", value)}
                    placeholder="Finish Log Time"
                  />
                </FormField>

                <FormField label="Finishing Reason" error={errors.finishingReason} className="project-modal__field--full">
                  <Select
                    value={form.finishingReason}
                    onChange={(value) => update("finishingReason", value)}
                    options={finishingReasonOptions}
                    placeholder="Select finishing reason"
                    search
                    searchPlaceholder="Search finishing reasons…"
                    disabled={finishingReasonsApi.loading}
                  />
                </FormField>

                {canEditCoordinateSystem ? (
                  <FormField label="Coordinate System" className="project-modal__field--full">
                    <Select
                      value={form.coordinateSystem}
                      onChange={(value) => update("coordinateSystem", value)}
                      options={COORDINATE_SYSTEMS}
                      search
                      searchPlaceholder="Search coordinate system…"
                      floatingMenu
                    />
                  </FormField>
                ) : (
                  <p className="project-modal__meta project-modal__meta--label project-modal__field--full">
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
                    placeholder="Latitude"
                    value={form.latitude}
                    onChange={(event) => update("latitude", event.target.value)}
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
                    placeholder="Longitude"
                    value={form.longitude}
                    onChange={(event) => update("longitude", event.target.value)}
                  />
                </FormField>

                {showEastingNorthing ? (
                  <>
                    {canEditCoordinateSystem ? (
                      <p className="project-modal__meta project-modal__meta--label project-modal__field--full">
                        Coordinate System: {selectedCoordinateSystemLabel}
                      </p>
                    ) : null}

                    <FormField label={`Easting (${coordinateUnit})`}>
                      <Input
                        variant="ui"
                        type="text"
                        inputMode="decimal"
                        placeholder="Easting"
                        value={form.easting}
                        onChange={(event) => update("easting", event.target.value)}
                      />
                    </FormField>

                    <FormField label={`Northing (${coordinateUnit})`}>
                      <Input
                        variant="ui"
                        type="text"
                        inputMode="decimal"
                        placeholder="Northing"
                        value={form.northing}
                        onChange={(event) => update("northing", event.target.value)}
                      />
                    </FormField>

                    <FormField label="UTM Zone" className="project-modal__field--full">
                      <Select
                        value={form.utmZone}
                        onChange={(value) => update("utmZone", value)}
                        options={UTM_ZONES}
                        placeholder="Select UTM Zone"
                        search
                        searchPlaceholder="Search UTM zone…"
                        floatingMenu
                      />
                    </FormField>
                  </>
                ) : null}

                <FormField label={`Elevation (${elevationUnit})`} error={errors.elevation}>
                  <Input
                    variant="ui"
                    type="text"
                    placeholder="Elevation"
                    value={form.elevation}
                    onChange={(event) => update("elevation", event.target.value)}
                  />
                </FormField>

                {showStation ? (
                  <FormField label="Station" error={errors.station}>
                    <Input
                      variant="ui"
                      type="text"
                      placeholder="Station"
                      value={form.station}
                      onChange={(event) => update("station", event.target.value)}
                    />
                  </FormField>
                ) : null}

                <FormField label="Location Comment" className="project-modal__field--full">
                  <textarea
                    className="ui-textarea"
                    placeholder="Location Comment"
                    rows={5}
                    value={form.locationComment}
                    onChange={(event) => update("locationComment", event.target.value)}
                  />
                </FormField>

                <FormField label="Supplier" error={errors.supplierId}>
                  <Select
                    value={form.supplierId}
                    onChange={handleSupplierChange}
                    options={supplierOptions}
                    placeholder={loadingReferenceData ? "Loading suppliers…" : "Select supplier"}
                    search
                    searchPlaceholder="Search suppliers…"
                    disabled={loadingReferenceData}
                  />
                </FormField>

                <FormField label="Equipment" error={errors.equipmentId}>
                  <Select
                    value={form.equipmentId}
                    onChange={(value) => update("equipmentId", value)}
                    options={equipmentOptions}
                    placeholder={form.supplierId ? "Select equipment" : "Select a supplier first"}
                    disabled={!form.supplierId}
                    search={equipmentOptions.length > 0}
                    searchPlaceholder="Search equipment…"
                  />
                </FormField>

                <FormField label="Logged By" error={errors.loggedBy}>
                  <Input
                    variant="ui"
                    type="text"
                    placeholder="Logged By"
                    value={form.loggedBy}
                    onChange={(event) => update("loggedBy", event.target.value)}
                  />
                </FormField>

                <FormField label="Reviewed By" error={errors.reviewedBy}>
                  <Input
                    variant="ui"
                    type="text"
                    placeholder="Reviewed By"
                    value={form.reviewedBy}
                    onChange={(event) => update("reviewedBy", event.target.value)}
                  />
                </FormField>

                {showInclination ? (
                  <>
                    <FormField label="Inclination (°)" error={errors.inclination}>
                      <Input
                        variant="ui"
                        type="number"
                        step="any"
                        placeholder="Inclination"
                        value={form.inclination}
                        onChange={(event) => update("inclination", event.target.value)}
                      />
                    </FormField>

                    <FormField label="Azimuth (°)" error={errors.azimuth}>
                      <Input
                        variant="ui"
                        type="number"
                        step="any"
                        placeholder="Azimuth"
                        value={form.azimuth}
                        onChange={(event) => update("azimuth", event.target.value)}
                      />
                    </FormField>
                  </>
                ) : null}

                <FormField label="General Comments" className="project-modal__field--full">
                  <textarea
                    className="ui-textarea"
                    placeholder="General Comments"
                    rows={5}
                    value={form.generalComments}
                    onChange={(event) => update("generalComments", event.target.value)}
                  />
                </FormField>
              </div>
            </section>
          </div>

          <div className="project-modal__footer">
            <UiButton type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </UiButton>
            <UiButton type="submit" variant="primary" disabled={isBusy}>
              {submitting ? "Submitting…" : "Submit"}
            </UiButton>
          </div>
        </form>
      </div>
    </div>
    </ProjectModalPortal>
  );
}
