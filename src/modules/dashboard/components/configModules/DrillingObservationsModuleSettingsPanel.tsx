"use client";

import { useId, useMemo, useState } from "react";
import { FormField, Input, Select, UiButton } from "@/shared/components/ui";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import {
  DRILLING_OBSERVATIONS_MODULE_ID,
  MODULE_DATA_TYPES,
  MODULE_DISPLAY_NAME_MAX_LENGTH,
  createDefaultDrillingObservationsConfig,
  getModuleDataTypeOptions,
  parseDrillingCasingOptions,
  parseDrillingObservationOptions,
  parseDrillingResistanceOptions,
  parseDrillingTypeOptions,
  toDrillingCasingModuleNamedOption,
  toDrillingObservationModuleNamedOption,
  toDrillingResistanceModuleNamedOption,
  toDrillingTypeModuleNamedOption,
  type DrillingCasingOption,
  type DrillingObservationOption,
  type DrillingObservationsModuleConfig,
  type DrillingResistanceOption,
  type DrillingTypeOption,
  type ModuleNamedOption,
  type StoredModuleSettings,
} from "../../utils/configModules";
import {
  ManageModuleDataTypeModal,
  type ModuleDataTypeMeta,
} from "../ManageModuleDataTypeModal";
import { ManageDrillingCasingsModal } from "./ManageDrillingCasingsModal";
import { ManageDrillingObservationsModal } from "./ManageDrillingObservationsModal";
import { ManageDrillingResistanceTypesModal } from "./ManageDrillingResistanceTypesModal";
import { ManageDrillingTypesModal } from "./ManageDrillingTypesModal";
import { useUserDrillingTypes } from "../../hooks/useUserDrillingTypes";
import { useUserDrillingResistances } from "../../hooks/useUserDrillingResistances";
import { useUserDrillingObservations } from "../../hooks/useUserDrillingObservations";
import { useUserDrillingCasings } from "../../hooks/useUserDrillingCasings";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

const DRILLING_TYPES_DATA_TYPE_ID = "drilling-types";
const DRILLING_RESISTANCES_DATA_TYPE_ID = "drilling-resistances";
const DRILLING_OBSERVATIONS_DATA_TYPE_ID = "drilling-observations";
const DRILLING_CASINGS_DATA_TYPE_ID = "drilling-casings";

type DrillingObservationsModuleSettingsPanelProps = Readonly<{
  logConfigurationId: string;
  settings: StoredModuleSettings;
  disabled?: boolean;
  /** Optional company-wide drilling types for the "Select Existing" copy control. */
  companyDrillingTypes?: DrillingTypeOption[];
  /** Optional company-wide drilling resistances for the "Select Existing" copy control. */
  companyDrillingResistances?: DrillingResistanceOption[];
  /** Optional company-wide drilling observations for the "Select Existing" copy control. */
  companyDrillingObservations?: DrillingObservationOption[];
  /** Optional company-wide drilling casings for the "Select Existing" copy control. */
  companyDrillingCasings?: DrillingCasingOption[];
  onChange: (patch: Partial<StoredModuleSettings>) => void;
  onRemove: () => void;
}>;

type ManagingTarget =
  | { kind: "drilling-types" }
  | { kind: "drilling-resistances" }
  | { kind: "drilling-observations" }
  | { kind: "drilling-casings" }
  | { kind: "data-type"; dataTypeId: string; meta: ModuleDataTypeMeta };

function getDrillingConfig(settings: StoredModuleSettings): DrillingObservationsModuleConfig {
  return settings.drillingObservations ?? createDefaultDrillingObservationsConfig();
}

function dataTypeMeta(name: string): ModuleDataTypeMeta {
  const singular = name.replace(/s$/i, "") || name;
  return {
    manageTitle: `Manage ${name}`,
    manageDescription: `Manage your existing ${name.toLowerCase()} by selecting from the left menu.`,
    sidebarLabel: name,
    nameLabel: `${singular} Name`,
    deleteLabel: `Delete ${singular}`,
    addPanelTitle: `Add New ${singular}`,
    editPanelTitle: "Edit",
  };
}

export function DrillingObservationsModuleSettingsPanel({
  logConfigurationId,
  settings,
  disabled,
  companyDrillingTypes = [],
  companyDrillingResistances = [],
  companyDrillingObservations = [],
  companyDrillingCasings = [],
  onChange,
  onRemove,
}: DrillingObservationsModuleSettingsPanelProps) {
  const formId = useId();
  const drilling = getDrillingConfig(settings);
  const dataTypes = MODULE_DATA_TYPES[DRILLING_OBSERVATIONS_MODULE_ID] ?? [];
  const [managing, setManaging] = useState<ManagingTarget | null>(null);

  const drillingTypesApi = useUserDrillingTypes(DRILLING_OBSERVATIONS_MODULE_ID, {
    enabled: managing?.kind === "drilling-types",
    logConfigurationId,
  });
  const drillingResistancesApi = useUserDrillingResistances(DRILLING_OBSERVATIONS_MODULE_ID, {
    enabled: managing?.kind === "drilling-resistances",
    logConfigurationId,
  });
  const drillingObservationsApi = useUserDrillingObservations(DRILLING_OBSERVATIONS_MODULE_ID, {
    enabled: managing?.kind === "drilling-observations",
    logConfigurationId,
  });
  const drillingCasingsApi = useUserDrillingCasings(DRILLING_OBSERVATIONS_MODULE_ID, {
    enabled: managing?.kind === "drilling-casings",
    logConfigurationId,
  });

  const updateDrilling = (patch: Partial<DrillingObservationsModuleConfig>) => {
    onChange({
      drillingObservations: {
        ...drilling,
        ...patch,
      },
    });
  };

  const settingsDrillingTypes = useMemo(
    () => parseDrillingTypeOptions(getModuleDataTypeOptions(settings, DRILLING_TYPES_DATA_TYPE_ID)),
    [settings]
  );

  const settingsResistances = useMemo(
    () =>
      parseDrillingResistanceOptions(
        getModuleDataTypeOptions(settings, DRILLING_RESISTANCES_DATA_TYPE_ID)
      ),
    [settings]
  );

  const settingsObservations = useMemo(
    () =>
      parseDrillingObservationOptions(
        getModuleDataTypeOptions(settings, DRILLING_OBSERVATIONS_DATA_TYPE_ID)
      ),
    [settings]
  );

  const settingsCasings = useMemo(
    () =>
      parseDrillingCasingOptions(getModuleDataTypeOptions(settings, DRILLING_CASINGS_DATA_TYPE_ID)),
    [settings]
  );

  /** Prefer dedicated collection data over module-settings JSON when managing. */
  const drillingTypeOptions: DrillingTypeOption[] =
    managing?.kind === "drilling-types"
      ? drillingTypesApi.loading && drillingTypesApi.items.length === 0
        ? settingsDrillingTypes
        : drillingTypesApi.items
      : settingsDrillingTypes;

  const resistanceOptions: DrillingResistanceOption[] =
    managing?.kind === "drilling-resistances"
      ? drillingResistancesApi.loading && drillingResistancesApi.items.length === 0
        ? settingsResistances
        : drillingResistancesApi.items
      : settingsResistances;

  const observationOptions: DrillingObservationOption[] =
    managing?.kind === "drilling-observations"
      ? drillingObservationsApi.loading && drillingObservationsApi.items.length === 0
        ? settingsObservations
        : drillingObservationsApi.items
      : settingsObservations;

  const casingOptions: DrillingCasingOption[] =
    managing?.kind === "drilling-casings"
      ? drillingCasingsApi.loading && drillingCasingsApi.items.length === 0
        ? settingsCasings
        : drillingCasingsApi.items
      : settingsCasings;

  const managingOptions: ModuleNamedOption[] =
    managing?.kind === "data-type"
      ? getModuleDataTypeOptions(settings, managing.dataTypeId)
      : [];

  const handleSaveOptions = (options: ModuleNamedOption[]) => {
    if (managing?.kind !== "data-type") return;
    onChange({
      dataTypeOptions: {
        ...settings.dataTypeOptions,
        [managing.dataTypeId]: options.map((entry) => ({ ...entry })),
      },
    });
    setManaging(null);
  };

  const handleSaveDrillingTypes = async (options: DrillingTypeOption[]) => {
    try {
      const saved = await drillingTypesApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [DRILLING_TYPES_DATA_TYPE_ID]: saved.map((entry) =>
            toDrillingTypeModuleNamedOption(entry)
          ),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveResistances = async (nextOptions: DrillingResistanceOption[]) => {
    try {
      const saved = await drillingResistancesApi.save(nextOptions);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [DRILLING_RESISTANCES_DATA_TYPE_ID]: saved.map((entry) =>
            toDrillingResistanceModuleNamedOption(entry)
          ),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveObservations = async (options: DrillingObservationOption[]) => {
    try {
      const saved = await drillingObservationsApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [DRILLING_OBSERVATIONS_DATA_TYPE_ID]: saved.map((entry) =>
            toDrillingObservationModuleNamedOption(entry)
          ),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveCasings = async (options: DrillingCasingOption[]) => {
    try {
      const saved = await drillingCasingsApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [DRILLING_CASINGS_DATA_TYPE_ID]: saved.map((entry) =>
            toDrillingCasingModuleNamedOption(entry)
          ),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  return (
    <>
      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header log-config-detail__panel-header--row">
          <div>
            <h3 className="log-config-detail__section-title">Edit Drilling Observations</h3>
            {/* <p className="log-config-detail__section-description">
              Configure Drilling Observations for this log configuration. Drilling types,
              resistances, observations, and casing types are stored separately and apply only to
              this configuration.
            </p> */}
          </div>
          <UiButton
            type="button"
            variant="danger"
            size="sm"
            disabled={disabled}
            onClick={onRemove}
          >
            Delete
          </UiButton>
        </div>

        <div className="log-config-modules-editor__fields">
          <FormField label="Module Name" htmlFor={`${formId}-name`}>
            <Input
              id={`${formId}-name`}
              variant="ui"
              value={settings.moduleName}
              disabled={disabled}
              maxLength={MODULE_DISPLAY_NAME_MAX_LENGTH}
              onChange={(event) => onChange({ moduleName: event.target.value })}
            />
          </FormField>

          <div className="log-config-modules-editor__fields-row">
            <FormField label="Module Status" htmlFor={`${formId}-status`}>
              <Select
                id={`${formId}-status`}
                value={settings.status}
                disabled={disabled}
                options={STATUS_OPTIONS}
                onChange={(value) =>
                  onChange({ status: value === "inactive" ? "inactive" : "active" })
                }
              />
            </FormField>
          </div>
        </div>
      </section>

      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header">
          <h3 className="log-config-detail__section-title">
            Manage Drilling Observations Data Types
          </h3>
          <p className="log-config-detail__section-description">
            Set general data collection settings for your log configuration. These settings will be
            applied to a log when this configuration is applied.
          </p>
        </div>

        <div className="log-config-modules-datatypes-table-wrap">
          <table className="log-config-modules-datatypes-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col" className="log-config-modules-datatypes-table__center">
                  Allow Users to Manage in Logs
                </th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dataTypes.map((dataType) => {
                const allow = drilling.allowUsersToManage[dataType.id] ?? true;

                return (
                  <tr key={dataType.id}>
                    <td>{dataType.name}</td>
                    <td className="log-config-modules-datatypes-table__center">
                      <Select
                        id={`${formId}-allow-${dataType.id}`}
                        value={allow ? "yes" : "no"}
                        disabled={disabled}
                        options={YES_NO_OPTIONS}
                        onChange={(value) =>
                          updateDrilling({
                            allowUsersToManage: {
                              ...drilling.allowUsersToManage,
                              [dataType.id]: value === "yes",
                            },
                          })
                        }
                      />
                    </td>
                    <td>
                      {dataType.editable ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={disabled}
                          onClick={() => {
                            if (dataType.id === DRILLING_TYPES_DATA_TYPE_ID) {
                              setManaging({ kind: "drilling-types" });
                              return;
                            }
                            if (dataType.id === DRILLING_RESISTANCES_DATA_TYPE_ID) {
                              setManaging({ kind: "drilling-resistances" });
                              return;
                            }
                            if (dataType.id === DRILLING_OBSERVATIONS_DATA_TYPE_ID) {
                              setManaging({ kind: "drilling-observations" });
                              return;
                            }
                            if (dataType.id === DRILLING_CASINGS_DATA_TYPE_ID) {
                              setManaging({ kind: "drilling-casings" });
                              return;
                            }
                            setManaging({
                              kind: "data-type",
                              dataTypeId: dataType.id,
                              meta: dataTypeMeta(dataType.name),
                            });
                          }}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ManageDrillingTypesModal
        open={managing?.kind === "drilling-types"}
        options={drillingTypeOptions}
        companyOptions={companyDrillingTypes}
        onClose={() => setManaging(null)}
        onSave={handleSaveDrillingTypes}
      />

      <ManageDrillingResistanceTypesModal
        open={managing?.kind === "drilling-resistances"}
        options={resistanceOptions}
        companyOptions={companyDrillingResistances}
        onClose={() => setManaging(null)}
        onSave={handleSaveResistances}
      />

      <ManageDrillingObservationsModal
        open={managing?.kind === "drilling-observations"}
        options={observationOptions}
        companyOptions={companyDrillingObservations}
        onClose={() => setManaging(null)}
        onSave={handleSaveObservations}
      />

      <ManageDrillingCasingsModal
        open={managing?.kind === "drilling-casings"}
        options={casingOptions}
        companyOptions={companyDrillingCasings}
        onClose={() => setManaging(null)}
        onSave={handleSaveCasings}
      />

      <ManageModuleDataTypeModal
        open={managing?.kind === "data-type"}
        meta={managing?.kind === "data-type" ? managing.meta : null}
        options={managingOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveOptions}
      />
    </>
  );
}
