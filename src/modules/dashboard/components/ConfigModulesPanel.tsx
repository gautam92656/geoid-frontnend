"use client";

import type { DragEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { FormField, Input, Select, UiButton } from "@/shared/components/ui";
import {
  getModuleTemplateId,
  resolveConfigModule,
  type ConfigModuleDefinition,
} from "../data/configModules";
import {
  DRILLING_OBSERVATIONS_MODULE_ID,
  DEFAULT_DATA_TYPE_OPTIONS,
  INSITU_TESTS_USA_MODULE_ID,
  LOG_REMARKS_MODULE_ID,
  LOG_REPORT_MODULE_ID,
  MODULE_DATA_TYPES,
  MODULE_DISPLAY_NAME_MAX_LENGTH,
  SUBSURFACES_MODULE_ID,
  WATER_OBSERVATIONS_MODULE_ID,
  WELL_LOGS_MODULE_ID,
  SAMPLES_MODULE_ID,
  LAB_TESTS_MODULE_ID,
  CORE_DEFECT_TYPES_DATA_TYPE_ID,
  CORE_LOGGING_MODULE_ID,
  cloneModuleSettings,
  ensureModuleSettingsForEnabledModules,
  getModuleDataTypeOptions,
  parseCoreDefectTypeOptions,
  parseInsituTestTypeOptions,
  parseSampleTypeOptions,
  parseLabTestTypeOptions,
  type ConfigModuleSettings,
  type ModuleNamedOption,
  type StoredModuleSettings,
} from "../utils/configModules";
import {
  ManageModuleDataTypeModal,
  type ModuleDataTypeMeta,
} from "./ManageModuleDataTypeModal";
import {
  DrillingObservationsModuleSettingsPanel,
  InsituTestsModuleSettingsPanel,
  LogRemarksModuleSettingsPanel,
  LogReportModuleSettingsPanel,
  SubsurfacesModuleSettingsPanel,
  WaterObservationsModuleSettingsPanel,
  WellLogsModuleSettingsPanel,
  SamplesModuleSettingsPanel,
  LabTestsModuleSettingsPanel,
  CoreLoggingModuleSettingsPanel,
} from "./configModules";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

type ConfigModulesPanelProps = Readonly<{
  logConfigurationId: string;
  enabledModuleIds: readonly string[];
  moduleSettings: ConfigModuleSettings;
  /** User + common modules from the API (user copies preferred for labels/settings). */
  moduleCatalog?: readonly ConfigModuleDefinition[];
  catalogLoading?: boolean;
  disabled?: boolean;
  onChange: (next: {
    enabledModules: string[];
    moduleSettings: ConfigModuleSettings;
  }) => void;
  /** Persist module removal to the backend (soft-unadopt + update enabledModules). */
  onRemoveModule?: (moduleId: string) => void | Promise<void>;
  onBrowseLibrary: () => void;
  onEditSubsurfaceWorkflow?: () => void;
}>;

type ManagingDataType = {
  moduleId: string;
  dataTypeId: string;
  meta: ModuleDataTypeMeta;
};

function DragHandleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}

function reorderIds(ids: string[], sourceId: string, targetId: string): string[] {
  if (sourceId === targetId) return ids;
  const sourceIndex = ids.findIndex((id) => id === sourceId);
  const targetIndex = ids.findIndex((id) => id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return ids;
  const next = [...ids];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function getListLabel(
  moduleId: string,
  settings: StoredModuleSettings | undefined,
  catalog: readonly ConfigModuleDefinition[]
): string {
  if (settings?.moduleName?.trim()) return settings.moduleName.trim();
  return resolveConfigModule(moduleId, catalog).title;
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

export function ConfigModulesPanel({
  logConfigurationId,
  enabledModuleIds,
  moduleSettings,
  moduleCatalog = [],
  catalogLoading = false,
  disabled,
  onChange,
  onRemoveModule,
  onBrowseLibrary,
  onEditSubsurfaceWorkflow,
}: ConfigModulesPanelProps) {
  const formId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [managing, setManaging] = useState<ManagingDataType | null>(null);

  const orderedIds = useMemo(() => {
    return ensureModuleSettingsForEnabledModules(enabledModuleIds, moduleSettings).order;
  }, [enabledModuleIds, moduleSettings]);

  const activeModules = useMemo(() => {
    const entries: Array<{
      definition: ConfigModuleDefinition;
      settings: StoredModuleSettings | undefined;
      templateId: string;
    }> = [];

    for (const id of orderedIds) {
      const definition = resolveConfigModule(id, moduleCatalog);
      entries.push({
        definition,
        settings: moduleSettings.modules[id],
        templateId: getModuleTemplateId(definition),
      });
    }

    return entries;
  }, [moduleCatalog, moduleSettings.modules, orderedIds]);

  useEffect(() => {
    if (orderedIds.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !orderedIds.includes(selectedId)) {
      setSelectedId(orderedIds[0] ?? null);
    }
  }, [orderedIds, selectedId]);

  const selectedSettings = selectedId ? moduleSettings.modules[selectedId] : undefined;
  const selectedDefinition = selectedId
    ? resolveConfigModule(selectedId, moduleCatalog)
    : undefined;
  const selectedTemplateId = selectedDefinition
    ? getModuleTemplateId(selectedDefinition)
    : selectedId;
  const dataTypes = selectedTemplateId ? (MODULE_DATA_TYPES[selectedTemplateId] ?? []) : [];

  const emitChange = useCallback(
    (enabledModules: string[], nextSettings: ConfigModuleSettings) => {
      onChange({
        enabledModules,
        moduleSettings: ensureModuleSettingsForEnabledModules(enabledModules, nextSettings),
      });
    },
    [onChange]
  );

  const updateSelectedSettings = useCallback(
    (patch: Partial<StoredModuleSettings>) => {
      if (!selectedId || !selectedSettings) return;
      const next = cloneModuleSettings(moduleSettings);
      next.modules[selectedId] = { ...selectedSettings, ...patch };
      emitChange([...enabledModuleIds], next);
    },
    [emitChange, enabledModuleIds, moduleSettings, selectedId, selectedSettings]
  );

  const handleReorder = useCallback(
    (sourceId: string, targetId: string) => {
      emitChange([...enabledModuleIds], {
        ...cloneModuleSettings(moduleSettings),
        order: reorderIds(orderedIds, sourceId, targetId),
      });
    },
    [emitChange, enabledModuleIds, moduleSettings, orderedIds]
  );

  const handleRemoveSelected = useCallback(() => {
    if (!selectedId || disabled) return;
    const moduleId = selectedId;
    if (onRemoveModule) {
      void onRemoveModule(moduleId);
      return;
    }
    const enabledModules = enabledModuleIds.filter((id) => id !== moduleId);
    emitChange(
      enabledModules,
      ensureModuleSettingsForEnabledModules(enabledModules, moduleSettings)
    );
  }, [disabled, emitChange, enabledModuleIds, moduleSettings, onRemoveModule, selectedId]);

  const handleSaveDataTypeOptions = useCallback(
    (options: ModuleNamedOption[]) => {
      if (!managing || !selectedSettings) return;
      const next = cloneModuleSettings(moduleSettings);
      const moduleEntry = next.modules[managing.moduleId];
      if (!moduleEntry) return;
      moduleEntry.dataTypeOptions = {
        ...moduleEntry.dataTypeOptions,
        [managing.dataTypeId]: options.map((entry) => ({ ...entry })),
      };
      emitChange([...enabledModuleIds], next);
      setManaging(null);
    },
    [emitChange, enabledModuleIds, managing, moduleSettings, selectedSettings]
  );

  const managingOptions =
    managing && moduleSettings.modules[managing.moduleId]
      ? getModuleDataTypeOptions(moduleSettings.modules[managing.moduleId], managing.dataTypeId)
      : [];

  if (enabledModuleIds.length === 0) {
    return (
      <div className="log-config-modules-layout log-config-modules-layout--empty">
        <div className="log-config-modules-empty">
          <h3 className="log-config-detail__section-title">Active Modules</h3>
          <p className="log-config-detail__section-description">
            {catalogLoading
              ? "Loading your modules…"
              : "No modules added yet. Add a data module from the library to configure it here. Customizations apply only to this configuration."}
          </p>
          <UiButton type="button" variant="primary" disabled={disabled} onClick={onBrowseLibrary}>
            Add Module
          </UiButton>
        </div>
      </div>
    );
  }

  return (
    <div className="log-config-modules-layout">
      <aside className="log-config-modules-sidebar" aria-label="Active modules">
        <UiButton
          type="button"
          variant="primary"
          className="log-config-modules-sidebar__add"
          disabled={disabled}
          onClick={onBrowseLibrary}
        >
          Add Module
        </UiButton>

        <p className="log-config-modules-sidebar__heading">Active Modules</p>

        <ul className="log-config-modules-sidebar__list">
          {activeModules.map(({ definition, settings }) => {
            const isSelected = definition.id === selectedId;
            return (
              <li key={definition.id}>
                <div
                  className={`log-config-modules-sidebar__item${isSelected ? " is-selected" : ""}${
                    dragOverId === definition.id ? " is-drag-over" : ""
                  }`}
                  draggable={!disabled}
                  onDragStart={() => setDraggingId(definition.id)}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  onDragOver={(event: DragEvent<HTMLDivElement>) => {
                    event.preventDefault();
                    setDragOverId(definition.id);
                  }}
                  onDrop={(event: DragEvent<HTMLDivElement>) => {
                    event.preventDefault();
                    if (draggingId) handleReorder(draggingId, definition.id);
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                >
                  <span className="log-config-modules-sidebar__handle" aria-hidden="true">
                    <DragHandleIcon />
                  </span>
                  <button
                    type="button"
                    className="log-config-modules-sidebar__button"
                    disabled={disabled}
                    onClick={() => setSelectedId(definition.id)}
                  >
                    {getListLabel(definition.id, settings, moduleCatalog)}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="log-config-modules-editor">
        {selectedDefinition && selectedSettings ? (
          selectedTemplateId === LOG_REPORT_MODULE_ID ? (
            <LogReportModuleSettingsPanel
              settings={selectedSettings}
              disabled={disabled}
              onChange={updateSelectedSettings}
              onRemove={handleRemoveSelected}
            />
          ) : selectedTemplateId === SUBSURFACES_MODULE_ID ? (
            <SubsurfacesModuleSettingsPanel
              logConfigurationId={logConfigurationId}
              settings={selectedSettings}
              disabled={disabled}
              onChange={updateSelectedSettings}
              onRemove={handleRemoveSelected}
              onEditWorkflow={onEditSubsurfaceWorkflow}
            />
          ) : selectedTemplateId === INSITU_TESTS_USA_MODULE_ID ? (
            <InsituTestsModuleSettingsPanel
              logConfigurationId={logConfigurationId}
              settings={selectedSettings}
              disabled={disabled}
              companyTestingTypes={parseInsituTestTypeOptions(
                DEFAULT_DATA_TYPE_OPTIONS["testing-types"] ?? []
              )}
              sampleTypeOptions={
                moduleSettings.modules[SAMPLES_MODULE_ID]
                  ? getModuleDataTypeOptions(
                      moduleSettings.modules[SAMPLES_MODULE_ID],
                      "sample-types"
                    ).map((entry) => ({ id: entry.id, name: entry.name }))
                  : []
              }
              onChange={updateSelectedSettings}
              onRemove={handleRemoveSelected}
            />
          ) : selectedTemplateId === LOG_REMARKS_MODULE_ID ? (
            <LogRemarksModuleSettingsPanel
              logConfigurationId={logConfigurationId}
              settings={selectedSettings}
              disabled={disabled}
              onChange={updateSelectedSettings}
              onRemove={handleRemoveSelected}
            />
          ) : selectedTemplateId === DRILLING_OBSERVATIONS_MODULE_ID ? (
            <DrillingObservationsModuleSettingsPanel
              logConfigurationId={logConfigurationId}
              settings={selectedSettings}
              disabled={disabled}
              onChange={updateSelectedSettings}
              onRemove={handleRemoveSelected}
            />
          ) : selectedTemplateId === WATER_OBSERVATIONS_MODULE_ID ? (
            <WaterObservationsModuleSettingsPanel
              logConfigurationId={logConfigurationId}
              settings={selectedSettings}
              disabled={disabled}
              onChange={updateSelectedSettings}
              onRemove={handleRemoveSelected}
            />
          ) : selectedTemplateId === WELL_LOGS_MODULE_ID ? (
            <WellLogsModuleSettingsPanel
              logConfigurationId={logConfigurationId}
              settings={selectedSettings}
              disabled={disabled}
              onChange={updateSelectedSettings}
              onRemove={handleRemoveSelected}
            />
          ) : selectedTemplateId === SAMPLES_MODULE_ID ? (
            <SamplesModuleSettingsPanel
              logConfigurationId={logConfigurationId}
              settings={selectedSettings}
              disabled={disabled}
              companySampleTypes={parseSampleTypeOptions(
                DEFAULT_DATA_TYPE_OPTIONS["sample-types"] ?? []
              )}
              insituTestTypeOptions={
                moduleSettings.modules[INSITU_TESTS_USA_MODULE_ID]
                  ? getModuleDataTypeOptions(
                      moduleSettings.modules[INSITU_TESTS_USA_MODULE_ID],
                      "testing-types"
                    ).map((entry) => ({ id: entry.id, name: entry.name }))
                  : []
              }
              onChange={updateSelectedSettings}
              onRemove={handleRemoveSelected}
            />
          ) : selectedTemplateId === LAB_TESTS_MODULE_ID ? (
            <LabTestsModuleSettingsPanel
              logConfigurationId={logConfigurationId}
              settings={selectedSettings}
              disabled={disabled}
              companyLabTestTypes={parseLabTestTypeOptions(
                DEFAULT_DATA_TYPE_OPTIONS["lab-test-types"] ?? []
              )}
              onChange={updateSelectedSettings}
              onRemove={handleRemoveSelected}
            />
          ) : selectedTemplateId === CORE_LOGGING_MODULE_ID ? (
            <CoreLoggingModuleSettingsPanel
              logConfigurationId={logConfigurationId}
              settings={selectedSettings}
              disabled={disabled}
              companyCoreDefectTypes={parseCoreDefectTypeOptions(
                DEFAULT_DATA_TYPE_OPTIONS[CORE_DEFECT_TYPES_DATA_TYPE_ID] ?? []
              )}
              sampleTypeOptions={
                moduleSettings.modules[SAMPLES_MODULE_ID]
                  ? getModuleDataTypeOptions(
                      moduleSettings.modules[SAMPLES_MODULE_ID],
                      "sample-types"
                    ).map((entry) => ({ id: entry.id, name: entry.name }))
                  : (DEFAULT_DATA_TYPE_OPTIONS["sample-types"] ?? []).map((entry) => ({
                      id: entry.id,
                      name: entry.name,
                    }))
              }
              onChange={updateSelectedSettings}
              onRemove={handleRemoveSelected}
            />
          ) : (
          <>
            <section className="log-config-detail__panel">
              <div className="log-config-detail__panel-header log-config-detail__panel-header--row">
                <div>
                  <h3 className="log-config-detail__section-title">Edit</h3>
                  <p className="log-config-detail__section-description">
                    Set module visibility and naming for logs that use this configuration.
                  </p>
                </div>
                <UiButton
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={disabled}
                  onClick={handleRemoveSelected}
                >
                  Delete
                </UiButton>
              </div>

              <div className="log-config-modules-editor__fields">
                <FormField label="Module Name" htmlFor={`${formId}-name`}>
                  <Input
                    id={`${formId}-name`}
                    variant="ui"
                    value={selectedSettings.moduleName}
                    disabled={disabled}
                    maxLength={MODULE_DISPLAY_NAME_MAX_LENGTH}
                    onChange={(event) =>
                      updateSelectedSettings({ moduleName: event.target.value })
                    }
                  />
                </FormField>

                <FormField label="Module Status" htmlFor={`${formId}-status`}>
                  <Select
                    id={`${formId}-status`}
                    value={selectedSettings.status}
                    disabled={disabled}
                    options={STATUS_OPTIONS}
                    onChange={(value) =>
                      updateSelectedSettings({
                        status: value === "inactive" ? "inactive" : "active",
                      })
                    }
                  />
                </FormField>
              </div>
            </section>

            <section className="log-config-detail__panel">
              <div className="log-config-detail__panel-header">
                <h3 className="log-config-detail__section-title">Manage Data Types</h3>
                <p className="log-config-detail__section-description">
                  Configure option lists used when collecting data for this module.
                </p>
              </div>

              {dataTypes.length === 0 ? (
                <p className="log-config-modules-editor__hint">
                  This module has no configurable data types.
                </p>
              ) : (
                <ul className="log-config-modules-datatypes" aria-label="Data types">
                  {dataTypes.map((dataType) => {
                    const optionCount = dataType.editable
                      ? getModuleDataTypeOptions(selectedSettings, dataType.id).length
                      : 0;

                    return (
                      <li key={dataType.id} className="log-config-modules-datatypes__item">
                        <div className="log-config-modules-datatypes__row">
                          <div>
                            <p className="log-config-modules-datatypes__name">{dataType.name}</p>
                            <p className="log-config-modules-datatypes__meta">
                              {dataType.editable
                                ? `${optionCount} option${optionCount === 1 ? "" : "s"}`
                                : "View only"}
                            </p>
                          </div>
                          {dataType.editable ? (
                            <UiButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={disabled || !selectedId}
                              onClick={() => {
                                if (!selectedId) return;
                                setManaging({
                                  moduleId: selectedId,
                                  dataTypeId: dataType.id,
                                  meta: dataTypeMeta(dataType.name),
                                });
                              }}
                            >
                              Manage
                            </UiButton>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
          )
        ) : (
          <p className="log-config-modules-editor__hint">Select a module to edit its settings.</p>
        )}
      </div>

      <ManageModuleDataTypeModal
        open={Boolean(managing)}
        meta={managing?.meta ?? null}
        options={managingOptions}
        onClose={() => setManaging(null)}
        onSave={handleSaveDataTypeOptions}
      />
    </div>
  );
}
