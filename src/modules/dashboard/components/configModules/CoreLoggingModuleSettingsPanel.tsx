"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { FormField, Input, Select, Toggle, UiButton } from "@/shared/components/ui";
import {
  APERTURE_COLORS_DATA_TYPE_ID,
  APERTURE_MINERALS_DATA_TYPE_ID,
  CORE_DEFECT_TYPES_DATA_TYPE_ID,
  CORE_LOGGING_MODULE_ID,
  DEFAULT_APERTURE_COLOR_OPTIONS,
  DEFAULT_APERTURE_MINERAL_OPTIONS,
  DEFAULT_CORE_DEFECT_TYPE_OPTIONS,
  DEFAULT_DATA_TYPE_OPTIONS,
  DEFAULT_INFILL_MATERIAL_OPTIONS,
  DEFAULT_SAMPLE_TYPE_OPTIONS,
  INFILL_MATERIALS_DATA_TYPE_ID,
  MODULE_DATA_TYPES,
  MODULE_DISPLAY_NAME_MAX_LENGTH,
  createDefaultCoreLoggingConfig,
  getModuleDataTypeOptions,
  parseApertureMineralOptions,
  parseColorOptions,
  parseCoreDefectTypeOptions,
  parseInfillMaterialOptions,
  toApertureMineralModuleNamedOption,
  toColorModuleNamedOption,
  toCoreDefectTypeModuleNamedOption,
  toInfillMaterialModuleNamedOption,
  type ApertureMineralOption,
  type ColorOption,
  type CoreDefectTypeOption,
  type CoreLoggingModuleConfig,
  type InfillMaterialOption,
  type ModuleNamedOption,
  type StoredModuleSettings,
} from "../../utils/configModules";
import {
  ManageModuleDataTypeModal,
  type ModuleDataTypeMeta,
} from "../ManageModuleDataTypeModal";
import { ManageApertureColorsModal } from "./ManageApertureColorsModal";
import { ManageApertureMineralsModal } from "./ManageApertureMineralsModal";
import { ManageCoreDefectTypesModal } from "./ManageCoreDefectTypesModal";
import {
  ManageDefaultSampleTypeModal,
  type DefaultSampleTypeChoice,
} from "./ManageDefaultSampleTypeModal";
import { ManageInfillMaterialsModal } from "./ManageInfillMaterialsModal";
import { useUserCoreDefectTypes } from "../../hooks/useUserCoreDefectTypes";
import { useUserApertureColors } from "../../hooks/useUserApertureColors";
import { useUserApertureMinerals } from "../../hooks/useUserApertureMinerals";
import { useUserInfillMaterials } from "../../hooks/useUserInfillMaterials";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

type CoreLoggingModuleSettingsPanelProps = Readonly<{
  logConfigurationId: string;
  settings: StoredModuleSettings;
  disabled?: boolean;
  /** Optional company-wide core defect types for the "Select Existing" copy control. */
  companyCoreDefectTypes?: CoreDefectTypeOption[];
  /** Sample types available for the default sample type dropdown. */
  sampleTypeOptions?: ReadonlyArray<{ id: string; name: string }>;
  onChange: (patch: Partial<StoredModuleSettings>) => void;
  onRemove: () => void;
}>;

type ToggleField = {
  key: keyof CoreLoggingModuleConfig;
  label: string;
};

type ManagingTarget =
  | { kind: "core-defect-types" }
  | { kind: "aperture-colors" }
  | { kind: "aperture-minerals" }
  | { kind: "infill-materials" }
  | { kind: "default-sample-types" }
  | { kind: "data-type"; dataTypeId: string; meta: ModuleDataTypeMeta };

const OPTIONAL_DEFECT_FIELDS_LEFT: ToggleField[] = [
  { key: "showDefectOrientation", label: "Show Defect Orientation" },
  { key: "showBetaAngle", label: "Show Beta Angle" },
  { key: "showSurfaceShape", label: "Show Surface Shape" },
  { key: "showSurfaceRoughness", label: "Show Surface Roughness" },
  { key: "showDefectCoatings", label: "Show Defect Coatings" },
  { key: "showDefectOpenness", label: "Show Defect Openess" },
  { key: "showDefectSpacingOverride", label: "Show Defect Spacing Override" },
  { key: "showJointRoughnessCoefficient", label: "Show Joint Roughness Coefficient" },
];

const OPTIONAL_DEFECT_FIELDS_RIGHT: ToggleField[] = [
  { key: "showBoundsOnDefectMax", label: "Show Bounds On Defect (max)" },
  { key: "showBoundsOnDefectMin", label: "Show Bounds On Defect (min)" },
  { key: "showMajorInfillMaterial", label: "Show Major Infill Material" },
  { key: "showMinorInfillMaterial", label: "Show Minor Infill Material" },
  { key: "showApertureSpacing", label: "Show Aperture Spacing" },
  { key: "showApertureColor", label: "Show Aperture Color" },
  { key: "showApertureMineral", label: "Show Aperture Mineral" },
  { key: "showJointCondition", label: "Show Joint Condition" },
];

const RQD_TCR_FIELDS: ToggleField[] = [
  { key: "showRqdRecRunType", label: "Show RQD/ REC Run Type" },
  { key: "autoCalculationCoreRecoveryLength", label: "Auto Calculation Core Recovery Length" },
  { key: "showScr", label: "SCR" },
  { key: "showFractureIndex", label: "Fracture Index" },
  { key: "showRmr", label: "RMR" },
];

const WORKFLOW_FIELDS: ToggleField[] = [
  { key: "showStrengthInCoreLogging", label: "Show Strength in Core Logging" },
  { key: "showWeatheringInCoreLogging", label: "Show Weathering in Core Logging" },
  { key: "showIndependentFractureIndex", label: "Show Independent Fracture Index in Core Logging" },
];

function getCoreLoggingConfig(settings: StoredModuleSettings): CoreLoggingModuleConfig {
  return settings.coreLogging ?? createDefaultCoreLoggingConfig();
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

function ToggleOptionRow({
  id,
  label,
  checked,
  disabled,
  onChange,
  action,
}: Readonly<{
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  action?: ReactNode;
}>) {
  return (
    <div className="log-config-modules-editor__toggle-row log-config-modules-editor__toggle-row--start">
      <Toggle id={id} checked={checked} disabled={disabled} onChange={onChange} />
      <label className="log-config-modules-editor__toggle-label" htmlFor={id}>
        {label}
      </label>
      {action}
    </div>
  );
}

export function CoreLoggingModuleSettingsPanel({
  logConfigurationId,
  settings,
  disabled,
  companyCoreDefectTypes = [],
  sampleTypeOptions = [],
  onChange,
  onRemove,
}: CoreLoggingModuleSettingsPanelProps) {
  const formId = useId();
  const coreLogging = getCoreLoggingConfig(settings);
  const dataTypes = MODULE_DATA_TYPES[CORE_LOGGING_MODULE_ID] ?? [];
  const [managing, setManaging] = useState<ManagingTarget | null>(null);

  const coreDefectTypesApi = useUserCoreDefectTypes(CORE_LOGGING_MODULE_ID, {
    enabled: managing?.kind === "core-defect-types",
    logConfigurationId,
  });
  const apertureColorsApi = useUserApertureColors(CORE_LOGGING_MODULE_ID, {
    enabled: managing?.kind === "aperture-colors",
    logConfigurationId,
  });
  const apertureMineralsApi = useUserApertureMinerals(CORE_LOGGING_MODULE_ID, {
    enabled: managing?.kind === "aperture-minerals",
    logConfigurationId,
  });
  const infillMaterialsApi = useUserInfillMaterials(CORE_LOGGING_MODULE_ID, {
    enabled: managing?.kind === "infill-materials",
    logConfigurationId,
  });

  const updateCoreLogging = (patch: Partial<CoreLoggingModuleConfig>) => {
    onChange({
      coreLogging: {
        ...coreLogging,
        ...patch,
      },
    });
  };

  const setBoolean = (key: keyof CoreLoggingModuleConfig, checked: boolean) => {
    updateCoreLogging({ [key]: checked } as Partial<CoreLoggingModuleConfig>);
  };

  const settingsCoreDefectTypes = useMemo(
    () =>
      parseCoreDefectTypeOptions(
        getModuleDataTypeOptions(settings, CORE_DEFECT_TYPES_DATA_TYPE_ID),
        DEFAULT_CORE_DEFECT_TYPE_OPTIONS
      ),
    [settings]
  );

  const settingsApertureColors = useMemo(
    () =>
      parseColorOptions(
        getModuleDataTypeOptions(settings, APERTURE_COLORS_DATA_TYPE_ID),
        DEFAULT_APERTURE_COLOR_OPTIONS as ColorOption[]
      ),
    [settings]
  );

  const settingsApertureMinerals = useMemo(
    () =>
      parseApertureMineralOptions(
        getModuleDataTypeOptions(settings, APERTURE_MINERALS_DATA_TYPE_ID),
        DEFAULT_APERTURE_MINERAL_OPTIONS
      ),
    [settings]
  );

  const settingsInfillMaterials = useMemo(
    () =>
      parseInfillMaterialOptions(
        getModuleDataTypeOptions(settings, INFILL_MATERIALS_DATA_TYPE_ID),
        DEFAULT_INFILL_MATERIAL_OPTIONS
      ),
    [settings]
  );

  /** Prefer dedicated collection data over module-settings JSON when managing. */
  const coreDefectTypeOptions: CoreDefectTypeOption[] =
    managing?.kind === "core-defect-types"
      ? coreDefectTypesApi.loading && coreDefectTypesApi.items.length === 0
        ? settingsCoreDefectTypes
        : coreDefectTypesApi.items
      : settingsCoreDefectTypes;

  const apertureColorOptions: ColorOption[] =
    managing?.kind === "aperture-colors"
      ? apertureColorsApi.loading && apertureColorsApi.items.length === 0
        ? settingsApertureColors
        : apertureColorsApi.items
      : settingsApertureColors;

  const apertureMineralOptions: ApertureMineralOption[] =
    managing?.kind === "aperture-minerals"
      ? apertureMineralsApi.loading && apertureMineralsApi.items.length === 0
        ? settingsApertureMinerals
        : apertureMineralsApi.items
      : settingsApertureMinerals;

  const infillMaterialOptions: InfillMaterialOption[] =
    managing?.kind === "infill-materials"
      ? infillMaterialsApi.loading && infillMaterialsApi.items.length === 0
        ? settingsInfillMaterials
        : infillMaterialsApi.items
      : settingsInfillMaterials;

  const resolvedCompanyCoreDefectTypes = useMemo(() => {
    if (companyCoreDefectTypes.length > 0) {
      return parseCoreDefectTypeOptions(companyCoreDefectTypes);
    }
    return parseCoreDefectTypeOptions(
      DEFAULT_DATA_TYPE_OPTIONS[CORE_DEFECT_TYPES_DATA_TYPE_ID] ?? DEFAULT_CORE_DEFECT_TYPE_OPTIONS
    );
  }, [companyCoreDefectTypes]);

  const resolvedSampleTypeOptions = useMemo(() => {
    const fromProp = sampleTypeOptions
      .filter((entry) => entry.id.trim() && entry.name.trim())
      .map((entry) => ({ id: entry.id.trim(), name: entry.name.trim() }));
    if (fromProp.length > 0) return fromProp;

    const fromDefaults = (
      DEFAULT_DATA_TYPE_OPTIONS["sample-types"] ?? DEFAULT_SAMPLE_TYPE_OPTIONS
    )
      .filter((entry) => entry.id.trim() && entry.name.trim())
      .map((entry) => ({ id: entry.id.trim(), name: entry.name.trim() }));
    return fromDefaults;
  }, [sampleTypeOptions]);

  const selectedDefaultSampleType: DefaultSampleTypeChoice | null = useMemo(() => {
    const current = coreLogging.defaultSampleTypes[0];
    if (!current?.id?.trim() || !current?.name?.trim()) return null;
    return { id: current.id.trim(), name: current.name.trim() };
  }, [coreLogging.defaultSampleTypes]);

  const managingOptions: ModuleNamedOption[] =
    managing?.kind === "data-type"
      ? getModuleDataTypeOptions(settings, managing.dataTypeId)
      : [];

  const handleSelectDefaultSampleType = (option: DefaultSampleTypeChoice) => {
    updateCoreLogging({ defaultSampleTypes: [{ id: option.id, name: option.name }] });
    setManaging(null);
  };

  const handleSaveDataTypeOptions = (options: ModuleNamedOption[]) => {
    if (managing?.kind !== "data-type") return;
    onChange({
      dataTypeOptions: {
        ...settings.dataTypeOptions,
        [managing.dataTypeId]: options.map((entry) => ({ ...entry })),
      },
    });
    setManaging(null);
  };

  const handleSaveCoreDefectTypes = async (options: CoreDefectTypeOption[]) => {
    try {
      const saved = await coreDefectTypesApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [CORE_DEFECT_TYPES_DATA_TYPE_ID]: saved.map((entry) =>
            toCoreDefectTypeModuleNamedOption(entry)
          ),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveApertureColors = async (options: ColorOption[]) => {
    try {
      const saved = await apertureColorsApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [APERTURE_COLORS_DATA_TYPE_ID]: saved.map((entry) => toColorModuleNamedOption(entry)),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveApertureMinerals = async (options: ApertureMineralOption[]) => {
    try {
      const saved = await apertureMineralsApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [APERTURE_MINERALS_DATA_TYPE_ID]: saved.map((entry) =>
            toApertureMineralModuleNamedOption(entry)
          ),
        },
      });
      setManaging(null);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveInfillMaterials = async (options: InfillMaterialOption[]) => {
    try {
      const saved = await infillMaterialsApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [INFILL_MATERIALS_DATA_TYPE_ID]: saved.map((entry) =>
            toInfillMaterialModuleNamedOption(entry)
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
            <h3 className="log-config-detail__section-title">Edit Core Logging</h3>
            {/* <p className="log-config-detail__section-description">
              Configure Core Logging for this log configuration. Defect types, aperture colors,
              aperture minerals, and infill materials are stored separately and apply only to this
              configuration.
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
            <h4 className="log-config-modules-editor__options-title">
              Sample Oriented Logging Options
            </h4>
            <p className="log-config-detail__section-description">
              Select where Sample Oriented Logging Form is included.
            </p>

            <ToggleOptionRow
              id={`${formId}-sample-core-defects`}
              label="Core Defects"
              checked={coreLogging.sampleOrientedCoreDefects}
              disabled={disabled}
              onChange={(checked) => setBoolean("sampleOrientedCoreDefects", checked)}
            />

            <ToggleOptionRow
              id={`${formId}-sample-rqd-tcr`}
              label="RQD/TCR"
              checked={coreLogging.sampleOrientedRqdTcr}
              disabled={disabled}
              onChange={(checked) => setBoolean("sampleOrientedRqdTcr", checked)}
              action={
                <UiButton
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={disabled}
                  onClick={() => setManaging({ kind: "default-sample-types" })}
                >
                  Manage Default Sample Type
                </UiButton>
              }
            />
          </div>

          <div className="log-config-modules-editor__options-block">
            <h4 className="log-config-modules-editor__options-title">
              Optional Core Defect Fields
            </h4>
            <p className="log-config-detail__section-description">
              Select the optional core defect fields you want to include when logging core defects.
            </p>

            <div className="log-config-core-logging-fields">
              <div className="log-config-core-logging-fields__column">
                {OPTIONAL_DEFECT_FIELDS_LEFT.map((field) => (
                  <ToggleOptionRow
                    key={field.key}
                    id={`${formId}-${field.key}`}
                    label={field.label}
                    checked={Boolean(coreLogging[field.key])}
                    disabled={disabled}
                    onChange={(checked) => setBoolean(field.key, checked)}
                  />
                ))}
              </div>
              <div className="log-config-core-logging-fields__column">
                {OPTIONAL_DEFECT_FIELDS_RIGHT.map((field) => (
                  <ToggleOptionRow
                    key={field.key}
                    id={`${formId}-${field.key}`}
                    label={field.label}
                    checked={Boolean(coreLogging[field.key])}
                    disabled={disabled}
                    onChange={(checked) => setBoolean(field.key, checked)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="log-config-modules-editor__options-block">
            <h4 className="log-config-modules-editor__options-title">RQD/TCR</h4>
            {RQD_TCR_FIELDS.map((field) => (
              <ToggleOptionRow
                key={field.key}
                id={`${formId}-${field.key}`}
                label={field.label}
                checked={Boolean(coreLogging[field.key])}
                disabled={disabled}
                onChange={(checked) => setBoolean(field.key, checked)}
              />
            ))}
          </div>

          <div className="log-config-modules-editor__options-block">
            <h4 className="log-config-modules-editor__options-title">Workflows</h4>
            {WORKFLOW_FIELDS.map((field) => (
              <ToggleOptionRow
                key={field.key}
                id={`${formId}-${field.key}`}
                label={field.label}
                checked={Boolean(coreLogging[field.key])}
                disabled={disabled}
                onChange={(checked) => setBoolean(field.key, checked)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header">
          <h3 className="log-config-detail__section-title">Manage Core Logging Data Types</h3>
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
                const allow = coreLogging.allowUsersToManage[dataType.id] ?? true;
                const isCoreDefectTypes = dataType.id === CORE_DEFECT_TYPES_DATA_TYPE_ID;
                const isApertureColors = dataType.id === APERTURE_COLORS_DATA_TYPE_ID;
                const isApertureMinerals = dataType.id === APERTURE_MINERALS_DATA_TYPE_ID;
                const isInfillMaterials = dataType.id === INFILL_MATERIALS_DATA_TYPE_ID;

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
                          updateCoreLogging({
                            allowUsersToManage: {
                              ...coreLogging.allowUsersToManage,
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
                            if (isCoreDefectTypes) {
                              setManaging({ kind: "core-defect-types" });
                              return;
                            }
                            if (isApertureColors) {
                              setManaging({ kind: "aperture-colors" });
                              return;
                            }
                            if (isApertureMinerals) {
                              setManaging({ kind: "aperture-minerals" });
                              return;
                            }
                            if (isInfillMaterials) {
                              setManaging({ kind: "infill-materials" });
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

      <ManageDefaultSampleTypeModal
        open={managing?.kind === "default-sample-types"}
        selected={selectedDefaultSampleType}
        sampleTypeOptions={resolvedSampleTypeOptions}
        onClose={() => setManaging(null)}
        onSelect={handleSelectDefaultSampleType}
      />

      <ManageCoreDefectTypesModal
        open={managing?.kind === "core-defect-types"}
        options={coreDefectTypeOptions}
        companyOptions={resolvedCompanyCoreDefectTypes}
        sampleTypeOptions={resolvedSampleTypeOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveCoreDefectTypes}
      />

      <ManageApertureColorsModal
        open={managing?.kind === "aperture-colors"}
        options={apertureColorOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveApertureColors}
      />

      <ManageApertureMineralsModal
        open={managing?.kind === "aperture-minerals"}
        options={apertureMineralOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveApertureMinerals}
      />

      <ManageInfillMaterialsModal
        open={managing?.kind === "infill-materials"}
        options={infillMaterialOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveInfillMaterials}
      />

      <ManageModuleDataTypeModal
        open={managing?.kind === "data-type"}
        meta={managing?.kind === "data-type" ? managing.meta : null}
        options={managingOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveDataTypeOptions}
      />
    </>
  );
}
