"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { DatePicker, FormField, Input, Select, UiButton, ProjectModalPortal } from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { getApiErrorMessage, showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { COORDINATE_SYSTEMS, DEFAULT_COORDINATE_SYSTEM } from "../data/coordinateSystems";
import {
  DEFAULT_PROJECT_STATUS,
  PROJECT_STATUSES,
} from "../data/projectOptions";
import { UTM_ZONES } from "../data/utmZones";
import {
  createClient,
  formToClientPayload,
  listClients,
} from "../services/clientApi";
import { listLogConfigurations } from "../services/logConfigurationApi";
import {
  createOffice,
  formToOfficePayload,
  listOffices,
} from "../services/officeApi";
import type { Client, ClientFormState } from "../types/client";
import type { LogConfiguration } from "../types/logConfiguration";
import type { Office, OfficeFormState } from "../types/office";
import {
  createProject,
  formToProjectPayload,
  updateProject,
} from "../services/projectApi";
import type { Project, ProjectFormState } from "../types/project";
import {
  type ProjectFormErrors,
  projectToForm,
  validateProjectForm,
} from "../utils/projectFormUtils";
import {
  areProjectCoordinatesRequired,
  coordinateUnitLabel,
  resolveProjectLogConfigSettings,
} from "../utils/projectLogConfigUtils";
import { AddClientModal } from "./AddClientModal";
import { AddOfficeModal } from "./AddOfficeModal";

function createEmptyProjectForm(
  defaultLogConfigId = "",
  coordinateSystem = DEFAULT_COORDINATE_SYSTEM
): ProjectFormState {
  return {
    projectAddress: "",
    projectNo: "",
    projectName: "",
    projectStatus: DEFAULT_PROJECT_STATUS,
    logConfigId: defaultLogConfigId,
    client: "",
    office: "",
    startDate: "",
    endDate: "",
    coordinateSystem,
    latitude: "",
    longitude: "",
    easting: "",
    northing: "",
    utmZone: "",
  };
}

type AddProjectModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onSubmit: (project: Project) => void;
  existingProjectNos?: readonly string[];
  editingProject?: Project | null;
}>;

export function AddProjectModal({
  open,
  onClose,
  onSubmit,
  existingProjectNos = [],
  editingProject = null,
}: AddProjectModalProps) {
  const formId = useId();
  const isEditing = editingProject !== null;
  const [form, setForm] = useState<ProjectFormState>(() => createEmptyProjectForm());
  const [clients, setClients] = useState<Client[]>([]);
  const [logConfigurations, setLogConfigurations] = useState<LogConfiguration[]>([]);
  const [loadingReferenceData, setLoadingReferenceData] = useState(false);
  const [offices, setOffices] = useState<Office[]>([]);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isAddOfficeOpen, setIsAddOfficeOpen] = useState(false);
  const [submittingClient, setSubmittingClient] = useState(false);
  const [submittingOffice, setSubmittingOffice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<ProjectFormErrors>({});

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  const clientOptions = useMemo(
    () =>
      clients
        .filter((client) => client.status === "active")
        .map((client) => ({
          value: String(client.id),
          label: client.companyName,
        })),
    [clients]
  );

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

  const officeOptions = useMemo(
    () =>
      offices.map((office) => ({
        value: office.name,
        label: office.name,
      })),
    [offices]
  );

  const showCoordinateFields = form.coordinateSystem !== "latlong";

  const selectedCoordinateSystemLabel = useMemo(
    () =>
      COORDINATE_SYSTEMS.find((system) => system.value === form.coordinateSystem)?.label ??
      form.coordinateSystem,
    [form.coordinateSystem]
  );

  const selectedLogConfigSettings = useMemo(
    () => resolveProjectLogConfigSettings(form.logConfigId, logConfigurations),
    [form.logConfigId, logConfigurations]
  );

  const coordinatesRequired = areProjectCoordinatesRequired(selectedLogConfigSettings);
  const coordinateUnit = coordinateUnitLabel(selectedLogConfigSettings.coordinateSystemUnit);
  const canEditCoordinateSystem = selectedLogConfigSettings.allowCoordinateSystemAtProject;

  const loadReferenceData = useCallback(async () => {
    setLoadingReferenceData(true);
    try {
      const [clientsResult, logConfigsResult, officesResult] = await Promise.all([
        listClients(1, MAX_TABLE_PAGE_SIZE),
        listLogConfigurations(1, MAX_TABLE_PAGE_SIZE, { status: "active" }),
        listOffices(1, MAX_TABLE_PAGE_SIZE),
      ]);

      setClients(clientsResult.data);
      setLogConfigurations(logConfigsResult.data);
      setOffices(officesResult.data);

      const defaultLogConfigId =
        logConfigsResult.data.find((config) => config.status === "active")?.id ?? "";
      const defaultSettings = resolveProjectLogConfigSettings(
        editingProject?.logConfigId || defaultLogConfigId,
        logConfigsResult.data
      );

      if (editingProject) {
        const nextForm = projectToForm(editingProject);
        if (!defaultSettings.allowCoordinateSystemAtProject) {
          nextForm.coordinateSystem = defaultSettings.coordinateSystem;
        }
        setForm(nextForm);
      } else {
        setForm(createEmptyProjectForm(defaultLogConfigId, defaultSettings.coordinateSystem));
      }
      setErrors({});
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_PROJECT_FORM);
    } finally {
      setLoadingReferenceData(false);
    }
  }, [editingProject]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isAddClientOpen && !isAddOfficeOpen) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, isAddClientOpen, isAddOfficeOpen]);

  useEffect(() => {
    if (!open) return;
    void loadReferenceData();
  }, [open, loadReferenceData]);

  useEffect(() => {
    if (!open) {
      setForm(createEmptyProjectForm());
      setClients([]);
      setLogConfigurations([]);
      setOffices([]);
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  const isBusy = loadingReferenceData || submitting || submittingClient || submittingOffice;

  const update = <K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleLogConfigChange = (logConfigId: string) => {
    const settings = resolveProjectLogConfigSettings(logConfigId, logConfigurations);
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

  const handleAddClient = async (clientForm: ClientFormState) => {
    setSubmittingClient(true);
    try {
      const { data, message } = await createClient(formToClientPayload(clientForm));
      setClients((current) => [...current, data]);
      setIsAddClientOpen(false);
      update("client", String(data.id));
      showApiSuccess(message, API_MESSAGES.CLIENT_ADDED);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.ADD_CLIENT);
      throw err;
    } finally {
      setSubmittingClient(false);
    }
  };

  const handleAddOffice = async (officeForm: OfficeFormState) => {
    setSubmittingOffice(true);
    try {
      const { data, message } = await createOffice(formToOfficePayload(officeForm));
      setOffices((current) => [...current, data]);
      setIsAddOfficeOpen(false);
      update("office", data.name);
      showApiSuccess(message, API_MESSAGES.OFFICE_ADDED);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.ADD_OFFICE);
      throw err;
    } finally {
      setSubmittingOffice(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusy) return;

    const nextErrors = validateProjectForm(
      form,
      existingProjectNos,
      editingProject?.projectNo,
      {
        coordinatesRequired,
        allowDuplicateProjectNumbers: selectedLogConfigSettings.allowDuplicateProjectNumbers,
      }
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = formToProjectPayload(form);
      const { data, message } = isEditing
        ? await updateProject(editingProject.id, payload)
        : await createProject(payload);

      showApiSuccess(
        message,
        isEditing ? API_MESSAGES.PROJECT_UPDATED : API_MESSAGES.PROJECT_ADDED
      );
      onSubmit(data);
      onClose();
    } catch (err) {
      const errorMessage = getApiErrorMessage(
        err,
        isEditing ? API_ERROR_MESSAGES.UPDATE_PROJECT : API_ERROR_MESSAGES.ADD_PROJECT
      );
      if (errorMessage.toLowerCase().includes("project number")) {
        setErrors((current) => ({
          ...current,
          projectNo: "A project with this project number already exists.",
        }));
      }
      showApiError(err, errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProjectModalPortal open={open}>
      <>
      <div className="project-modal" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label={`Close ${isEditing ? "edit" : "add"} project dialog`}
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-project-title"
        >
          <div className="project-modal__header">
            <h2 id="add-project-title" className="project-modal__title">
              {isEditing ? "Edit Project" : "Add New Project"}
            </h2>
            <p className="project-modal__subtitle">
              {isEditing
                ? "Update the project and site details."
                : "Create a project with site details."}
            </p>
          </div>

          <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <section className="project-modal__section">
                <h3 className="project-modal__section-title">Project Information</h3>

                <div className="project-modal__fields">
                  <FormField label="Project No" required error={errors.projectNo}>
                    <Input
                      variant="ui"
                      type="text"
                      placeholder="Project No"
                      value={form.projectNo}
                      onChange={(event) => update("projectNo", event.target.value)}
                      autoFocus
                    />
                  </FormField>

                  <FormField label="Project Name" required error={errors.projectName}>
                    <Input
                      variant="ui"
                      type="text"
                      placeholder="Project Name"
                      value={form.projectName}
                      onChange={(event) => update("projectName", event.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Project Address"
                    required
                    error={errors.projectAddress}
                    className="project-modal__field--full"
                  >
                    <Input
                      variant="ui"
                      type="text"
                      placeholder="Project Address"
                      value={form.projectAddress}
                      onChange={(event) => update("projectAddress", event.target.value)}
                    />
                  </FormField>

                  <FormField label="Project Status" required error={errors.projectStatus}>
                    <Select
                      value={form.projectStatus}
                      onChange={(value) => update("projectStatus", value)}
                      options={PROJECT_STATUSES}
                    />
                  </FormField>

                  <FormField
                    label="Default Log Configuration"
                    required
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

                  <FormField label="Client" required error={errors.client} className="project-modal__field--full">
                    <div className="project-modal__inline">
                      <Select
                        className="project-modal__inline-control"
                        value={form.client}
                        onChange={(value) => update("client", value)}
                        options={clientOptions}
                        placeholder={loadingReferenceData ? "Loading clients…" : "Select Client"}
                        search
                        searchPlaceholder="Search client…"
                        disabled={loadingReferenceData}
                      />
                      <UiButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddClientOpen(true)}
                        disabled={loadingReferenceData}
                      >
                        Add Client
                      </UiButton>
                    </div>
                  </FormField>

                  <FormField label="Office" className="project-modal__field--full">
                    <div className="project-modal__inline">
                      <Select
                        className="project-modal__inline-control"
                        value={form.office}
                        onChange={(value) => update("office", value)}
                        options={officeOptions}
                        placeholder={loadingReferenceData ? "Loading offices…" : "Select Office"}
                        search
                        searchPlaceholder="Search office…"
                        disabled={loadingReferenceData}
                      />
                      <UiButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddOfficeOpen(true)}
                        disabled={loadingReferenceData}
                      >
                        Add Office
                      </UiButton>
                    </div>
                  </FormField>

                  <FormField label="Start Date" error={errors.startDate}>
                    <DatePicker
                      value={form.startDate}
                      onChange={(value) => update("startDate", value)}
                      placeholder={selectedLogConfigSettings.dateFormat}
                      displayFormat={selectedLogConfigSettings.dateFormat}
                    />
                  </FormField>

                  <FormField label="End Date" error={errors.endDate}>
                    <DatePicker
                      value={form.endDate}
                      onChange={(value) => update("endDate", value)}
                      placeholder={selectedLogConfigSettings.dateFormat}
                      displayFormat={selectedLogConfigSettings.dateFormat}
                      min={form.startDate || undefined}
                    />
                  </FormField>

                  {canEditCoordinateSystem ? (
                    <FormField label="Coordinate System" className="project-modal__field--full">
                      <Select
                        value={form.coordinateSystem}
                        onChange={(value) => update("coordinateSystem", value)}
                        options={COORDINATE_SYSTEMS}
                        search
                        searchPlaceholder="Search here"
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

                  <p className="project-modal__meta">Timezone: {timezone}</p>

                  {showCoordinateFields ? (
                    <>
                      {canEditCoordinateSystem ? (
                        <p className="project-modal__meta project-modal__meta--label">
                          Coordinate System: {selectedCoordinateSystemLabel}
                        </p>
                      ) : null}

                      <FormField label={`Easting (${coordinateUnit})`}>
                        <Input
                          variant="ui"
                          type="number"
                          step="any"
                          placeholder="Easting"
                          value={form.easting}
                          onChange={(event) => update("easting", event.target.value)}
                        />
                      </FormField>

                      <FormField label={`Northing (${coordinateUnit})`}>
                        <Input
                          variant="ui"
                          type="number"
                          step="any"
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
                </div>
              </section>
            </div>

            <div className="project-modal__footer">
              <UiButton type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </UiButton>
              <UiButton type="submit" variant="primary" disabled={isBusy}>
                {submitting ? "Submitting…" : isEditing ? "Save" : "Submit"}
              </UiButton>
            </div>
          </form>
        </div>
      </div>

      <AddClientModal
        open={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        onSubmit={handleAddClient}
        clients={clients}
        submitting={submittingClient}
      />

      <AddOfficeModal
        open={isAddOfficeOpen}
        onClose={() => setIsAddOfficeOpen(false)}
        onSubmit={handleAddOffice}
        submitting={submittingOffice}
      />
      </>
    </ProjectModalPortal>
  );
}
