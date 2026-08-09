"use client";

import { useId, useMemo, useState } from "react";
import { FormField, Input, Select, Toggle, UiButton } from "@/shared/components/ui";
import {
  DEFAULT_AUTO_SAMPLE_ID_FORMAT_STRING,
  MODULE_DATA_TYPES,
  MODULE_DISPLAY_NAME_MAX_LENGTH,
  SAMPLES_MODULE_ID,
  createDefaultSamplesConfig,
  getModuleDataTypeOptions,
  parseSampleTypeOptions,
  toSampleTypeModuleNamedOption,
  type SamplesModuleConfig,
  type SampleTypeOption,
  type StoredModuleSettings,
} from "../../utils/configModules";
import { ManageSampleTypesModal } from "./ManageSampleTypesModal";
import { SampleIdStringBuilderModal } from "./SampleIdStringBuilderModal";
import { useUserSampleTypes } from "../../hooks/useUserSampleTypes";
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

const SAMPLE_TYPES_DATA_TYPE_ID = "sample-types";

type SamplesModuleSettingsPanelProps = Readonly<{
  logConfigurationId: string;
  settings: StoredModuleSettings;
  disabled?: boolean;
  companySampleTypes?: SampleTypeOption[];
  insituTestTypeOptions?: ReadonlyArray<{ id: string; name: string }>;
  onChange: (patch: Partial<StoredModuleSettings>) => void;
  onRemove: () => void;
}>;

function getSamplesConfig(settings: StoredModuleSettings): SamplesModuleConfig {
  return settings.samples ?? createDefaultSamplesConfig();
}

function AllowManageSelect({
  id,
  allow,
  disabled,
  onChange,
}: Readonly<{
  id: string;
  allow: boolean;
  disabled?: boolean;
  onChange: (allow: boolean) => void;
}>) {
  return (
    <Select
      id={id}
      value={allow ? "yes" : "no"}
      disabled={disabled}
      options={YES_NO_OPTIONS}
      onChange={(value) => onChange(value === "yes")}
    />
  );
}

function ManageDataTypeButton({
  disabled,
  onClick,
}: Readonly<{
  disabled?: boolean;
  onClick: () => void;
}>) {
  return (
    <UiButton type="button" variant="primary" size="sm" disabled={disabled} onClick={onClick}>
      Manage
    </UiButton>
  );
}

export function SamplesModuleSettingsPanel({
  logConfigurationId,
  settings,
  disabled,
  companySampleTypes = [],
  insituTestTypeOptions = [],
  onChange,
  onRemove,
}: SamplesModuleSettingsPanelProps) {
  const formId = useId();
  const samples = getSamplesConfig(settings);
  const dataTypes = MODULE_DATA_TYPES[SAMPLES_MODULE_ID] ?? [];
  const sampleTypes = dataTypes.find((entry) => entry.id === "sample-types");
  const sampleIds = dataTypes.find((entry) => entry.id === "sample-ids");
  const [managingSampleTypes, setManagingSampleTypes] = useState(false);
  const [managingSampleIdFormat, setManagingSampleIdFormat] = useState(false);

  const sampleTypesApi = useUserSampleTypes(SAMPLES_MODULE_ID, {
    enabled: managingSampleTypes,
    logConfigurationId,
  });

  const updateSamples = (patch: Partial<SamplesModuleConfig>) => {
    onChange({
      samples: {
        ...samples,
        ...patch,
      },
    });
  };

  const setAllowManage = (dataTypeId: string, allow: boolean) => {
    updateSamples({
      allowUsersToManage: {
        ...samples.allowUsersToManage,
        [dataTypeId]: allow,
      },
    });
  };

  const settingsSampleTypes = useMemo(
    () => parseSampleTypeOptions(getModuleDataTypeOptions(settings, SAMPLE_TYPES_DATA_TYPE_ID)),
    [settings]
  );

  const sampleTypeOptions =
    managingSampleTypes && sampleTypesApi.items.length > 0
      ? sampleTypesApi.items
      : settingsSampleTypes;

  const handleSaveSampleTypes = async (nextOptions: SampleTypeOption[]) => {
    try {
      const saved = await sampleTypesApi.save(nextOptions);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [SAMPLE_TYPES_DATA_TYPE_ID]: saved.map((entry) =>
            toSampleTypeModuleNamedOption(entry)
          ),
        },
      });
      setManagingSampleTypes(false);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveSampleIdFormat = (formatString: string) => {
    updateSamples({
      autoSampleIdFormatString: formatString,
      autoSampleIdFormat: true,
    });
    setManagingSampleIdFormat(false);
  };

  return (
    <>
      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header log-config-detail__panel-header--row">
          <div>
            <h3 className="log-config-detail__section-title">Edit Samples</h3>
            {/* <p className="log-config-detail__section-description">
              Sample type catalogs are stored per log configuration and seeded from common defaults
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

          <div className="log-config-modules-editor__options-block">
            <h4 className="log-config-modules-editor__options-title">Sample Options</h4>
            <p className="log-config-detail__section-description">
              Choose the sample feature you want to enable when recording Samples.
            </p>

            <div className="log-config-modules-editor__toggle-row log-config-modules-editor__toggle-row--start">
              <Toggle
                id={`${formId}-unique-code`}
                checked={samples.includeUniqueSampleCode}
                disabled={disabled}
                onChange={(checked) => updateSamples({ includeUniqueSampleCode: checked })}
              />
              <label
                className="log-config-modules-editor__toggle-label"
                htmlFor={`${formId}-unique-code`}
              >
                Include Unique Sample Code
              </label>
            </div>

            <div className="log-config-modules-editor__toggle-row log-config-modules-editor__toggle-row--start">
              <Toggle
                id={`${formId}-auto-id`}
                checked={samples.autoSampleIdFormat}
                disabled={disabled}
                onChange={(checked) => {
                  updateSamples({ autoSampleIdFormat: checked });
                  if (checked) setManagingSampleIdFormat(true);
                }}
              />
              <label
                className="log-config-modules-editor__toggle-label"
                htmlFor={`${formId}-auto-id`}
              >
                Turn Auto Sample ID Format off/on
              </label>
            </div>

            <div className="log-config-modules-editor__toggle-row log-config-modules-editor__toggle-row--start">
              <Toggle
                id={`${formId}-project-id`}
                checked={samples.projectLevelSampleId}
                disabled={disabled}
                onChange={(checked) => updateSamples({ projectLevelSampleId: checked })}
              />
              <label
                className="log-config-modules-editor__toggle-label"
                htmlFor={`${formId}-project-id`}
              >
                Enable Project-Level Sample ID
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header">
          <h3 className="log-config-detail__section-title">Manage Samples Data Types</h3>
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
              {sampleTypes ? (
                <tr>
                  <td>{sampleTypes.name}</td>
                  <td className="log-config-modules-datatypes-table__center">
                    <AllowManageSelect
                      id={`${formId}-allow-sample-types`}
                      allow={samples.allowUsersToManage["sample-types"] ?? true}
                      disabled={disabled}
                      onChange={(allow) => setAllowManage("sample-types", allow)}
                    />
                  </td>
                  <td>
                    {sampleTypes.editable ? (
                      <ManageDataTypeButton
                        disabled={disabled}
                        onClick={() => setManagingSampleTypes(true)}
                      />
                    ) : null}
                  </td>
                </tr>
              ) : null}

              <tr>
                <td>
                  <span className="log-config-modules-datatypes-table__name-with-help">
                    No Duplicate Sample ID
                    <span
                      className="log-config-modules-datatypes-table__help"
                      title="Prevent duplicate sample IDs when recording samples in a log."
                      aria-label="Prevent duplicate sample IDs when recording samples in a log."
                    >
                      ?
                    </span>
                  </span>
                </td>
                <td className="log-config-modules-datatypes-table__center" />
                <td>
                  <Toggle
                    id={`${formId}-no-duplicate`}
                    checked={samples.noDuplicateSampleId}
                    disabled={disabled}
                    onChange={(checked) => updateSamples({ noDuplicateSampleId: checked })}
                  />
                </td>
              </tr>

              {sampleIds ? (
                <tr>
                  <td>{sampleIds.name}</td>
                  <td className="log-config-modules-datatypes-table__center">
                    <AllowManageSelect
                      id={`${formId}-allow-sample-ids`}
                      allow={samples.allowUsersToManage["sample-ids"] ?? true}
                      disabled={disabled}
                      onChange={(allow) => setAllowManage("sample-ids", allow)}
                    />
                  </td>
                  <td>
                    {sampleIds.editable ? (
                      <ManageDataTypeButton
                        disabled={disabled}
                        onClick={() => setManagingSampleIdFormat(true)}
                      />
                    ) : null}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <ManageSampleTypesModal
        open={managingSampleTypes}
        options={sampleTypeOptions}
        companyOptions={companySampleTypes}
        insituTestTypeOptions={insituTestTypeOptions}
        onClose={() => setManagingSampleTypes(false)}
        onSave={handleSaveSampleTypes}
      />

      <SampleIdStringBuilderModal
        open={managingSampleIdFormat}
        formatString={
          samples.autoSampleIdFormatString || DEFAULT_AUTO_SAMPLE_ID_FORMAT_STRING
        }
        onClose={() => setManagingSampleIdFormat(false)}
        onSave={handleSaveSampleIdFormat}
      />
    </>
  );
}
