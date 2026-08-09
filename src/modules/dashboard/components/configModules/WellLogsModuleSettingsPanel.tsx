"use client";

import { useId, useMemo, useState } from "react";
import { FormField, Input, Select, Toggle, UiButton } from "@/shared/components/ui";
import {
  MODULE_DATA_TYPES,
  MODULE_DISPLAY_NAME_MAX_LENGTH,
  WELL_BACKFILL_TYPES_DATA_TYPE_ID,
  WELL_CASING_TOPS_DATA_TYPE_ID,
  WELL_CASING_TYPES_DATA_TYPE_ID,
  WELL_COVER_TYPES_DATA_TYPE_ID,
  WELL_LOGS_MODULE_ID,
  WELL_PROBE_TYPES_DATA_TYPE_ID,
  WELL_TYPES_DATA_TYPE_ID,
  createDefaultWellLogsConfig,
  getModuleDataTypeOptions,
  parseWellBackfillTypeOptions,
  parseWellCasingTopTypeOptions,
  parseWellCasingTypeOptions,
  parseWellCoverTypeOptions,
  parseWellProbeTypeOptions,
  parseWellTypeOptions,
  toWellBackfillTypeModuleNamedOption,
  toWellCasingTopTypeModuleNamedOption,
  toWellCasingTypeModuleNamedOption,
  toWellCoverTypeModuleNamedOption,
  toWellProbeTypeModuleNamedOption,
  toWellTypeModuleNamedOption,
  type ModuleNamedOption,
  type StoredModuleSettings,
  type WellBackfillTypeOption,
  type WellCasingTopTypeOption,
  type WellCasingTypeOption,
  type WellCoverTypeOption,
  type WellLogsModuleConfig,
  type WellProbeTypeOption,
  type WellTypeOption,
} from "../../utils/configModules";
import {
  ManageModuleDataTypeModal,
  type ModuleDataTypeMeta,
} from "../ManageModuleDataTypeModal";
import { ManageWellBackfillTypesModal } from "./ManageWellBackfillTypesModal";
import { ManageWellCasingTopTypesModal } from "./ManageWellCasingTopTypesModal";
import { ManageWellCasingTypesModal } from "./ManageWellCasingTypesModal";
import { ManageWellCoverTypesModal } from "./ManageWellCoverTypesModal";
import { ManageWellProbeTypesModal } from "./ManageWellProbeTypesModal";
import { ManageWellTypesModal } from "./ManageWellTypesModal";
import { useUserWellTypes } from "../../hooks/useUserWellTypes";
import { useUserWellCasingTypes } from "../../hooks/useUserWellCasingTypes";
import { useUserWellCasingTops } from "../../hooks/useUserWellCasingTops";
import { useUserWellCoverTypes } from "../../hooks/useUserWellCoverTypes";
import { useUserWellProbeTypes } from "../../hooks/useUserWellProbeTypes";
import { useUserWellBackfillTypes } from "../../hooks/useUserWellBackfillTypes";
import { useUserWellDefaultWellIds } from "../../hooks/useUserWellDefaultWellIds";
import { showApiError } from "@/shared/utils/apiToast";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

const DEFAULT_WELL_ID_META: ModuleDataTypeMeta = {
  manageTitle: "Manage Default Well IDs",
  manageDescription: "Manage default well ID options available when logging wells.",
  sidebarLabel: "Default Well IDs",
  nameLabel: "Well ID",
  deleteLabel: "Delete Well ID",
  addPanelTitle: "Add New Well ID",
  editPanelTitle: "Edit",
};

type WellLogsModuleSettingsPanelProps = Readonly<{
  logConfigurationId: string;
  settings: StoredModuleSettings;
  disabled?: boolean;
  companyWellTypes?: WellTypeOption[];
  companyWellCasingTypes?: WellCasingTypeOption[];
  companyWellCasingTopTypes?: WellCasingTopTypeOption[];
  companyWellCoverTypes?: WellCoverTypeOption[];
  companyWellProbeTypes?: WellProbeTypeOption[];
  companyWellBackfillTypes?: WellBackfillTypeOption[];
  onChange: (patch: Partial<StoredModuleSettings>) => void;
  onRemove: () => void;
}>;

type ManagingTarget =
  | { kind: "default-well-ids" }
  | { kind: "well-types" }
  | { kind: "well-casing-types" }
  | { kind: "well-casing-tops" }
  | { kind: "well-cover-types" }
  | { kind: "well-probe-types" }
  | { kind: "well-backfill-types" };

function getWellLogsConfig(settings: StoredModuleSettings): WellLogsModuleConfig {
  return settings.wellLogs ?? createDefaultWellLogsConfig();
}

export function WellLogsModuleSettingsPanel({
  logConfigurationId,
  settings,
  disabled,
  companyWellTypes = [],
  companyWellCasingTypes = [],
  companyWellCasingTopTypes = [],
  companyWellCoverTypes = [],
  companyWellProbeTypes = [],
  companyWellBackfillTypes = [],
  onChange,
  onRemove,
}: WellLogsModuleSettingsPanelProps) {
  const formId = useId();
  const wellLogs = getWellLogsConfig(settings);
  const dataTypes = MODULE_DATA_TYPES[WELL_LOGS_MODULE_ID] ?? [];
  const [managing, setManaging] = useState<ManagingTarget | null>(null);

  const wellTypesApi = useUserWellTypes(WELL_LOGS_MODULE_ID, {
    enabled: managing?.kind === "well-types",
    logConfigurationId,
  });
  const wellCasingTypesApi = useUserWellCasingTypes(WELL_LOGS_MODULE_ID, {
    enabled: managing?.kind === "well-casing-types",
    logConfigurationId,
  });
  const wellCasingTopsApi = useUserWellCasingTops(WELL_LOGS_MODULE_ID, {
    enabled: managing?.kind === "well-casing-tops",
    logConfigurationId,
  });
  const wellCoverTypesApi = useUserWellCoverTypes(WELL_LOGS_MODULE_ID, {
    enabled: managing?.kind === "well-cover-types",
    logConfigurationId,
  });
  const wellProbeTypesApi = useUserWellProbeTypes(WELL_LOGS_MODULE_ID, {
    enabled: managing?.kind === "well-probe-types",
    logConfigurationId,
  });
  const wellBackfillTypesApi = useUserWellBackfillTypes(WELL_LOGS_MODULE_ID, {
    enabled: managing?.kind === "well-backfill-types",
    logConfigurationId,
  });
  const defaultWellIdsApi = useUserWellDefaultWellIds(WELL_LOGS_MODULE_ID, {
    enabled: managing?.kind === "default-well-ids",
    logConfigurationId,
  });

  const updateWellLogs = (patch: Partial<WellLogsModuleConfig>) => {
    onChange({
      wellLogs: {
        ...wellLogs,
        ...patch,
      },
    });
  };

  const settingsWellTypes = useMemo(
    () => parseWellTypeOptions(getModuleDataTypeOptions(settings, WELL_TYPES_DATA_TYPE_ID)),
    [settings]
  );
  const settingsWellCasingTypes = useMemo(
    () =>
      parseWellCasingTypeOptions(
        getModuleDataTypeOptions(settings, WELL_CASING_TYPES_DATA_TYPE_ID)
      ),
    [settings]
  );
  const settingsWellCasingTops = useMemo(
    () =>
      parseWellCasingTopTypeOptions(
        getModuleDataTypeOptions(settings, WELL_CASING_TOPS_DATA_TYPE_ID)
      ),
    [settings]
  );
  const settingsWellCoverTypes = useMemo(
    () =>
      parseWellCoverTypeOptions(
        getModuleDataTypeOptions(settings, WELL_COVER_TYPES_DATA_TYPE_ID)
      ),
    [settings]
  );
  const settingsWellProbeTypes = useMemo(
    () =>
      parseWellProbeTypeOptions(
        getModuleDataTypeOptions(settings, WELL_PROBE_TYPES_DATA_TYPE_ID)
      ),
    [settings]
  );
  const settingsWellBackfillTypes = useMemo(
    () =>
      parseWellBackfillTypeOptions(
        getModuleDataTypeOptions(settings, WELL_BACKFILL_TYPES_DATA_TYPE_ID)
      ),
    [settings]
  );

  const wellTypeOptions =
    managing?.kind === "well-types" && wellTypesApi.items.length > 0
      ? wellTypesApi.items
      : settingsWellTypes;
  const wellCasingTypeOptions =
    managing?.kind === "well-casing-types" && wellCasingTypesApi.items.length > 0
      ? wellCasingTypesApi.items
      : settingsWellCasingTypes;
  const wellCasingTopTypeOptions =
    managing?.kind === "well-casing-tops" && wellCasingTopsApi.items.length > 0
      ? wellCasingTopsApi.items
      : settingsWellCasingTops;
  const wellCoverTypeOptions =
    managing?.kind === "well-cover-types" && wellCoverTypesApi.items.length > 0
      ? wellCoverTypesApi.items
      : settingsWellCoverTypes;
  const wellProbeTypeOptions =
    managing?.kind === "well-probe-types" && wellProbeTypesApi.items.length > 0
      ? wellProbeTypesApi.items
      : settingsWellProbeTypes;
  const wellBackfillTypeOptions =
    managing?.kind === "well-backfill-types" && wellBackfillTypesApi.items.length > 0
      ? wellBackfillTypesApi.items
      : settingsWellBackfillTypes;

  const managingDefaultWellIds: ModuleNamedOption[] =
    managing?.kind === "default-well-ids" && defaultWellIdsApi.items.length > 0
      ? defaultWellIdsApi.items
      : wellLogs.defaultWellIds.map((entry) => ({ ...entry }));

  const handleSaveDefaultWellIds = async (options: ModuleNamedOption[]) => {
    try {
      const saved = await defaultWellIdsApi.save(options);
      const named = saved.map((entry) => ({ id: entry.id, name: entry.name }));
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          "default-well-ids": named,
        },
        wellLogs: {
          ...wellLogs,
          defaultWellIds: named,
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveWellTypes = async (options: WellTypeOption[]) => {
    try {
      const saved = await wellTypesApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [WELL_TYPES_DATA_TYPE_ID]: saved.map((entry) => toWellTypeModuleNamedOption(entry)),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveWellCasingTypes = async (options: WellCasingTypeOption[]) => {
    try {
      const saved = await wellCasingTypesApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [WELL_CASING_TYPES_DATA_TYPE_ID]: saved.map((entry) =>
            toWellCasingTypeModuleNamedOption(entry)
          ),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveWellCasingTopTypes = async (options: WellCasingTopTypeOption[]) => {
    try {
      const saved = await wellCasingTopsApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [WELL_CASING_TOPS_DATA_TYPE_ID]: saved.map((entry) =>
            toWellCasingTopTypeModuleNamedOption(entry)
          ),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveWellCoverTypes = async (options: WellCoverTypeOption[]) => {
    try {
      const saved = await wellCoverTypesApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [WELL_COVER_TYPES_DATA_TYPE_ID]: saved.map((entry) =>
            toWellCoverTypeModuleNamedOption(entry)
          ),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveWellProbeTypes = async (options: WellProbeTypeOption[]) => {
    try {
      const saved = await wellProbeTypesApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [WELL_PROBE_TYPES_DATA_TYPE_ID]: saved.map((entry) =>
            toWellProbeTypeModuleNamedOption(entry)
          ),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveWellBackfillTypes = async (options: WellBackfillTypeOption[]) => {
    try {
      const saved = await wellBackfillTypesApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [WELL_BACKFILL_TYPES_DATA_TYPE_ID]: saved.map((entry) =>
            toWellBackfillTypeModuleNamedOption(entry)
          ),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const openManageForDataType = (dataTypeId: string) => {
    if (dataTypeId === WELL_TYPES_DATA_TYPE_ID) {
      setManaging({ kind: "well-types" });
      return;
    }
    if (dataTypeId === WELL_CASING_TYPES_DATA_TYPE_ID) {
      setManaging({ kind: "well-casing-types" });
      return;
    }
    if (dataTypeId === WELL_CASING_TOPS_DATA_TYPE_ID) {
      setManaging({ kind: "well-casing-tops" });
      return;
    }
    if (dataTypeId === WELL_COVER_TYPES_DATA_TYPE_ID) {
      setManaging({ kind: "well-cover-types" });
      return;
    }
    if (dataTypeId === WELL_PROBE_TYPES_DATA_TYPE_ID) {
      setManaging({ kind: "well-probe-types" });
      return;
    }
    if (dataTypeId === WELL_BACKFILL_TYPES_DATA_TYPE_ID) {
      setManaging({ kind: "well-backfill-types" });
    }
  };

  return (
    <>
      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header log-config-detail__panel-header--row">
          <div>
            <h3 className="log-config-detail__section-title">Edit Well Logs</h3>
            {/* <p className="log-config-detail__section-description">
              Well type catalogs are stored per log configuration and seeded from common defaults
              when this module is added.
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

          <div className="log-config-modules-editor__toggle-row log-config-modules-editor__toggle-row--start">
            <Toggle
              id={`${formId}-default-well-id`}
              checked={wellLogs.setDefaultWellId}
              disabled={disabled}
              onChange={(checked) => updateWellLogs({ setDefaultWellId: checked })}
            />
            <label
              className="log-config-modules-editor__toggle-label"
              htmlFor={`${formId}-default-well-id`}
            >
              Set Default Well ID
            </label>
            <UiButton
              type="button"
              variant="primary"
              size="sm"
              disabled={disabled || !wellLogs.setDefaultWellId}
              onClick={() => setManaging({ kind: "default-well-ids" })}
            >
              Manage
            </UiButton>
          </div>
        </div>
      </section>

      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header">
          <h3 className="log-config-detail__section-title">Manage Well Logs Data Types</h3>
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
                const allow = wellLogs.allowUsersToManage[dataType.id] ?? true;

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
                          updateWellLogs({
                            allowUsersToManage: {
                              ...wellLogs.allowUsersToManage,
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
                          onClick={() => openManageForDataType(dataType.id)}
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

      <ManageModuleDataTypeModal
        open={managing?.kind === "default-well-ids"}
        meta={managing?.kind === "default-well-ids" ? DEFAULT_WELL_ID_META : null}
        options={managingDefaultWellIds}
        onClose={() => setManaging(null)}
        onSave={handleSaveDefaultWellIds}
      />

      <ManageWellTypesModal
        open={managing?.kind === "well-types"}
        options={wellTypeOptions}
        companyOptions={companyWellTypes}
        onClose={() => setManaging(null)}
        onSave={handleSaveWellTypes}
      />

      <ManageWellCasingTypesModal
        open={managing?.kind === "well-casing-types"}
        options={wellCasingTypeOptions}
        companyOptions={companyWellCasingTypes}
        onClose={() => setManaging(null)}
        onSave={handleSaveWellCasingTypes}
      />

      <ManageWellCasingTopTypesModal
        open={managing?.kind === "well-casing-tops"}
        options={wellCasingTopTypeOptions}
        companyOptions={companyWellCasingTopTypes}
        onClose={() => setManaging(null)}
        onSave={handleSaveWellCasingTopTypes}
      />

      <ManageWellCoverTypesModal
        open={managing?.kind === "well-cover-types"}
        options={wellCoverTypeOptions}
        companyOptions={companyWellCoverTypes}
        onClose={() => setManaging(null)}
        onSave={handleSaveWellCoverTypes}
      />

      <ManageWellProbeTypesModal
        open={managing?.kind === "well-probe-types"}
        options={wellProbeTypeOptions}
        companyOptions={companyWellProbeTypes}
        onClose={() => setManaging(null)}
        onSave={handleSaveWellProbeTypes}
      />

      <ManageWellBackfillTypesModal
        open={managing?.kind === "well-backfill-types"}
        options={wellBackfillTypeOptions}
        companyOptions={companyWellBackfillTypes}
        onClose={() => setManaging(null)}
        onSave={handleSaveWellBackfillTypes}
      />
    </>
  );
}
