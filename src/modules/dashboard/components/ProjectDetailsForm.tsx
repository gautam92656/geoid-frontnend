"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormField, Input, PageLoader, Select, UiButton } from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { getApiErrorMessage, showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { COORDINATE_SYSTEMS } from "../data/coordinateSystems";
import { LABORATORIES } from "../data/laboratories";
import { SERVICE_AREAS } from "../data/serviceAreas";
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
import { getProject, updateProject } from "../services/projectApi";
import type { Client, ClientFormState } from "../types/client";
import type { LogConfiguration } from "../types/logConfiguration";
import type { Office, OfficeFormState } from "../types/office";
import type { Project } from "../types/project";
import {
  mapProjectDetailsApiError,
  projectDetailsFormToPayload,
  projectToDetailsFormState,
  type ProjectDetailsFormErrors,
  type ProjectDetailsFormState,
  validateProjectDetailsForm,
} from "../utils/projectDetailsFormUtils";
import {
  areProjectCoordinatesRequired,
  coordinateUnitLabel,
  resolveProjectLogConfigSettings,
} from "../utils/projectLogConfigUtils";
import { AddClientModal } from "./AddClientModal";
import { AddOfficeModal } from "./AddOfficeModal";

const EQUIPMENT_SUPPLIERS = ["GEOLOG", "SiteTech", "GeoEquip"];
const EQUIPMENT_OPTIONS = ["Drillman GT10", "Drillman GT12", "Rig Pro 300"];

type ProjectDetailsFormProps = Readonly<{
  project: Project;
  onProjectUpdate: (project: Project) => void;
}>;

export function ProjectDetailsForm({ project, onProjectUpdate }: ProjectDetailsFormProps) {
  const [form, setForm] = useState<ProjectDetailsFormState>(() =>
    projectToDetailsFormState(project)
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [logConfigurations, setLogConfigurations] = useState<LogConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingClient, setSubmittingClient] = useState(false);
  const [submittingOffice, setSubmittingOffice] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isAddOfficeOpen, setIsAddOfficeOpen] = useState(false);
  const [errors, setErrors] = useState<ProjectDetailsFormErrors>({});

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
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

  const officeOptions = useMemo(
    () =>
      offices.map((office) => ({
        value: office.name,
        label: office.name,
      })),
    [offices]
  );

  const logConfigOptions = useMemo(
    () =>
      logConfigurations.map((config) => ({
        value: config.id,
        label: config.name,
      })),
    [logConfigurations]
  );

  const update = <K extends keyof ProjectDetailsFormState>(key: K, value: ProjectDetailsFormState[K]) => {
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

  const loadProjectDetails = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [projectData, clientsResult, logConfigsResult, officesResult] = await Promise.all([
        getProject(project.id),
        listClients(1, MAX_TABLE_PAGE_SIZE),
        listLogConfigurations(1, MAX_TABLE_PAGE_SIZE, { status: "active" }),
        listOffices(1, MAX_TABLE_PAGE_SIZE),
      ]);

      setClients(clientsResult.data);
      setLogConfigurations(logConfigsResult.data);
      setOffices(officesResult.data);

      const nextForm = projectToDetailsFormState(projectData);
      const settings = resolveProjectLogConfigSettings(nextForm.logConfigId, logConfigsResult.data);
      if (!settings.allowCoordinateSystemAtProject) {
        nextForm.coordinateSystem = settings.coordinateSystem;
      }

      setForm(nextForm);
      onProjectUpdate(projectData);
    } catch (err) {
      const message = getApiErrorMessage(err, API_ERROR_MESSAGES.LOAD_PROJECT_DETAILS);
      setLoadError(message);
      showApiError(err, message);
    } finally {
      setLoading(false);
    }
  }, [onProjectUpdate, project.id]);

  useEffect(() => {
    void loadProjectDetails();
  }, [loadProjectDetails]);

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
      if (officeForm.laboratory) {
        update("laboratory", officeForm.laboratory);
      }
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
    if (submitting || loading) return;

    const nextErrors = validateProjectDetailsForm(form, [], project.projectNo, {
      coordinatesRequired,
      allowDuplicateProjectNumbers: selectedLogConfigSettings.allowDuplicateProjectNumbers,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const { data, message } = await updateProject(
        project.id,
        projectDetailsFormToPayload(form)
      );

      setForm(projectToDetailsFormState(data));
      onProjectUpdate(data);
      setErrors({});
      showApiSuccess(message, API_MESSAGES.PROJECT_UPDATED);
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, API_ERROR_MESSAGES.UPDATE_PROJECT);
      const { fieldErrors } = mapProjectDetailsApiError(errorMessage);

      if (Object.keys(fieldErrors).length > 0) {
        setErrors((current) => ({ ...current, ...fieldErrors }));
      }

      showApiError(err, errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading project details…" variant="section" />;
  }

  if (loadError) {
    return (
      <div className="project-dashboard__empty-state">
        <p>Unable to load project details.</p>
        <span>{loadError}</span>
        <UiButton type="button" variant="outline" size="sm" onClick={() => void loadProjectDetails()}>
          Try again
        </UiButton>
      </div>
    );
  }

  return (
    <>
      <form className="project-details-form" onSubmit={handleSubmit} noValidate>
        <div className="project-details-form__grid">
          <FormField label="Project Number" required error={errors.projectNumber}>
            <Input
              variant="ui"
              type="text"
              value={form.projectNumber}
              onChange={(e) => update("projectNumber", e.target.value)}
            />
          </FormField>

          <FormField label="Project Name" required error={errors.projectName}>
            <Input
              variant="ui"
              type="text"
              value={form.projectName}
              onChange={(e) => update("projectName", e.target.value)}
            />
          </FormField>

          <FormField label="Location" required error={errors.location}>
            <Input
              variant="ui"
              type="text"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
            />
          </FormField>

          <FormField label="Equipment Supplier">
            <Select
              value={form.equipmentSupplier}
              onChange={(value) => update("equipmentSupplier", value)}
              options={EQUIPMENT_SUPPLIERS}
            />
          </FormField>

          <FormField label="Equipment">
            <Select
              value={form.equipment}
              onChange={(value) => update("equipment", value)}
              options={EQUIPMENT_OPTIONS}
            />
          </FormField>

          <FormField
            label="Log Configuration"
            required
            error={errors.logConfigId}
            className="project-details-form__field--wide"
          >
            <Select
              value={form.logConfigId}
              onChange={handleLogConfigChange}
              options={logConfigOptions}
              placeholder="Select log configuration"
              search
              searchPlaceholder="Search log configuration…"
            />
          </FormField>

          {canEditCoordinateSystem ? (
            <FormField label="Coordinate System" className="project-details-form__field--full">
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
            <p className="project-details-form__meta project-details-form__meta--label project-details-form__field--full">
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
              onChange={(e) => update("latitude", e.target.value)}
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
              onChange={(e) => update("longitude", e.target.value)}
            />
          </FormField>

          <p className="project-details-form__meta project-details-form__field--full">
            Timezone: {timezone}
          </p>

          {showCoordinateFields ? (
            <>
              {canEditCoordinateSystem ? (
                <p className="project-details-form__meta project-details-form__meta--label project-details-form__field--full">
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
                  onChange={(e) => update("easting", e.target.value)}
                />
              </FormField>

              <FormField label={`Northing (${coordinateUnit})`}>
                <Input
                  variant="ui"
                  type="number"
                  step="any"
                  placeholder="Northing"
                  value={form.northing}
                  onChange={(e) => update("northing", e.target.value)}
                />
              </FormField>

              <FormField label="UTM Zone" className="project-details-form__field--full">
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

          <FormField label="Client" required error={errors.client}>
            <div className="project-details-form__inline">
              <Select
                className="project-details-form__inline-control"
                value={form.client}
                onChange={(value) => update("client", value)}
                options={clientOptions}
                placeholder="Select client"
                search
                searchPlaceholder="Search clients…"
              />
              <UiButton type="button" variant="link" onClick={() => setIsAddClientOpen(true)}>
                Add Client
              </UiButton>
            </div>
          </FormField>

          <FormField label="Office">
            <div className="project-details-form__inline">
              <Select
                className="project-details-form__inline-control"
                value={form.office}
                onChange={(value) => update("office", value)}
                options={officeOptions}
                placeholder="Select Office"
                search
                searchPlaceholder="Search offices…"
              />
              <UiButton type="button" variant="link" onClick={() => setIsAddOfficeOpen(true)}>
                Add Office
              </UiButton>
            </div>
          </FormField>

          {/* <FormField label="Service Area">
            <Select
              value={form.serviceArea}
              onChange={(value) => update("serviceArea", value)}
              options={SERVICE_AREAS}
              placeholder="Select Service Area"
            />
          </FormField>

          <FormField label="Laboratory" className="project-details-form__field--full">
            <Select
              value={form.laboratory}
              onChange={(value) => update("laboratory", value)}
              options={LABORATORIES}
              placeholder="Search laboratory here"
              search
              searchPlaceholder="Search laboratory here"
            />
          </FormField> */}
        </div>

        <div className="project-details-form__footer">
          <UiButton type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </UiButton>
        </div>
      </form>

      <AddClientModal
        open={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        clients={clients}
        submitting={submittingClient}
        onSubmit={handleAddClient}
      />

      <AddOfficeModal
        open={isAddOfficeOpen}
        onClose={() => setIsAddOfficeOpen(false)}
        submitting={submittingOffice}
        onSubmit={handleAddOffice}
      />
    </>
  );
}
