"use client";

import { useId, useMemo, useState } from "react";
import { FormField, Input, Select, Toggle, UiButton } from "@/shared/components/ui";
import {
  MODULE_DATA_TYPES,
  MODULE_DISPLAY_NAME_MAX_LENGTH,
  WATER_OBSERVATIONS_MODULE_ID,
  createDefaultWaterObservationsConfig,
  getModuleDataTypeOptions,
  parseWaterObservationTypeOptions,
  toWaterObservationTypeModuleNamedOption,
  type StoredModuleSettings,
  type WaterObservationTypeOption,
  type WaterObservationsModuleConfig,
} from "../../utils/configModules";
import { ManageWaterObservationTypesModal } from "./ManageWaterObservationTypesModal";
import { useUserWaterObservationTypes } from "../../hooks/useUserWaterObservationTypes";
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

const WATER_OBSERVATION_TYPES_DATA_TYPE_ID = "water-observation-types";

type WaterObservationsModuleSettingsPanelProps = Readonly<{
  logConfigurationId: string;
  settings: StoredModuleSettings;
  disabled?: boolean;
  companyWaterObservationTypes?: WaterObservationTypeOption[];
  onChange: (patch: Partial<StoredModuleSettings>) => void;
  onRemove: () => void;
}>;

function getWaterConfig(settings: StoredModuleSettings): WaterObservationsModuleConfig {
  return settings.waterObservations ?? createDefaultWaterObservationsConfig();
}

export function WaterObservationsModuleSettingsPanel({
  logConfigurationId,
  settings,
  disabled,
  companyWaterObservationTypes = [],
  onChange,
  onRemove,
}: WaterObservationsModuleSettingsPanelProps) {
  const formId = useId();
  const water = getWaterConfig(settings);
  const dataTypes = MODULE_DATA_TYPES[WATER_OBSERVATIONS_MODULE_ID] ?? [];
  const [managing, setManaging] = useState(false);

  const waterObservationTypesApi = useUserWaterObservationTypes(WATER_OBSERVATIONS_MODULE_ID, {
    enabled: managing,
    logConfigurationId,
  });

  const updateWater = (patch: Partial<WaterObservationsModuleConfig>) => {
    onChange({
      waterObservations: {
        ...water,
        ...patch,
      },
    });
  };

  const settingsObservationTypes = useMemo(
    () =>
      parseWaterObservationTypeOptions(
        getModuleDataTypeOptions(settings, WATER_OBSERVATION_TYPES_DATA_TYPE_ID)
      ),
    [settings]
  );

  const observationTypeOptions =
    managing && waterObservationTypesApi.items.length > 0
      ? waterObservationTypesApi.items
      : settingsObservationTypes;

  const handleSaveObservationTypes = async (nextOptions: WaterObservationTypeOption[]) => {
    try {
      const saved = await waterObservationTypesApi.save(nextOptions);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [WATER_OBSERVATION_TYPES_DATA_TYPE_ID]: saved.map((entry) =>
            toWaterObservationTypeModuleNamedOption(entry)
          ),
        },
      });
      setManaging(false);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  return (
    <>
      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header log-config-detail__panel-header--row">
          <div>
            <h3 className="log-config-detail__section-title">Edit Water Observations</h3>
            {/* <p className="log-config-detail__section-description">
              Observation types are stored per log configuration and seeded from common defaults
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
            <h4 className="log-config-modules-editor__options-title">Water Observation Options</h4>
            <p className="log-config-detail__section-description">
              Choose the water observation feature you want to enable when recording Water
              Observations.
            </p>
            <div className="log-config-modules-editor__toggle-row log-config-modules-editor__toggle-row--start">
              <Toggle
                id={`${formId}-link-well`}
                checked={water.allowLinkingToWellId}
                disabled={disabled}
                onChange={(checked) => updateWater({ allowLinkingToWellId: checked })}
              />
              <label
                className="log-config-modules-editor__toggle-label"
                htmlFor={`${formId}-link-well`}
              >
                Allow Linking to Well ID
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header">
          <h3 className="log-config-detail__section-title">
            Manage Water Observations Data Types
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
                const allow = water.allowUsersToManage[dataType.id] ?? true;

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
                          updateWater({
                            allowUsersToManage: {
                              ...water.allowUsersToManage,
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
                          onClick={() => setManaging(true)}
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

      <ManageWaterObservationTypesModal
        open={managing}
        options={observationTypeOptions}
        companyOptions={companyWaterObservationTypes}
        onClose={() => setManaging(false)}
        onSave={handleSaveObservationTypes}
      />
    </>
  );
}
