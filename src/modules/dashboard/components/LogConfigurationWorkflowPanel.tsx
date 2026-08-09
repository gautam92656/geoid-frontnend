"use client";

import type { DragEvent } from "react";
import { useCallback, useId, useState } from "react";
import {
  ConfirmDialog,
  FormField,
  Input,
  Select,
  Toggle,
  TrashIcon,
  UiButton,
} from "@/shared/components/ui";
import {
  MODULE_OPTION_NAME_MAX_LENGTH,
  WORKFLOW_NAME_MAX_LENGTH,
  WORKFLOW_STEPS_MAX_COUNT,
  cloneModuleSettings,
  createOptionId,
  type ConfigModuleSettings,
  type WorkflowSettings,
  type WorkflowStep,
  type WorkflowStepType,
} from "../utils/configModuleSettings";

const STEP_TYPE_OPTIONS = [
  { value: "element", label: "Element" },
  { value: "variation", label: "Variation" },
] as const;

type LogConfigurationWorkflowPanelProps = Readonly<{
  moduleSettings: ConfigModuleSettings;
  disabled?: boolean;
  onChange: (moduleSettings: ConfigModuleSettings) => void;
}>;

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

export function LogConfigurationWorkflowPanel({
  moduleSettings,
  disabled,
  onChange,
}: LogConfigurationWorkflowPanelProps) {
  const formId = useId();
  const workflow = moduleSettings.workflow;
  const [selectedId, setSelectedId] = useState<string | null>(workflow.steps[0]?.id ?? null);
  const [isAdding, setIsAdding] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [typeDraft, setTypeDraft] = useState<WorkflowStepType>("element");
  const [error, setError] = useState<string | undefined>();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const selectedStep = selectedId
    ? (workflow.steps.find((step) => step.id === selectedId) ?? null)
    : null;

  const emitWorkflow = useCallback(
    (nextWorkflow: WorkflowSettings) => {
      const next = cloneModuleSettings(moduleSettings);
      next.workflow = nextWorkflow;
      onChange(next);
    },
    [moduleSettings, onChange]
  );

  const openAdd = () => {
    setIsAdding(true);
    setSelectedId(null);
    setNameDraft("");
    setTypeDraft("element");
    setError(undefined);
  };

  const openEdit = (step: WorkflowStep) => {
    setIsAdding(false);
    setSelectedId(step.id);
    setNameDraft(step.name);
    setTypeDraft(step.type);
    setError(undefined);
  };

  const saveStep = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setError("Step name is required.");
      return;
    }
    if (trimmed.length > MODULE_OPTION_NAME_MAX_LENGTH) {
      setError(`Name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`);
      return;
    }
    const duplicate = workflow.steps.some(
      (step) =>
        step.id !== (isAdding ? null : selectedId) &&
        step.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setError("A step with this name already exists.");
      return;
    }

    if (isAdding) {
      if (workflow.steps.length >= WORKFLOW_STEPS_MAX_COUNT) {
        setError(`You can add up to ${WORKFLOW_STEPS_MAX_COUNT} steps.`);
        return;
      }
      const nextStep: WorkflowStep = {
        id: createOptionId("workflow-step"),
        name: trimmed,
        type: typeDraft,
      };
      emitWorkflow({
        ...workflow,
        steps: [...workflow.steps, nextStep],
      });
      setIsAdding(false);
      setSelectedId(nextStep.id);
      setError(undefined);
      return;
    }

    if (!selectedId) return;
    emitWorkflow({
      ...workflow,
      steps: workflow.steps.map((step) =>
        step.id === selectedId ? { ...step, name: trimmed, type: typeDraft } : step
      ),
    });
    setError(undefined);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const nextSteps = workflow.steps.filter((step) => step.id !== selectedId);
    emitWorkflow({ ...workflow, steps: nextSteps });
    setDeleteConfirmOpen(false);
    setIsAdding(false);
    const nextSelected = nextSteps[0] ?? null;
    if (nextSelected) {
      openEdit(nextSelected);
    } else {
      setSelectedId(null);
      setNameDraft("");
      setTypeDraft("element");
    }
  };

  return (
    <div className="log-config-workflow">
      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header">
          <h3 className="log-config-detail__section-title">Description workflow</h3>
          <p className="log-config-detail__section-description">
            Build the ordered steps used to generate subsurface descriptions. Enable the workflow
            when logs should follow this sequence.
          </p>
        </div>

        <div className="log-config-workflow__general">
          <div className="log-config-detail__switch-row">
            <label className="log-config-detail__switch-label" htmlFor={`${formId}-enabled`}>
              Enable workflow
            </label>
            <div className="log-config-detail__switch-control">
              <Toggle
                id={`${formId}-enabled`}
                checked={workflow.enabled}
                disabled={disabled}
                onChange={(checked) => emitWorkflow({ ...workflow, enabled: checked })}
              />
            </div>
          </div>

          <FormField label="Workflow name" htmlFor={`${formId}-name`}>
            <Input
              id={`${formId}-name`}
              variant="ui"
              value={workflow.name}
              disabled={disabled}
              maxLength={WORKFLOW_NAME_MAX_LENGTH}
              onChange={(event) => emitWorkflow({ ...workflow, name: event.target.value })}
            />
          </FormField>
        </div>
      </section>

      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header log-config-detail__panel-header--row">
          <div>
            <h3 className="log-config-detail__section-title">Workflow steps</h3>
            <p className="log-config-detail__section-description">
              Drag to reorder. Element steps collect values; variation steps branch the description.
            </p>
          </div>
          <UiButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || workflow.steps.length >= WORKFLOW_STEPS_MAX_COUNT}
            onClick={openAdd}
          >
            Add step
          </UiButton>
        </div>

        <div className="log-config-workflow__layout">
          <ul className="log-config-workflow__list" aria-label="Workflow steps">
            {workflow.steps.length === 0 ? (
              <li className="log-config-workflow__empty">No steps yet. Add a step to get started.</li>
            ) : (
              workflow.steps.map((step) => (
                <li key={step.id}>
                  <div
                    className={`log-config-workflow__item${
                      selectedId === step.id && !isAdding ? " is-selected" : ""
                    }${dragOverId === step.id ? " is-drag-over" : ""}`}
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
                        emitWorkflow({
                          ...workflow,
                          steps: reorderSteps(workflow.steps, draggingId, step.id),
                        });
                      }
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                  >
                    <span className="log-config-workflow__handle" aria-hidden="true">
                      <DragHandleIcon />
                    </span>
                    <button
                      type="button"
                      className="log-config-workflow__item-button"
                      disabled={disabled}
                      onClick={() => openEdit(step)}
                    >
                      <span className="log-config-workflow__item-name">{step.name}</span>
                      <span className="log-config-workflow__item-type">{step.type}</span>
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>

          <div className="log-config-workflow__editor">
            {isAdding || selectedStep ? (
              <>
                <FormField
                  label={isAdding ? "New step name" : "Step name"}
                  htmlFor={`${formId}-step-name`}
                  error={error}
                >
                  <Input
                    id={`${formId}-step-name`}
                    variant="ui"
                    value={nameDraft}
                    disabled={disabled}
                    onChange={(event) => {
                      setNameDraft(event.target.value);
                      setError(undefined);
                    }}
                  />
                </FormField>

                <FormField label="Step type" htmlFor={`${formId}-step-type`}>
                  <Select
                    id={`${formId}-step-type`}
                    value={typeDraft}
                    disabled={disabled}
                    options={STEP_TYPE_OPTIONS}
                    onChange={(value) =>
                      setTypeDraft(value === "variation" ? "variation" : "element")
                    }
                  />
                </FormField>

                <div className="log-config-workflow__actions">
                  <UiButton
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={disabled}
                    onClick={saveStep}
                  >
                    {isAdding ? "Add" : "Update"}
                  </UiButton>
                  {!isAdding && selectedStep ? (
                    <UiButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      <TrashIcon />
                      Delete
                    </UiButton>
                  ) : null}
                  {isAdding ? (
                    <UiButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      onClick={() => {
                        setIsAdding(false);
                        setError(undefined);
                        if (workflow.steps[0]) openEdit(workflow.steps[0]);
                      }}
                    >
                      Cancel
                    </UiButton>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="log-config-workflow__hint">Select a step to edit, or add a new one.</p>
            )}
          </div>
        </div>
      </section>

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
