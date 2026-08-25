"use client";

import { useId, useState } from "react";
import { FormField, Input, Select, Toggle, UiButton } from "@/shared/components/ui";
import {
  MODULE_DATA_TYPES,
  MODULE_DISPLAY_NAME_MAX_LENGTH,
  SUBSURFACES_MODULE_ID,
  createDefaultSubsurfacesConfig,
  getModuleDataTypeOptions,
  parseRockTypeOptions,
  parseNonSoilTypeOptions,
  parseFinishingReasonOptions,
  parseColorOptions,
  parseGeomodalLayerOptions,
  type ModuleNamedOption,
  type OriginOption,
  type RockTypeOption,
  type NonSoilTypeOption,
  type FinishingReasonOption,
  type ColorOption,
  type GeomodalLayerOption,
  type StoredModuleSettings,
  type SubsurfacesModuleConfig,
} from "../../utils/configModules";
import {
  ManageModuleDataTypeModal,
  type ModuleDataTypeMeta,
} from "../ManageModuleDataTypeModal";
import { ManageOriginTypesModal } from "./ManageOriginTypesModal";
import { ManageNonSoilTypesModal } from "./ManageNonSoilTypesModal";
import { ManageRockTypesModal } from "./ManageRockTypesModal";
import { ManageFinishingReasonsModal } from "./ManageFinishingReasonsModal";
import { ManageColorsModal } from "./ManageColorsModal";
import { ManageGeomodalLayerTypesModal } from "./ManageGeomodalLayerTypesModal";
import { useUserModuleOrigins } from "../../hooks/useUserModuleOrigins";
import { useUserDataTypeOptions } from "../../hooks/useUserDataTypeOptions";
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

type SubsurfacesModuleSettingsPanelProps = Readonly<{
  logConfigurationId: string;
  settings: StoredModuleSettings;
  disabled?: boolean;
  onChange: (patch: Partial<StoredModuleSettings>) => void;
  onRemove: () => void;
  onEditWorkflow?: () => void;
}>;

type ManagingTarget =
  | { kind: "data-type"; dataTypeId: string; meta: ModuleDataTypeMeta }
  | { kind: "origin" }
  | { kind: "rock-type" }
  | { kind: "non-soil-type" }
  | { kind: "rock-texture"; meta: ModuleDataTypeMeta }
  | { kind: "finish-reasons" }
  | { kind: "colors" }
  | { kind: "geomodal-layer" }
  | { kind: "finish-texts"; meta: ModuleDataTypeMeta };

function getSubsurfaceConfig(settings: StoredModuleSettings): SubsurfacesModuleConfig {
  return settings.subsurface ?? createDefaultSubsurfacesConfig();
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

const FINISH_TEXT_META: ModuleDataTypeMeta = {
  manageTitle: "Manage Log Finish Text",
  manageDescription: "Manage finish text options available when completing a log.",
  sidebarLabel: "Finish Texts",
  nameLabel: "Finish Text",
  deleteLabel: "Delete Finish Text",
  addPanelTitle: "Add New Finish Text",
  editPanelTitle: "Edit",
};

export function SubsurfacesModuleSettingsPanel({
  logConfigurationId,
  settings,
  disabled,
  onChange,
  onRemove,
  onEditWorkflow,
}: SubsurfacesModuleSettingsPanelProps) {
  const formId = useId();
  const subsurface = getSubsurfaceConfig(settings);
  const dataTypes = MODULE_DATA_TYPES[SUBSURFACES_MODULE_ID] ?? [];
  const [managing, setManaging] = useState<ManagingTarget | null>(null);

  const originApi = useUserModuleOrigins(SUBSURFACES_MODULE_ID, {
    enabled: managing?.kind === "origin",
    logConfigurationId,
  });
  const rockTypeApi = useUserDataTypeOptions(SUBSURFACES_MODULE_ID, "rock_type", {
    enabled: managing?.kind === "rock-type",
    logConfigurationId,
  });
  const nonSoilTypeApi = useUserDataTypeOptions(SUBSURFACES_MODULE_ID, "non_soil_type", {
    enabled: managing?.kind === "non-soil-type",
    logConfigurationId,
  });
  const rockTextureApi = useUserDataTypeOptions(SUBSURFACES_MODULE_ID, "rock_texture", {
    enabled: managing?.kind === "rock-texture",
    logConfigurationId,
  });
  const finishingReasonsApi = useUserDataTypeOptions(SUBSURFACES_MODULE_ID, "finish-reasons", {
    enabled: managing?.kind === "finish-reasons",
    logConfigurationId,
  });
  const finishTextsApi = useUserDataTypeOptions(SUBSURFACES_MODULE_ID, "finish-texts", {
    enabled: managing?.kind === "finish-texts",
    logConfigurationId,
  });
  const colorsApi = useUserDataTypeOptions(SUBSURFACES_MODULE_ID, "colors", {
    enabled: managing?.kind === "colors",
    logConfigurationId,
  });
  const geomodalLayerApi = useUserDataTypeOptions(SUBSURFACES_MODULE_ID, "geomodal_layer", {
    enabled: managing?.kind === "geomodal-layer",
    logConfigurationId,
  });

  const updateSubsurface = (patch: Partial<SubsurfacesModuleConfig>) => {
    onChange({
      subsurface: {
        ...subsurface,
        ...patch,
      },
    });
  };

  const managingOptions: ModuleNamedOption[] =
    managing?.kind === "finish-texts"
      ? finishTextsApi.items.map((entry) => ({
          id: entry.id,
          name: entry.name,
        }))
      : managing?.kind === "rock-texture"
        ? rockTextureApi.items.map((entry) => ({
            id: entry.id,
            name: entry.name,
          }))
        : managing?.kind === "data-type"
          ? getModuleDataTypeOptions(settings, managing.dataTypeId)
          : [];

  const originOptions: OriginOption[] =
    managing?.kind === "origin" ? originApi.origins : [];

  const rockTypeOptions: RockTypeOption[] =
    managing?.kind === "rock-type"
      ? parseRockTypeOptions(rockTypeApi.items, [])
      : [];

  const nonSoilTypeOptions: NonSoilTypeOption[] =
    managing?.kind === "non-soil-type"
      ? parseNonSoilTypeOptions(nonSoilTypeApi.items, [])
      : [];

  const finishingReasonOptions: FinishingReasonOption[] =
    managing?.kind === "finish-reasons"
      ? parseFinishingReasonOptions(finishingReasonsApi.items, [])
      : [];

  const colorOptions: ColorOption[] =
    managing?.kind === "colors"
      ? parseColorOptions(colorsApi.items, [])
      : [];

  const geomodalLayerOptions: GeomodalLayerOption[] =
    managing?.kind === "geomodal-layer"
      ? parseGeomodalLayerOptions(geomodalLayerApi.items, [])
      : [];

  const handleSaveOptions = async (options: ModuleNamedOption[]) => {
    if (!managing) return;
    if (managing.kind === "finish-texts") {
      try {
        const saved = await finishTextsApi.save(options);
        onChange({
          dataTypeOptions: {
            ...settings.dataTypeOptions,
            "finish-texts": saved.map((entry) => ({
              id: entry.id,
              name: entry.name,
            })),
          },
          subsurface: {
            ...subsurface,
            finishTexts: saved.map((entry) => ({
              id: entry.id,
              name: entry.name,
            })),
          },
        });
        setManaging(null);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
      }
      return;
    }
    if (managing.kind === "rock-texture") {
      try {
        const saved = await rockTextureApi.save(options);
        onChange({
          dataTypeOptions: {
            ...settings.dataTypeOptions,
            rock_texture: saved.map((entry) => ({
              id: entry.id,
              name: entry.name,
            })),
          },
        });
        setManaging(null);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
      }
      return;
    }
    if (managing.kind === "data-type") {
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [managing.dataTypeId]: options.map((entry) => ({ ...entry })),
        },
      });
    }
    setManaging(null);
  };

  const handleSaveOrigins = async (options: OriginOption[]) => {
    try {
      const saved = await originApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          origin: saved.map((entry) => ({ ...entry })),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveRockTypes = async (options: RockTypeOption[]) => {
    try {
      const saved = await rockTypeApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          rock_type: saved.map((entry) => ({ ...entry })),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveNonSoilTypes = async (options: NonSoilTypeOption[]) => {
    try {
      const saved = await nonSoilTypeApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          non_soil_type: saved.map((entry) => ({ ...entry })),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveFinishingReasons = async (options: FinishingReasonOption[]) => {
    try {
      const saved = await finishingReasonsApi.save(
        options.map((entry) => ({
          id: entry.id,
          name: entry.name,
          code: entry.abbreviation ?? "",
          abbreviation: entry.abbreviation ?? "",
          showAutoScale: entry.showAutoScale ?? true,
        }))
      );
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          "finish-reasons": parseFinishingReasonOptions(saved, []).map((entry) => ({
            ...entry,
          })),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveColors = async (options: ColorOption[]) => {
    const saved = await colorsApi.save(
      options.map((entry) => ({
        id: entry.id,
        name: entry.name,
        color: entry.color ?? null,
        textColor: entry.textColor ?? null,
      }))
    );
    onChange({
      dataTypeOptions: {
        ...settings.dataTypeOptions,
        colors: parseColorOptions(saved, []).map((entry) => ({
          ...entry,
        })),
      },
    });
    setManaging(null);
  };

  const handleSaveGeomodalLayers = async (options: GeomodalLayerOption[]) => {
    const saved = await geomodalLayerApi.save(
      options.map((entry) => ({
        id: entry.id,
        name: entry.name,
        color: entry.color ?? null,
        overlayColor: entry.overlayColor ?? null,
        graphic: entry.graphic ?? null,
      }))
    );
    onChange({
      dataTypeOptions: {
        ...settings.dataTypeOptions,
        geomodal_layer: parseGeomodalLayerOptions(saved, []).map((entry) => ({
          ...entry,
        })),
      },
    });
    setManaging(null);
  };

  return (
    <>
      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header log-config-detail__panel-header--row">
          <div>
            <h3 className="log-config-detail__section-title">Edit Subsurface</h3>
            <p className="log-config-detail__section-description">
               
            </p>
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

          <div>
            <UiButton
              type="button"
              variant="primary"
              size="sm"
              disabled={true}
              onClick={onEditWorkflow}
            >
              Edit Workflow and Descriptions
            </UiButton>
          </div>
        </div>
      </section>

      <section className="log-config-detail__panel">
        <div className="log-config-modules-legacy">
          <div className="log-config-modules-legacy__row">
            <span className="log-config-modules-legacy__label">Manage Log Finish Text</span>
            <div className="log-config-modules-legacy__control">
              <UiButton
                type="button"
                variant="primary"
                size="sm"
                disabled={disabled}
                onClick={() => setManaging({ kind: "finish-texts", meta: FINISH_TEXT_META })}
              >
                Manage
              </UiButton>
            </div>
            <div className="log-config-modules-legacy__spacer" />
          </div>

          <div className="log-config-modules-legacy__row">
            <label className="log-config-modules-legacy__label" htmlFor={`${formId}-munsell`}>
              Munsell Color Picker
            </label>
            <div className="log-config-modules-legacy__control">
              <Toggle
                id={`${formId}-munsell`}
                checked={subsurface.munsellColorPicker}
                disabled={disabled}
                onChange={(checked) => updateSubsurface({ munsellColorPicker: checked })}
              />
            </div>
            <div className="log-config-modules-legacy__spacer" />
          </div>

          <div className="log-config-modules-legacy__row">
            <label className="log-config-modules-legacy__label" htmlFor={`${formId}-overlay`}>
              Apply subsurface colour as overlay
            </label>
            <div className="log-config-modules-legacy__control">
              <Toggle
                id={`${formId}-overlay`}
                checked={subsurface.applyColourAsOverlay}
                disabled={disabled}
                onChange={(checked) => updateSubsurface({ applyColourAsOverlay: checked })}
              />
            </div>
            <div className="log-config-modules-legacy__spacer" />
          </div>

          <div className="log-config-modules-legacy__row">
            <label className="log-config-modules-legacy__label" htmlFor={`${formId}-imperial`}>
              Switch between Imperial and Metric when logging
            </label>
            <div className="log-config-modules-legacy__control">
              <Toggle
                id={`${formId}-imperial`}
                checked={subsurface.switchImperialMetric}
                disabled={disabled}
                onChange={(checked) => updateSubsurface({ switchImperialMetric: checked })}
              />
            </div>
            <div className="log-config-modules-legacy__spacer" />
          </div>

          <div className="log-config-modules-legacy__row log-config-modules-legacy__row--last">
            <label className="log-config-modules-legacy__label" htmlFor={`${formId}-ft-inches`}>
              Switch between Ft and inches when logging
            </label>
            <div className="log-config-modules-legacy__control">
              <Toggle
                id={`${formId}-ft-inches`}
                checked={subsurface.switchFtInches}
                disabled={disabled}
                onChange={(checked) => updateSubsurface({ switchFtInches: checked })}
              />
            </div>
            <div className="log-config-modules-legacy__spacer" />
          </div>
        </div>
      </section>

      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header">
          <h3 className="log-config-detail__section-title">Manage Subsurfaces Data Types</h3>
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
                const allow =
                  subsurface.allowUsersToManage[dataType.id] ?? dataType.id !== "finish-reasons";

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
                          updateSubsurface({
                            allowUsersToManage: {
                              ...subsurface.allowUsersToManage,
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
                          onClick={() =>
                            dataType.id === "origin"
                              ? setManaging({ kind: "origin" })
                              : dataType.id === "rock_type"
                                ? setManaging({ kind: "rock-type" })
                                : dataType.id === "non_soil_type"
                                  ? setManaging({ kind: "non-soil-type" })
                                  : dataType.id === "rock_texture"
                                    ? setManaging({
                                        kind: "rock-texture",
                                        meta: dataTypeMeta(dataType.name),
                                      })
                                    : dataType.id === "finish-reasons"
                                      ? setManaging({ kind: "finish-reasons" })
                                      : dataType.id === "colors"
                                        ? setManaging({ kind: "colors" })
                                        : dataType.id === "geomodal_layer"
                                          ? setManaging({ kind: "geomodal-layer" })
                                          : setManaging({
                                              kind: "data-type",
                                              dataTypeId: dataType.id,
                                              meta: dataTypeMeta(dataType.name),
                                            })
                          }
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
        open={Boolean(
          managing &&
            (managing.kind === "data-type" ||
              managing.kind === "finish-texts" ||
              managing.kind === "rock-texture")
        )}
        meta={
          managing &&
          (managing.kind === "data-type" ||
            managing.kind === "finish-texts" ||
            managing.kind === "rock-texture")
            ? managing.meta
            : null
        }
        options={managingOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveOptions}
      />

      <ManageOriginTypesModal
        open={managing?.kind === "origin"}
        options={originOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveOrigins}
      />

      <ManageRockTypesModal
        open={managing?.kind === "rock-type"}
        options={rockTypeOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveRockTypes}
      />

      <ManageNonSoilTypesModal
        open={managing?.kind === "non-soil-type"}
        options={nonSoilTypeOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveNonSoilTypes}
      />

      <ManageFinishingReasonsModal
        open={managing?.kind === "finish-reasons"}
        options={finishingReasonOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveFinishingReasons}
      />

      <ManageColorsModal
        open={managing?.kind === "colors"}
        options={colorOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveColors}
      />

      <ManageGeomodalLayerTypesModal
        open={managing?.kind === "geomodal-layer"}
        options={geomodalLayerOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveGeomodalLayers}
      />
    </>
  );
}
