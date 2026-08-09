"use client";

import { useId, useMemo, useState } from "react";
import { FormField, Input, Select, UiButton } from "@/shared/components/ui";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import {
  DEFAULT_DATA_TYPE_OPTIONS,
  INSITU_TESTS_USA_MODULE_ID,
  MODULE_DATA_TYPES,
  MODULE_DISPLAY_NAME_MAX_LENGTH,
  createDefaultInsituTestsConfig,
  getModuleDataTypeOptions,
  parseInsituTestTypeOptions,
  toInsituTestTypeModuleNamedOption,
  type InsituTestsModuleConfig,
  type InsituTestTypeOption,
  type ModuleNamedOption,
  type StoredModuleSettings,
} from "../../utils/configModules";
import {
  ManageModuleDataTypeModal,
  type ModuleDataTypeMeta,
} from "../ManageModuleDataTypeModal";
import { ManageInsituTestTypesModal } from "./ManageInsituTestTypesModal";
import { useUserInsituTestTypes } from "../../hooks/useUserInsituTestTypes";
import { useUserInsituUnitSettings } from "../../hooks/useUserInsituUnitSettings";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

type InsituTestsModuleSettingsPanelProps = Readonly<{
  logConfigurationId: string;
  settings: StoredModuleSettings;
  disabled?: boolean;
  /** Optional company-wide testing types for the "Select Existing" copy control. */
  companyTestingTypes?: InsituTestTypeOption[];
  /** Sample types available for the default sample type dropdown. */
  sampleTypeOptions?: ReadonlyArray<{ id: string; name: string }>;
  onChange: (patch: Partial<StoredModuleSettings>) => void;
  onRemove: () => void;
}>;

type ManagingTarget =
  | { kind: "testing-types" }
  | { kind: "unit-settings"; meta: ModuleDataTypeMeta };

function getInsituConfig(settings: StoredModuleSettings): InsituTestsModuleConfig {
  return settings.insitu ?? createDefaultInsituTestsConfig();
}

const UNIT_SETTINGS_META: ModuleDataTypeMeta = {
  manageTitle: "Manage Unit Settings",
  manageDescription: "Manage unit settings used when collecting Insitu Tests data.",
  sidebarLabel: "Unit Settings",
  nameLabel: "Unit Setting Name",
  deleteLabel: "Delete Unit Setting",
  addPanelTitle: "Add New Unit Setting",
  editPanelTitle: "Edit",
};

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 15a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm1-4.75h-2V7h2v5.25z" />
    </svg>
  );
}

export function InsituTestsModuleSettingsPanel({
  logConfigurationId,
  settings,
  disabled,
  companyTestingTypes = [],
  sampleTypeOptions = [],
  onChange,
  onRemove,
}: InsituTestsModuleSettingsPanelProps) {
  const formId = useId();
  const insitu = getInsituConfig(settings);
  const dataTypes = MODULE_DATA_TYPES[INSITU_TESTS_USA_MODULE_ID] ?? [];
  const [managing, setManaging] = useState<ManagingTarget | null>(null);

  const testingTypesApi = useUserInsituTestTypes(INSITU_TESTS_USA_MODULE_ID, {
    enabled: managing?.kind === "testing-types",
    logConfigurationId,
  });
  const unitSettingsApi = useUserInsituUnitSettings(INSITU_TESTS_USA_MODULE_ID, {
    enabled: managing?.kind === "unit-settings",
    logConfigurationId,
  });

  const updateInsitu = (patch: Partial<InsituTestsModuleConfig>) => {
    onChange({
      insitu: {
        ...insitu,
        ...patch,
      },
    });
  };

  const settingsTestingTypes = useMemo(
    () => parseInsituTestTypeOptions(getModuleDataTypeOptions(settings, "testing-types")),
    [settings]
  );

  /**
   * Prefer API collection data once it has arrived; until then keep settings
   * (or frontend defaults) so the manage modal does not seed an empty list.
   */
  const testingTypeOptions: InsituTestTypeOption[] =
    managing?.kind === "testing-types" && testingTypesApi.items.length > 0
      ? testingTypesApi.items
      : settingsTestingTypes;

  /** Catalog for "Select Existing" — prefer company props, else module defaults. */
  const resolvedCompanyTestingTypes = useMemo(() => {
    if (companyTestingTypes.length > 0) {
      return parseInsituTestTypeOptions(companyTestingTypes);
    }
    return parseInsituTestTypeOptions(DEFAULT_DATA_TYPE_OPTIONS["testing-types"] ?? []);
  }, [companyTestingTypes]);

  const resolvedSampleTypeOptions = useMemo(
    () =>
      sampleTypeOptions
        .filter((entry) => entry.id.trim() && entry.name.trim())
        .map((entry) => ({ id: entry.id.trim(), name: entry.name.trim() })),
    [sampleTypeOptions]
  );

  const unitSettingsOptions: ModuleNamedOption[] =
    managing?.kind === "unit-settings"
      ? unitSettingsApi.loading && unitSettingsApi.items.length === 0
        ? insitu.unitSettings.map((entry) => ({ ...entry }))
        : unitSettingsApi.items
      : [];

  const handleSaveUnitSettings = async (options: ModuleNamedOption[]) => {
    try {
      const saved = await unitSettingsApi.save(options);
      updateInsitu({ unitSettings: saved.map((entry) => ({ id: entry.id, name: entry.name })) });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveTestingTypes = async (options: InsituTestTypeOption[]) => {
    try {
      const saved = await testingTypesApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          "testing-types": saved.map((entry) => toInsituTestTypeModuleNamedOption(entry)),
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
            <h3 className="log-config-detail__section-title">Edit Insitu Tests</h3>
            {/* <p className="log-config-detail__section-description">
              Configure Insitu Tests for this log configuration. Testing types and unit settings are
              stored separately and apply only to this configuration.
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

          <div className="log-config-modules-editor__fields-row log-config-modules-editor__fields-row--2">
            <div className="log-config-modules-editor__field-with-hint">
              <FormField
                label="Enable Add Results to Description Automatically"
                htmlFor={`${formId}-auto-add`}
              >
                <Select
                  id={`${formId}-auto-add`}
                  value={insitu.enableAutoAddResult ? "yes" : "no"}
                  disabled={disabled}
                  options={YES_NO_OPTIONS}
                  onChange={(value) => updateInsitu({ enableAutoAddResult: value === "yes" })}
                />
              </FormField>
              <span
                className="log-config-modules-editor__info-icon"
                title="When enabled, test results are added to the description automatically."
              >
                <InfoIcon />
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header">
          <h3 className="log-config-detail__section-title">Manage Insitu Tests Data Types</h3>
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
                const isUnitSettings = dataType.id === "unit-settings";
                const isTestingTypes = dataType.id === "testing-types";
                const allow = insitu.allowUsersToManage[dataType.id] ?? true;

                return (
                  <tr key={dataType.id}>
                    <td>{dataType.name}</td>
                    <td className="log-config-modules-datatypes-table__center">
                      {!isUnitSettings ? (
                        <Select
                          id={`${formId}-allow-${dataType.id}`}
                          value={allow ? "yes" : "no"}
                          disabled={disabled}
                          options={YES_NO_OPTIONS}
                          onChange={(value) =>
                            updateInsitu({
                              allowUsersToManage: {
                                ...insitu.allowUsersToManage,
                                [dataType.id]: value === "yes",
                              },
                            })
                          }
                        />
                      ) : null}
                    </td>
                    <td>
                      <UiButton
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={disabled}
                        onClick={() => {
                          if (isTestingTypes) {
                            setManaging({ kind: "testing-types" });
                            return;
                          }
                          if (isUnitSettings) {
                            setManaging({ kind: "unit-settings", meta: UNIT_SETTINGS_META });
                          }
                        }}
                      >
                        Manage
                      </UiButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ManageInsituTestTypesModal
        open={managing?.kind === "testing-types"}
        options={testingTypeOptions}
        optionsReady={!testingTypesApi.loading}
        companyOptions={resolvedCompanyTestingTypes}
        sampleTypeOptions={resolvedSampleTypeOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveTestingTypes}
      />

      <ManageModuleDataTypeModal
        open={managing?.kind === "unit-settings"}
        meta={managing?.kind === "unit-settings" ? managing.meta : null}
        options={unitSettingsOptions}
        optionsReady={!unitSettingsApi.loading}
        onClose={() => setManaging(null)}
        onSave={handleSaveUnitSettings}
      />
    </>
  );
}
