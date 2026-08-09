"use client";

import type { DragEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ConfirmDialog,
  EditIcon,
  Input,
  TableRowActionsMenu,
  TrashIcon,
  UiButton,
} from "@/shared/components/ui";
import {
  WORKFLOW_STEPS_MAX_COUNT,
  cloneWorkflowStep,
  createOptionId,
  createWorkflowFromApiTemplate,
  countVisibleWorkflowSteps,
  isLegacyWorkflowSteps,
  normalizeWorkflowSettings,
  parseWorkflowSettings,
  mergeWorkflowStepOptions,
  groupWorkflowStepsIntoSections,
  sanitizeWorkflowPreviewValues,
  validateWorkflowPreview,
  parseOriginOptions,
  parseRockTypeOptions,
  parseNonSoilTypeOptions,
  type WorkflowSettings,
  type OriginOption,
  type RockTypeOption,
  type NonSoilTypeOption,
  type StoredModuleSettings,
  type WorkflowPreviewValues,
  type WorkflowStep,
} from "../../utils/configModuleSettings";
import { ClassificationCodeBuilderPanel } from "./ClassificationCodeBuilderPanel";
import { EditWorkflowStepDrawer } from "./EditWorkflowStepDrawer";
import { ManageOriginTypesModal } from "./ManageOriginTypesModal";
import { ManageNonSoilTypesModal } from "./ManageNonSoilTypesModal";
import { ManageRockTypesModal } from "./ManageRockTypesModal";
import { WorkflowPreviewForm } from "./WorkflowPreviewForm";
import { createEmptyWorkflowStep, WORKFLOW_INPUT_TYPE_LABELS } from "../../utils/configModules/workflowStepEditor";
import { getWorkflowTemplate } from "../../services/configModulesApi";
import { SUBSURFACES_MODULE_ID } from "../../utils/configModules/modules/subsurfaces";
import { persistUserOrigins } from "../../utils/userModuleOrigins";
import {
  persistUserNonSoilTypes,
  persistUserRockTypes,
} from "../../utils/userModuleDataTypeOptions";
import { showApiError } from "@/shared/utils/apiToast";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";

type BuilderTabId = "workflow" | "classification";

const BUILDER_TABS: readonly { id: BuilderTabId; label: string }[] = [
  { id: "workflow", label: "Workflow Builder" },
  { id: "classification", label: "Classification" },
];

type SubsurfacesWorkflowBuilderPanelProps = Readonly<{
  configurationName: string;
  logConfigurationId: string;
  workflow: WorkflowSettings;
  subsurfaceSettings?: StoredModuleSettings;
  disabled?: boolean;
  /** Which builder tab to open first. Defaults to Workflow Builder. */
  initialTab?: BuilderTabId;
  /** When true, only the manage/preview workflow layout is shown (no breadcrumbs). */
  embedded?: boolean;
  onChange: (workflow: WorkflowSettings) => void;
  /** Reset workflow to common template defaults (persisted for this log configuration). */
  onResetToTemplate?: () => Promise<WorkflowSettings | null>;
  onSubsurfaceSettingsChange?: (settings: StoredModuleSettings) => void;
  onBack?: () => void;
}>;

function isOriginWorkflowStep(step: WorkflowStep): boolean {
  return (
    step.optionSet === "origin" ||
    (step.fieldName?.trim().toLowerCase() ?? "") === "origin" ||
    step.name.trim().toLowerCase() === "origin"
  );
}

function isRockTypeWorkflowStep(step: WorkflowStep): boolean {
  return (
    step.optionSet === "rock_type" ||
    step.databaseField === "rock_type" ||
    (step.fieldName?.trim().toLowerCase() ?? "") === "rock type" ||
    step.name.trim().toLowerCase() === "rock type"
  );
}

function isNonSoilTypeWorkflowStep(step: WorkflowStep): boolean {
  const fieldName = step.fieldName?.trim().toLowerCase() ?? "";
  const name = step.name.trim().toLowerCase();
  return (
    step.optionSet === "non_soil_type" ||
    step.databaseField === "non_soil_type" ||
    step.databaseField === "pavement_type" ||
    fieldName === "non-soil type" ||
    fieldName === "non soil type" ||
    name === "non-soil type" ||
    name === "non soil type"
  );
}

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

function DuplicateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 15V5.5A1.5 1.5 0 016.5 4H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function reorderSteps(steps: WorkflowStep[], sourceId: string, targetId: string): WorkflowStep[] {
  if (sourceId === targetId) return steps;
  const sourceIndex = steps.findIndex((step) => step.id === sourceId);
  const targetIndex = steps.findIndex((step) => step.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return steps;
  const next = [...steps];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function readPreviewSelection(
  previewValues: WorkflowPreviewValues,
  key: string
): string[] {
  const raw = previewValues[key];
  if (Array.isArray(raw)) {
    return raw.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
    );
  }
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

function formatInputTypeLabel(inputType?: WorkflowStep["inputType"]): string {
  if (!inputType) return "Text";
  return WORKFLOW_INPUT_TYPE_LABELS[inputType] ?? inputType;
}

export function SubsurfacesWorkflowBuilderPanel({
  configurationName,
  logConfigurationId,
  workflow,
  subsurfaceSettings,
  disabled,
  initialTab = "workflow",
  embedded = false,
  onChange,
  onResetToTemplate,
  onSubsurfaceSettingsChange,
  onBack,
}: SubsurfacesWorkflowBuilderPanelProps) {
  const formId = useId();
  const [activeTab, setActiveTab] = useState<BuilderTabId>(initialTab);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(workflow.steps[0]?.id ?? null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [manageOriginsOpen, setManageOriginsOpen] = useState(false);
  const [manageRockTypesOpen, setManageRockTypesOpen] = useState(false);
  const [manageNonSoilTypesOpen, setManageNonSoilTypesOpen] = useState(false);
  const [stepEditor, setStepEditor] = useState<{
    mode: "add" | "edit";
    step: WorkflowStep;
  } | null>(null);
  const [previewValues, setPreviewValues] = useState<WorkflowPreviewValues>({});
  const [showPreviewValidation, setShowPreviewValidation] = useState(false);
  const didNormalizeWorkflow = useRef(false);

  useEffect(() => {
    if (didNormalizeWorkflow.current) return;
    if (!isLegacyWorkflowSteps(workflow.steps)) return;
    didNormalizeWorkflow.current = true;
    onChange(normalizeWorkflowSettings(workflow));
  }, [onChange, workflow]);

  const previewValidation = useMemo(
    () => validateWorkflowPreview(workflow.steps, previewValues),
    [workflow.steps, previewValues]
  );

  const visibleStepCount = useMemo(
    () => countVisibleWorkflowSteps(workflow.steps, previewValues, subsurfaceSettings),
    [workflow.steps, previewValues, subsurfaceSettings]
  );

  const selectedStep = selectedId
    ? (workflow.steps.find((step) => step.id === selectedId) ?? null)
    : null;

  const filteredSteps = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return workflow.steps;
    return workflow.steps.filter((step) => {
      const haystack = `${step.name} ${step.fieldName ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [search, workflow.steps]);

  const stepSections = useMemo(() => {
    const query = search.trim();
    if (query) {
      return [{ id: "search", label: "", steps: filteredSteps }];
    }
    return groupWorkflowStepsIntoSections(workflow.steps);
  }, [filteredSteps, search, workflow.steps]);

  const emit = (next: WorkflowSettings) => {
    onChange(next);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const nextSteps = workflow.steps.filter((step) => step.id !== selectedId);
    emit({ ...workflow, steps: nextSteps });
    setSelectedId(nextSteps[0]?.id ?? null);
    setDeleteConfirmOpen(false);
  };

  const resetToApiTemplate = () => {
    void (async () => {
      try {
        if (onResetToTemplate) {
          const template = await onResetToTemplate();
          if (template) {
            setSelectedId(template.steps[0]?.id ?? null);
          }
        } else {
          let template = createWorkflowFromApiTemplate();
          try {
            const { data } = await getWorkflowTemplate(SUBSURFACES_MODULE_ID);
            const parsed = normalizeWorkflowSettings(parseWorkflowSettings(data));
            if (parsed.steps.length > 0) {
              template = parsed;
            }
          } catch {
            // Fall back to bundled ASTM defaults when the API is unavailable.
          }

          emit({
            ...workflow,
            name: template.name,
            ignoreParentLegacySettings: template.ignoreParentLegacySettings,
            applyClassificationRules: template.applyClassificationRules,
            steps: template.steps,
            classificationCodes: template.classificationCodes,
          });
          setSelectedId(template.steps[0]?.id ?? null);
        }
      } finally {
        setPreviewValues({});
        setShowPreviewValidation(false);
        setResetConfirmOpen(false);
      }
    })();
  };

  const openStepEditor = (step: WorkflowStep, mode: "add" | "edit") => {
    setStepEditor({ mode, step: cloneWorkflowStep(step) });
    setSelectedId(step.id);
  };

  const originOptions: OriginOption[] = useMemo(
    () => parseOriginOptions(subsurfaceSettings?.dataTypeOptions?.origin ?? [], []),
    [subsurfaceSettings?.dataTypeOptions?.origin]
  );

  const rockTypeOptions: RockTypeOption[] = useMemo(
    () => parseRockTypeOptions(subsurfaceSettings?.dataTypeOptions?.rock_type ?? [], []),
    [subsurfaceSettings?.dataTypeOptions?.rock_type]
  );

  const nonSoilTypeOptions: NonSoilTypeOption[] = useMemo(
    () =>
      parseNonSoilTypeOptions(subsurfaceSettings?.dataTypeOptions?.non_soil_type ?? [], []),
    [subsurfaceSettings?.dataTypeOptions?.non_soil_type]
  );

  const handleSaveOrigins = async (options: OriginOption[]) => {
    if (!subsurfaceSettings || !onSubsurfaceSettingsChange) return;
    try {
      const saved = await persistUserOrigins(
        SUBSURFACES_MODULE_ID,
        options,
        logConfigurationId
      );
      onSubsurfaceSettingsChange({
        ...subsurfaceSettings,
        dataTypeOptions: {
          ...subsurfaceSettings.dataTypeOptions,
          origin: saved.map((entry) => ({ ...entry })),
        },
      });
      setManageOriginsOpen(false);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveRockTypes = async (options: RockTypeOption[]) => {
    if (!subsurfaceSettings || !onSubsurfaceSettingsChange) return;
    try {
      const saved = await persistUserRockTypes(
        SUBSURFACES_MODULE_ID,
        options,
        logConfigurationId
      );
      onSubsurfaceSettingsChange({
        ...subsurfaceSettings,
        dataTypeOptions: {
          ...subsurfaceSettings.dataTypeOptions,
          rock_type: saved.map((entry) => ({ ...entry })),
        },
      });
      setManageRockTypesOpen(false);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveNonSoilTypes = async (options: NonSoilTypeOption[]) => {
    if (!subsurfaceSettings || !onSubsurfaceSettingsChange) return;
    try {
      const saved = await persistUserNonSoilTypes(
        SUBSURFACES_MODULE_ID,
        options,
        logConfigurationId
      );
      onSubsurfaceSettingsChange({
        ...subsurfaceSettings,
        dataTypeOptions: {
          ...subsurfaceSettings.dataTypeOptions,
          non_soil_type: saved.map((entry) => ({ ...entry })),
        },
      });
      setManageNonSoilTypesOpen(false);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const addStep = () => {
    if (disabled || workflow.steps.length >= WORKFLOW_STEPS_MAX_COUNT) return;
    const nextStep: WorkflowStep = {
      ...createEmptyWorkflowStep(workflow.steps.length),
      id: createOptionId("workflow-step"),
    };
    openStepEditor(nextStep, "add");
  };

  const saveStep = (step: WorkflowStep) => {
    if (stepEditor?.mode === "add") {
      emit({ ...workflow, steps: [...workflow.steps, step] });
    } else {
      emit({
        ...workflow,
        steps: workflow.steps.map((entry) => (entry.id === step.id ? step : entry)),
      });
    }
    setSelectedId(step.id);
    setStepEditor(null);
  };

  const applyPreviewValues = (next: WorkflowPreviewValues) => {
    return sanitizeWorkflowPreviewValues(workflow.steps, next, subsurfaceSettings);
  };

  const setPreviewValue = (key: string, value: string | boolean | string[] | null) => {
    setPreviewValues((current) => applyPreviewValues({ ...current, [key]: value }));
    setShowPreviewValidation(false);
  };

  const togglePreviewOption = (
    key: string,
    optionValue: string,
    multiple: boolean,
    maxSelected?: number
  ) => {
    setPreviewValues((current) => {
      const selected = readPreviewSelection(current, key);
      let patch: WorkflowPreviewValues;

      if (!multiple) {
        patch = { ...current, [key]: optionValue };
      } else {
        const isActive = selected.includes(optionValue);
        let next = isActive
          ? selected.filter((entry) => entry !== optionValue)
          : [...selected, optionValue];

        if (maxSelected && next.length > maxSelected) {
          next = next.slice(-maxSelected);
        }

        patch = { ...current, [key]: next };
      }

      return applyPreviewValues(patch);
    });
    setShowPreviewValidation(false);
  };

  const runPreviewValidation = () => {
    setShowPreviewValidation(true);
    return validateWorkflowPreview(workflow.steps, previewValues);
  };

  const manageWorkflowContent = (
    <>
      <div className="log-config-wf-builder__manage-header">
        <h3 className="log-config-wf-builder__panel-title">Manage Workflow</h3>
        <div className="log-config-wf-builder__manage-actions">
          <span className="log-config-wf-builder__step-stats">
            {workflow.steps.length} step{workflow.steps.length === 1 ? "" : "s"}
          </span>
          <UiButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || workflow.steps.length >= WORKFLOW_STEPS_MAX_COUNT}
            onClick={addStep}
          >
            Add step
          </UiButton>
        </div>
      </div>

      <div className="log-config-wf-builder__search">
        <Input
          variant="ui"
          value={search}
          disabled={disabled}
          placeholder="Search"
          aria-label="Search workflow steps"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <ul className="log-config-wf-builder__steps ui-scrollbar" aria-label="Workflow steps">
        {filteredSteps.length === 0 ? (
          <li className="log-config-wf-builder__empty">No steps match your search.</li>
        ) : (
          stepSections.map((section) => (
            <li key={section.id} className="log-config-wf-builder__step-section">
              {section.label ? (
                <div className="log-config-wf-builder__step-section-label">{section.label}</div>
              ) : null}
              <ul className="log-config-wf-builder__step-section-list">
                {section.steps.map((step) => {
                  const isSelected = selectedId === step.id;
                  const fieldLabel = step.fieldName?.trim() || step.name.trim();
                  const displayName = step.name.trim();
                  const showDisplayName =
                    displayName.toLowerCase() !== fieldLabel.toLowerCase();
                  const conditionCount = step.conditions?.length ?? 0;
                  const optionCount = mergeWorkflowStepOptions(step, subsurfaceSettings).length;
                  const stepOrder =
                    workflow.steps.findIndex((entry) => entry.id === step.id) + 1;

                  return (
                    <li key={step.id}>
                      <div
                        className={`log-config-wf-builder__step${isSelected ? " is-selected" : ""}${
                          dragOverId === step.id ? " is-drag-over" : ""
                        }`}
                        draggable={!disabled}
                        onDragStart={() => setDraggingId(step.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverId(null);
                        }}
                        onDragOver={(event: DragEvent<HTMLDivElement>) => {
                          event.preventDefault();
                          setDragOverId(step.id);
                        }}
                        onDrop={(event: DragEvent<HTMLDivElement>) => {
                          event.preventDefault();
                          if (draggingId) {
                            emit({
                              ...workflow,
                              steps: reorderSteps(workflow.steps, draggingId, step.id),
                            });
                          }
                          setDraggingId(null);
                          setDragOverId(null);
                        }}
                      >
                        <span className="log-config-wf-builder__handle" aria-hidden="true">
                          <DragHandleIcon />
                        </span>
                        <span className="log-config-wf-builder__step-order">{stepOrder}</span>
                        <button
                          type="button"
                          className="log-config-wf-builder__step-button"
                          disabled={disabled}
                          onClick={() => openStepEditor(step, "edit")}
                        >
                          <div className="log-config-wf-builder__step-body">
                            <span className="log-config-wf-builder__step-field-name">
                              {fieldLabel}
                            </span>
                            {showDisplayName ? (
                              <span className="log-config-wf-builder__step-display-name">
                                Display: {displayName}
                              </span>
                            ) : null}
                            <div className="log-config-wf-builder__step-badges">
                              <span className="log-config-wf-builder__badge">
                                {formatInputTypeLabel(step.inputType)}
                              </span>
                              {step.required ? (
                                <span className="log-config-wf-builder__badge log-config-wf-builder__badge--required">
                                  Required
                                </span>
                              ) : null}
                              {conditionCount > 0 ? (
                                <span className="log-config-wf-builder__badge log-config-wf-builder__badge--conditions">
                                  {conditionCount} condition{conditionCount === 1 ? "" : "s"}
                                </span>
                              ) : null}
                              {step.multipleOptions ? (
                                <span className="log-config-wf-builder__badge">Multi-select</span>
                              ) : null}
                              {optionCount > 0 ? (
                                <span className="log-config-wf-builder__badge">
                                  {optionCount} option{optionCount === 1 ? "" : "s"}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                        <TableRowActionsMenu
                          label={`Actions for ${step.name}`}
                          actions={[
                            {
                              id: "edit",
                              label: "Edit",
                              icon: <EditIcon />,
                              onClick: () => openStepEditor(step, "edit"),
                            },
                            {
                              id: "duplicate",
                              label: "Duplicate",
                              icon: <DuplicateIcon />,
                              onClick: () => {
                                if (workflow.steps.length >= WORKFLOW_STEPS_MAX_COUNT) return;
                                const copy = cloneWorkflowStep(step);
                                copy.id = createOptionId("workflow-step");
                                copy.name = `${step.name} copy`;
                                const index = workflow.steps.findIndex((entry) => entry.id === step.id);
                                const nextSteps = [...workflow.steps];
                                nextSteps.splice(index + 1, 0, copy);
                                emit({ ...workflow, steps: nextSteps });
                                setSelectedId(copy.id);
                              },
                            },
                            {
                              id: "delete",
                              label: "Delete",
                              icon: <TrashIcon />,
                              tone: "danger",
                              onClick: () => {
                                setSelectedId(step.id);
                                setDeleteConfirmOpen(true);
                              },
                            },
                          ]}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))
        )}
      </ul>
    </>
  );

  const previewWorkflowContent = (
    <section
      className="log-config-wf-builder__panel log-config-wf-builder__preview"
      aria-label="Preview workflow"
    >
      <div className="log-config-wf-builder__preview-header">
        <h3 className="log-config-wf-builder__panel-title">Preview Workflow</h3>
      </div>

      <WorkflowPreviewForm
        formId={formId}
        steps={workflow.steps}
        previewValues={previewValues}
        subsurfaceSettings={subsurfaceSettings}
        disabled={disabled}
        visibleStepCount={visibleStepCount}
        showPreviewValidation={showPreviewValidation}
        previewValidation={previewValidation}
        onSetPreviewValue={setPreviewValue}
        onTogglePreviewOption={togglePreviewOption}
        onManageStep={(step) => {
          if (isOriginWorkflowStep(step) && onSubsurfaceSettingsChange) {
            setManageOriginsOpen(true);
            return;
          }
          if (isRockTypeWorkflowStep(step) && onSubsurfaceSettingsChange) {
            setManageRockTypesOpen(true);
            return;
          }
          if (isNonSoilTypeWorkflowStep(step) && onSubsurfaceSettingsChange) {
            setManageNonSoilTypesOpen(true);
            return;
          }
          openStepEditor(step, "edit");
        }}
        onValidate={runPreviewValidation}
      />
    </section>
  );

  return (
    <div
      className={`log-config-wf-builder log-config-wf-builder--split${
        embedded ? " log-config-wf-builder--embedded" : ""
      }`}
    >
      {!embedded ? (
        <>
          <nav className="log-config-wf-builder__crumbs" aria-label="Breadcrumb">
            <button type="button" className="log-config-wf-builder__crumb-link" onClick={() => onBack?.()}>
              Settings
            </button>
            <span aria-hidden="true">›</span>
            <button type="button" className="log-config-wf-builder__crumb-link" onClick={() => onBack?.()}>
              Log Configurations
            </button>
            <span aria-hidden="true">›</span>
            <span className="log-config-wf-builder__crumb-current">Workflow Builder</span>
          </nav>

          <div className="log-config-wf-builder__title-row">
            <h2 className="log-config-wf-builder__title">
              Workflow Builder - {configurationName}
            </h2>
            <div className="log-config-wf-builder__title-menu">
              <TableRowActionsMenu
                label="Workflow builder menu"
                actions={[
                  {
                    id: "back",
                    label: "Back to Subsurface",
                    icon: <EditIcon />,
                    onClick: () => onBack?.(),
                  },
                  {
                    id: "add-step",
                    label: "Add step",
                    icon: <DuplicateIcon />,
                    disabled: disabled || workflow.steps.length >= WORKFLOW_STEPS_MAX_COUNT,
                    onClick: addStep,
                  },
                ]}
              />
            </div>
          </div>
        </>
      ) : null}

      <div className="log-config-wf-builder__layout">
        <section
          className="log-config-wf-builder__panel log-config-wf-builder__manage"
          aria-label="Workflow builder"
        >
          <div
            className="log-config-wf-builder__tabs"
            role="tablist"
            aria-label="Builder sections"
          >
            {BUILDER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`log-config-wf-builder__tab${activeTab === tab.id ? " is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="log-config-wf-builder__builder-body">
            {activeTab === "workflow" ? (
              manageWorkflowContent
            ) : (
              <ClassificationCodeBuilderPanel
                workflow={workflow}
                disabled={disabled}
                subsurfaceSettings={subsurfaceSettings}
                onChange={onChange}
              />
            )}
          </div>
        </section>

        {previewWorkflowContent}
      </div>

      <EditWorkflowStepDrawer
        open={Boolean(stepEditor)}
        mode={stepEditor?.mode ?? "edit"}
        step={stepEditor?.step ?? null}
        allSteps={workflow.steps}
        subsurfaceSettings={subsurfaceSettings}
        disabled={disabled}
        onClose={() => setStepEditor(null)}
        onSave={saveStep}
      />

      <ManageOriginTypesModal
        open={manageOriginsOpen}
        options={originOptions}
        onClose={() => setManageOriginsOpen(false)}
        onSave={handleSaveOrigins}
      />

      <ManageRockTypesModal
        open={manageRockTypesOpen}
        options={rockTypeOptions}
        onClose={() => setManageRockTypesOpen(false)}
        onSave={handleSaveRockTypes}
      />

      <ManageNonSoilTypesModal
        open={manageNonSoilTypesOpen}
        options={nonSoilTypeOptions}
        onClose={() => setManageNonSoilTypesOpen(false)}
        onSave={handleSaveNonSoilTypes}
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset workflow steps?"
        message="Replace all workflow steps with the production workflow template from workflow-builder-resp.sql? Custom steps and edits will be lost."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        variant="danger"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={resetToApiTemplate}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete workflow step?"
        message={
          selectedStep
            ? `Remove “${selectedStep.name}” from this workflow?`
            : "Remove this step from this workflow?"
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={deleteSelected}
      />
    </div>
  );
}
