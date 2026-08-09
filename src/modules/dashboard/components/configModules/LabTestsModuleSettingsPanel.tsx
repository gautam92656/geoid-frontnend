"use client";

import { useId, useMemo, useState } from "react";
import { FormField, Input, Select, UiButton } from "@/shared/components/ui";
import {
  DEFAULT_DATA_TYPE_OPTIONS,
  LAB_TESTS_MODULE_ID,
  LAB_TEST_TYPES_DATA_TYPE_ID,
  LAB_TEST_PRESETS_DATA_TYPE_ID,
  MODULE_DATA_TYPES,
  MODULE_DISPLAY_NAME_MAX_LENGTH,
  createDefaultLabTestsConfig,
  getModuleDataTypeOptions,
  parseLabTestPresetOptions,
  parseLabTestTypeOptions,
  toLabTestPresetModuleNamedOption,
  toLabTestTypeModuleNamedOption,
  type LabTestPresetOption,
  type LabTestTypeOption,
  type LabTestsModuleConfig,
  type StoredModuleSettings,
} from "../../utils/configModules";
import { ManageLabTestPresetsModal } from "./ManageLabTestPresetsModal";
import { ManageLabTestTypesModal } from "./ManageLabTestTypesModal";
import { useUserLabTestTypes } from "../../hooks/useUserLabTestTypes";
import { useUserLabTestPresets } from "../../hooks/useUserLabTestPresets";
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

type LabTestsModuleSettingsPanelProps = Readonly<{
  logConfigurationId: string;
  settings: StoredModuleSettings;
  disabled?: boolean;
  companyLabTestTypes?: LabTestTypeOption[];
  onChange: (patch: Partial<StoredModuleSettings>) => void;
  onRemove: () => void;
}>;

type ManagingKind = "lab-test-types" | "lab-test-presets" | null;

function getLabTestsConfig(settings: StoredModuleSettings): LabTestsModuleConfig {
  return settings.labTests ?? createDefaultLabTestsConfig();
}

export function LabTestsModuleSettingsPanel({
  logConfigurationId,
  settings,
  disabled,
  companyLabTestTypes = [],
  onChange,
  onRemove,
}: LabTestsModuleSettingsPanelProps) {
  const formId = useId();
  const labTests = getLabTestsConfig(settings);
  const dataTypes = MODULE_DATA_TYPES[LAB_TESTS_MODULE_ID] ?? [];
  const [managing, setManaging] = useState<ManagingKind>(null);

  const labTestTypesApi = useUserLabTestTypes(LAB_TESTS_MODULE_ID, {
    enabled: managing === "lab-test-types",
    logConfigurationId,
  });
  const labTestPresetsApi = useUserLabTestPresets(LAB_TESTS_MODULE_ID, {
    enabled: managing === "lab-test-presets",
    logConfigurationId,
  });

  const updateLabTests = (patch: Partial<LabTestsModuleConfig>) => {
    onChange({
      labTests: {
        ...labTests,
        ...patch,
      },
    });
  };

  const settingsLabTestTypes = useMemo(
    () => parseLabTestTypeOptions(getModuleDataTypeOptions(settings, LAB_TEST_TYPES_DATA_TYPE_ID)),
    [settings]
  );

  const settingsLabTestPresets = useMemo(
    () =>
      parseLabTestPresetOptions(getModuleDataTypeOptions(settings, LAB_TEST_PRESETS_DATA_TYPE_ID)),
    [settings]
  );

  const labTestTypeOptions =
    managing === "lab-test-types" && labTestTypesApi.items.length > 0
      ? labTestTypesApi.items
      : settingsLabTestTypes;

  const labTestPresetOptions =
    managing === "lab-test-presets" && labTestPresetsApi.items.length > 0
      ? labTestPresetsApi.items
      : settingsLabTestPresets;

  const resolvedCompanyLabTestTypes = useMemo(() => {
    if (companyLabTestTypes.length > 0) {
      return parseLabTestTypeOptions(companyLabTestTypes);
    }
    return parseLabTestTypeOptions(DEFAULT_DATA_TYPE_OPTIONS[LAB_TEST_TYPES_DATA_TYPE_ID] ?? []);
  }, [companyLabTestTypes]);

  const handleSaveLabTestTypes = async (nextOptions: LabTestTypeOption[]) => {
    try {
      const saved = await labTestTypesApi.save(nextOptions);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [LAB_TEST_TYPES_DATA_TYPE_ID]: saved.map((entry) =>
            toLabTestTypeModuleNamedOption(entry)
          ),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSavePresets = async (nextOptions: LabTestPresetOption[]) => {
    try {
      const saved = await labTestPresetsApi.save(nextOptions);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [LAB_TEST_PRESETS_DATA_TYPE_ID]: saved.map((entry) =>
            toLabTestPresetModuleNamedOption(entry)
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
            <h3 className="log-config-detail__section-title">Edit Lab Tests</h3>
            {/* <p className="log-config-detail__section-description">
              Lab test type and preset catalogs are stored per log configuration and seeded from
              common defaults when this module is added.
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
          <h3 className="log-config-detail__section-title">Manage Lab Tests Data Types</h3>
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
                const allow = labTests.allowUsersToManage[dataType.id] ?? true;
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
                          updateLabTests({
                            allowUsersToManage: {
                              ...labTests.allowUsersToManage,
                              [dataType.id]: value === "yes",
                            },
                          })
                        }
                      />
                    </td>
                    <td>
                      <UiButton
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={disabled || !dataType.editable}
                        onClick={() => {
                          if (dataType.id === LAB_TEST_TYPES_DATA_TYPE_ID) {
                            setManaging("lab-test-types");
                            return;
                          }
                          if (dataType.id === LAB_TEST_PRESETS_DATA_TYPE_ID) {
                            setManaging("lab-test-presets");
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

      <ManageLabTestTypesModal
        open={managing === "lab-test-types"}
        options={labTestTypeOptions}
        companyOptions={resolvedCompanyLabTestTypes}
        onClose={() => setManaging(null)}
        onSave={handleSaveLabTestTypes}
      />

      <ManageLabTestPresetsModal
        open={managing === "lab-test-presets"}
        options={labTestPresetOptions}
        labTestTypeOptions={labTestTypeOptions}
        onClose={() => setManaging(null)}
        onSave={handleSavePresets}
      />
    </>
  );
}
