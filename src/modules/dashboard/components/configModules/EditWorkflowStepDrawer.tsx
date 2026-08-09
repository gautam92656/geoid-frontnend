"use client";

import type { DragEvent, FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  Checkbox,
  FormField,
  Input,
  ProjectModalPortal,
  Select,
  TrashIcon,
  UiButton,
} from "@/shared/components/ui";
import {
  MODULE_OPTION_NAME_MAX_LENGTH,
  MODULE_OPTIONS_MAX_COUNT,
  WORKFLOW_STEPS_MAX_COUNT,
  cloneWorkflowStep,
  createOptionId,
  mergeWorkflowStepOptions,
  groupWorkflowOptionsForDisplay,
  type ResolvedWorkflowOption,
  type StoredModuleSettings,
  type WorkflowStep,
  type WorkflowStepCondition,
  type WorkflowStepOption,
} from "../../utils/configModuleSettings";
import {
  CONDITION_ACTION_OPTIONS,
  MAX_OPTIONS_SELECTED_CHOICES,
  MULTIPLE_OPTIONS_CHOICES,
  WORKFLOW_INPUT_TYPE_OPTIONS,
  WORKFLOW_STEP_TYPE_OPTIONS,
  YES_NO_OPTIONS,
  applyWhenFieldChange,
  conditionUsesOriginType,
  createEmptyCondition,
  getConditionIsValueOptions,
  getDatabaseFieldSuggestions,
  getManagedOptionSetChoices,
  getWorkflowStepFieldOptions,
  normalizeConditionForSave,
  stepShowsOptionsSection,
} from "../../utils/configModules/workflowStepEditor";

type ConditionRow = WorkflowStepCondition & { id: string };

type EditWorkflowStepDrawerProps = Readonly<{
  open: boolean;
  mode: "add" | "edit";
  step: WorkflowStep | null;
  allSteps: WorkflowStep[];
  subsurfaceSettings?: StoredModuleSettings;
  disabled?: boolean;
  onClose: () => void;
  onSave: (step: WorkflowStep) => void;
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

function reorderById<T extends { id: string }>(items: T[], sourceId: string, targetId: string): T[] {
  if (sourceId === targetId) return items;
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return items;
  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function createCondition(): ConditionRow {
  return {
    id: createOptionId("workflow-condition"),
    ...createEmptyCondition(),
  };
}

function createOption(): WorkflowStepOption {
  return {
    id: createOptionId("workflow-option"),
    name: "",
    value: "",
    visible: true,
    conditions: [],
  };
}

function withConditionIds(conditions: WorkflowStepCondition[] = []): ConditionRow[] {
  return conditions.map((condition, index) => ({
    ...condition,
    id: createOptionId(`workflow-condition-${index}`),
  }));
}

function stripConditionIds(
  conditions: ConditionRow[],
  steps: WorkflowStep[]
): WorkflowStepCondition[] {
  return conditions.map(({ id: _id, ...condition }) =>
    normalizeConditionForSave(condition, steps)
  );
}

function conditionValueControl(
  condition: Pick<ConditionRow, "id" | "value" | "field" | "searchTerm" | "isOriginType">,
  formId: string,
  disabled: boolean,
  submitting: boolean,
  isValueOptions: Array<{ value: string; label: string }>,
  onChange: (value: string) => void
) {
  const stringValue =
    typeof condition.value === "boolean"
      ? condition.value
        ? "true"
        : "false"
      : String(condition.value ?? "");

  if (conditionUsesOriginType(condition) || isValueOptions.length > 0) {
    const options =
      isValueOptions.length > 0
        ? isValueOptions
        : [{ value: "", label: "Select value" }];
    const hasCurrent = options.some((entry) => entry.value === stringValue);
    return (
      <Select
        id={`${formId}-condition-value-${condition.id}`}
        value={stringValue}
        disabled={disabled || submitting}
        options={[
          { value: "", label: "Select value" },
          ...options,
          ...(!hasCurrent && stringValue
            ? [{ value: stringValue, label: stringValue }]
            : []),
        ]}
        onChange={onChange}
      />
    );
  }

  return (
    <Input
      id={`${formId}-condition-value-${condition.id}`}
      variant="ui"
      value={stringValue}
      disabled={disabled || submitting}
      placeholder="Value to match"
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function EditWorkflowStepDrawer({
  open,
  mode,
  step,
  allSteps,
  subsurfaceSettings,
  disabled,
  onClose,
  onSave,
}: EditWorkflowStepDrawerProps) {
  const formId = useId();
  const [draft, setDraft] = useState<WorkflowStep | null>(null);
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [conditionsCollapsed, setConditionsCollapsed] = useState(false);
  const [expandedOptionConditions, setExpandedOptionConditions] = useState<Record<string, boolean>>(
    {}
  );
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [draggingConditionId, setDraggingConditionId] = useState<string | null>(null);
  const [draggingOptionId, setDraggingOptionId] = useState<string | null>(null);

  const stepFieldOptions = useMemo(
    () => getWorkflowStepFieldOptions(allSteps, draft?.id),
    [allSteps, draft?.id]
  );
  const databaseFieldSuggestions = useMemo(() => getDatabaseFieldSuggestions(allSteps), [allSteps]);
  const optionSetChoices = useMemo(() => getManagedOptionSetChoices(), []);
  const showOptionsSection = draft ? stepShowsOptionsSection(draft) : false;
  const showMultipleOptionsFields = showOptionsSection && draft?.multipleOptions;
  const mergedOptions = useMemo(
    () => (draft ? mergeWorkflowStepOptions(draft, subsurfaceSettings) : []),
    [draft, subsurfaceSettings]
  );
  const linkedOptionSetLabel = useMemo(() => {
    if (!draft?.optionSet) return null;
    return optionSetChoices.find((entry) => entry.value === draft.optionSet)?.label ?? draft.optionSet;
  }, [draft?.optionSet, optionSetChoices]);
  const optionGroups = useMemo(
    () => (draft ? groupWorkflowOptionsForDisplay(mergedOptions, draft) : []),
    [draft, mergedOptions]
  );

  const resetFromStep = useCallback((nextStep: WorkflowStep) => {
    setDraft(cloneWorkflowStep(nextStep));
    setConditions(withConditionIds(nextStep.conditions ?? []));
    setConditionsCollapsed(false);
    setExpandedOptionConditions({});
    setError(undefined);
  }, []);

  useEffect(() => {
    if (!open || !step) return;
    resetFromStep(step);
  }, [open, resetFromStep, step]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onClose, open]);

  const updateDraft = (patch: Partial<WorkflowStep>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setError(undefined);
  };

  const updateOption = (optionId: string, patch: Partial<WorkflowStepOption>) => {
    setDraft((current) => {
      if (!current) return current;
      const existing = current.options ?? [];
      const index = existing.findIndex((option) => option.id === optionId);
      if (index >= 0) {
        const options = existing.map((option) =>
          option.id === optionId ? { ...option, ...patch } : option
        );
        return { ...current, options };
      }

      const merged = mergeWorkflowStepOptions(current, subsurfaceSettings).find(
        (option) => option.id === optionId
      );
      if (!merged) return current;

      return {
        ...current,
        options: [...existing, { ...merged, ...patch }],
      };
    });
  };

  const syncOptionsFromManagedSet = () => {
    if (!draft?.optionSet) return;
    setDraft((current) => {
      if (!current) return current;
      const merged = mergeWorkflowStepOptions(
        { ...current, options: [] },
        subsurfaceSettings
      );
      const existing = current.options ?? [];
      const byKey = new Map(
        existing.map((option) => [
          (option.value || option.name).trim().toLowerCase(),
          option,
        ])
      );

      const options = merged.map((option) => {
        const key = (option.value || option.name).trim().toLowerCase();
        const override = byKey.get(key);
        return override ? { ...option, ...override, id: option.id } : option;
      });

      return { ...current, options };
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || submitting || disabled) return;

    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      setError("Step name is required.");
      return;
    }
    if (trimmedName.length > MODULE_OPTION_NAME_MAX_LENGTH) {
      setError(`Step name must be ${MODULE_OPTION_NAME_MAX_LENGTH} characters or fewer.`);
      return;
    }

    const duplicate = allSteps.some(
      (entry) =>
        entry.id !== draft.id && entry.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      setError("A step with this name already exists.");
      return;
    }

    if (mode === "add" && allSteps.length >= WORKFLOW_STEPS_MAX_COUNT) {
      setError(`You can add up to ${WORKFLOW_STEPS_MAX_COUNT} steps.`);
      return;
    }

    setSubmitting(true);
    try {
      onSave({
        ...draft,
        name: trimmedName,
        fieldName: draft.fieldName?.trim() || trimmedName,
        conditionsOperator: draft.conditionsOperator ?? "OR",
        conditions: stripConditionIds(conditions, allSteps),
        options: mergedOptions.map((option) => {
          const saved = (draft.options ?? []).find((entry) => entry.id === option.id);
          const source = saved ?? option;
          return {
            ...source,
            name: source.name.trim(),
            value: source.value.trim() || source.name.trim(),
            conditions: source.conditions?.map((condition) =>
              normalizeConditionForSave(condition, allSteps)
            ),
          };
        }),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!draft) return null;

  const title = mode === "add" ? "Add Step" : `Edit Step: ${draft.name}`;

  return (
    <ProjectModalPortal open={open}>
      <div className="log-config-wf-step-drawer" role="presentation">
        <button
          type="button"
          className="log-config-wf-step-drawer__backdrop"
          aria-label="Close edit step drawer"
          onClick={onClose}
        />

        <aside
          className="log-config-wf-step-drawer__panel ui-scrollbar"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-title`}
        >
          <form id={formId} className="log-config-wf-step-drawer__form" onSubmit={handleSubmit}>
            <header className="log-config-wf-step-drawer__intro">
              <h2 id={`${formId}-title`} className="log-config-wf-step-drawer__title">
                {title}
              </h2>
              <p className="log-config-wf-step-drawer__description">
                Configure how this workflow step behaves, when it appears, and which options are
                available to loggers.
              </p>
            </header>

            <div className="log-config-wf-step-drawer__card">
              <div className="log-config-wf-step-drawer__section-head">
                <p className="log-config-wf-step-drawer__section-title">Step information</p>
                <p className="log-config-wf-step-drawer__section-description">
                   make big account
                  changes here
                </p>
              </div>

              <div className="log-config-wf-step-drawer__section-body">
                <FormField label="Display name" htmlFor={`${formId}-name`} error={error}>
                  <Input
                    id={`${formId}-name`}
                    variant="ui"
                    value={draft.name}
                    disabled={disabled || submitting}
                    onChange={(event) => updateDraft({ name: event.target.value })}
                  />
                </FormField>

                <FormField label="Field name" htmlFor={`${formId}-field-name`}>
                  <Input
                    id={`${formId}-field-name`}
                    variant="ui"
                    placeholder="Canonical field label used in conditions"
                    value={draft.fieldName ?? ""}
                    disabled={disabled || submitting}
                    onChange={(event) => updateDraft({ fieldName: event.target.value })}
                  />
                </FormField>

                <FormField label="Field type" htmlFor={`${formId}-input-type`}>
                  <Select
                    id={`${formId}-input-type`}
                    value={draft.inputType ?? "text"}
                    disabled={disabled || submitting}
                    options={WORKFLOW_INPUT_TYPE_OPTIONS}
                    onChange={(value) =>
                      updateDraft({
                        inputType: value as WorkflowStep["inputType"],
                        multipleOptions: value === "options" ? draft.multipleOptions : undefined,
                      })
                    }
                  />
                </FormField>

                <FormField label="Workflow step category" htmlFor={`${formId}-step-type`}>
                  <Select
                    id={`${formId}-step-type`}
                    value={draft.type}
                    disabled={disabled || submitting}
                    options={WORKFLOW_STEP_TYPE_OPTIONS}
                    onChange={(value) =>
                      updateDraft({ type: value === "variation" ? "variation" : "element" })
                    }
                  />
                </FormField>

                {showOptionsSection ? (
                  <>
                    <FormField label="Multiple Options allowed?" htmlFor={`${formId}-multiple`}>
                      <Select
                        id={`${formId}-multiple`}
                        value={draft.multipleOptions ? "multiple" : "single"}
                        disabled={disabled || submitting}
                        options={MULTIPLE_OPTIONS_CHOICES}
                        onChange={(value) =>
                          updateDraft({
                            multipleOptions: value === "multiple",
                            maxOptionsSelected:
                              value === "multiple" ? (draft.maxOptionsSelected ?? 3) : undefined,
                          })
                        }
                      />
                    </FormField>

                    {showMultipleOptionsFields ? (
                      <FormField
                        label="Max. options allowed to be selected?"
                        htmlFor={`${formId}-max-options`}
                      >
                        <Select
                          id={`${formId}-max-options`}
                          value={String(draft.maxOptionsSelected ?? 3)}
                          disabled={disabled || submitting}
                          options={MAX_OPTIONS_SELECTED_CHOICES.map((count) => ({
                            value: String(count),
                            label: String(count),
                          }))}
                          onChange={(value) =>
                            updateDraft({ maxOptionsSelected: Number.parseInt(value, 10) || 1 })
                          }
                        />
                      </FormField>
                    ) : null}
                  </>
                ) : null}

                {/* <FormField label="Database Field" htmlFor={`${formId}-database-field`}>
                  <Input
                    id={`${formId}-database-field`}
                    variant="ui"
                    list={`${formId}-database-field-suggestions`}
                    placeholder="Search database field"
                    value={draft.databaseField ?? ""}
                    disabled={disabled || submitting}
                    onChange={(event) => updateDraft({ databaseField: event.target.value })}
                  />
                  <datalist id={`${formId}-database-field-suggestions`}>
                    {databaseFieldSuggestions.map((field) => (
                      <option key={field} value={field} />
                    ))}
                  </datalist>
                </FormField> */}

                <FormField label="Step Required?" htmlFor={`${formId}-required`}>
                  <Select
                    id={`${formId}-required`}
                    value={draft.required ? "yes" : "no"}
                    disabled={disabled || submitting}
                    options={YES_NO_OPTIONS}
                    onChange={(value) => updateDraft({ required: value === "yes" })}
                  />
                </FormField>

                {showOptionsSection ? (
                  <FormField
                    label="Other free text option allowed?"
                    htmlFor={`${formId}-free-text`}
                  >
                    <Select
                      id={`${formId}-free-text`}
                      value={
                        draft.allowFreeText === true
                          ? "yes"
                          : draft.allowFreeText === false
                            ? "no"
                            : ""
                      }
                      disabled={disabled || submitting}
                      options={[{ value: "", label: "Select" }, ...YES_NO_OPTIONS]}
                      onChange={(value) =>
                        updateDraft({
                          allowFreeText: value === "yes" ? true : value === "no" ? false : undefined,
                        })
                      }
                    />
                  </FormField>
                ) : null}
              </div>

              {/* <div className="log-config-wf-step-drawer__section-head">
                <p className="log-config-wf-step-drawer__section-title">Conditions</p>
                <p className="log-config-wf-step-drawer__section-description">
                  Control when this step is shown, hidden, enabled, or disabled.{" "}
                  <strong>When</strong> picks another step; <strong>Is</strong> is the value that
                  step must have; <strong>Action</strong> is applied when it matches. Multiple Show
                  rules use the operator below (default OR). Hide / Disable always win when they
                  match. Enable / Disable do not change visibility.
                </p>
              </div> */}

              <div className="log-config-wf-step-drawer__section-body">
                <div className="log-config-wf-step-drawer__conditions-toolbar">
                  <Select
                    id={`${formId}-conditions-operator`}
                    value={draft.conditionsOperator ?? "OR"}
                    disabled={disabled || submitting}
                    options={[
                      { value: "OR", label: "OR (any Show matches)" },
                      { value: "AND", label: "AND (all Show match)" },
                    ]}
                    onChange={(value) =>
                      updateDraft({ conditionsOperator: value === "AND" ? "AND" : "OR" })
                    }
                  />
                  <UiButton
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={disabled || submitting}
                    onClick={() => setConditions((current) => [...current, createCondition()])}
                  >
                    Condition
                  </UiButton>
                  <UiButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={disabled || submitting}
                    onClick={() => setConditionsCollapsed((current) => !current)}
                  >
                    {conditionsCollapsed ? "Expand" : "Collapse"}
                  </UiButton>
                </div>

                {!conditionsCollapsed ? (
                  <ul className="log-config-wf-step-drawer__condition-list">
                    {conditions.length === 0 ? (
                      <li className="log-config-wf-step-drawer__empty">
                        No conditions yet. Add a condition to control when this step is shown.
                      </li>
                    ) : (
                      conditions.map((condition) => {
                        const isValueOptions = getConditionIsValueOptions(
                          allSteps,
                          condition,
                          subsurfaceSettings
                        );
                        return (
                          <li
                            key={condition.id}
                            className={`log-config-wf-step-drawer__condition-row${
                              draggingConditionId === condition.id ? " is-dragging" : ""
                            }`}
                            draggable={!disabled}
                            onDragStart={() => setDraggingConditionId(condition.id)}
                            onDragEnd={() => setDraggingConditionId(null)}
                            onDragOver={(event: DragEvent<HTMLLIElement>) => event.preventDefault()}
                            onDrop={(event: DragEvent<HTMLLIElement>) => {
                              event.preventDefault();
                              if (draggingConditionId) {
                                setConditions((current) =>
                                  reorderById(current, draggingConditionId, condition.id)
                                );
                              }
                              setDraggingConditionId(null);
                            }}
                          >
                            <span className="log-config-wf-step-drawer__handle" aria-hidden="true">
                              <DragHandleIcon />
                            </span>
                            <FormField
                              label="When Step"
                              htmlFor={`${formId}-condition-field-${condition.id}`}
                            >
                              <Select
                                id={`${formId}-condition-field-${condition.id}`}
                                value={condition.field}
                                disabled={disabled || submitting}
                                options={[
                                  { value: "", label: "Search step" },
                                  ...stepFieldOptions,
                                  ...(condition.field &&
                                  !stepFieldOptions.some((entry) => entry.value === condition.field)
                                    ? [{ value: condition.field, label: condition.field }]
                                    : []),
                                ]}
                                onChange={(value) =>
                                  setConditions((current) =>
                                    current.map((entry) =>
                                      entry.id === condition.id
                                        ? {
                                            ...entry,
                                            ...applyWhenFieldChange(entry, value, allSteps),
                                          }
                                        : entry
                                    )
                                  )
                                }
                              />
                            </FormField>
                            <FormField
                              label="Is Value"
                              htmlFor={`${formId}-condition-value-${condition.id}`}
                            >
                              {conditionValueControl(
                                condition,
                                formId,
                                Boolean(disabled),
                                submitting,
                                isValueOptions,
                                (value) =>
                                  setConditions((current) =>
                                    current.map((entry) =>
                                      entry.id === condition.id ? { ...entry, value } : entry
                                    )
                                  )
                              )}
                            </FormField>
                            <FormField
                              label="Action"
                              htmlFor={`${formId}-condition-action-${condition.id}`}
                            >
                              <Select
                                id={`${formId}-condition-action-${condition.id}`}
                                value={condition.type}
                                disabled={disabled || submitting}
                                options={CONDITION_ACTION_OPTIONS}
                                onChange={(value) =>
                                  setConditions((current) =>
                                    current.map((entry) =>
                                      entry.id === condition.id
                                        ? {
                                            ...entry,
                                            type: value as WorkflowStepCondition["type"],
                                          }
                                        : entry
                                    )
                                  )
                                }
                              />
                            </FormField>
                            <UiButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="log-config-wf-step-drawer__remove-btn"
                              disabled={disabled || submitting}
                              onClick={() =>
                                setConditions((current) =>
                                  current.filter((entry) => entry.id !== condition.id)
                                )
                              }
                            >
                              <TrashIcon />
                            </UiButton>
                          </li>
                        );
                      })
                    )}
                  </ul>
                ) : null}
              </div>

              {showOptionsSection ? (
                <>
                  <div className="log-config-wf-step-drawer__section-head">
                    <p className="log-config-wf-step-drawer__section-title">Options</p>
                    <p className="log-config-wf-step-drawer__section-description">
                      Configure the options that are available to select. You can also add
                      conditions to each option to determine if they are visible or hidden.
                    </p>
                  </div>

                  <div className="log-config-wf-step-drawer__section-body">
                    <FormField
                      label="Link to Managed Option Set?"
                      htmlFor={`${formId}-option-set`}
                    >
                      <Select
                        id={`${formId}-option-set`}
                        value={draft.optionSet ?? ""}
                        disabled={disabled || submitting}
                        options={optionSetChoices}
                        onChange={(value) =>
                          updateDraft({ optionSet: value || null, options: draft.options ?? [] })
                        }
                      />
                    </FormField>
                    <p className="log-config-wf-step-drawer__hint">
                      {linkedOptionSetLabel
                        ? `Linked to ${linkedOptionSetLabel}. Options are loaded from the module data type. Override visibility, groups, abbreviations, and conditions below.`
                        : "Option Sets contain more advanced functionality and are managed separately. They allow users to add / edit options, and also include other data such as graphics."}
                    </p>
                    {draft.optionSet ? (
                      <div className="log-config-wf-step-drawer__options-toolbar">
                        <UiButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={disabled || submitting}
                          onClick={syncOptionsFromManagedSet}
                        >
                          Sync from managed set
                        </UiButton>
                      </div>
                    ) : null}
                  </div>

                  <div className="log-config-wf-step-drawer__options-list-wrap">
                    {optionGroups.map((group) => (
                      <div key={group.label || "default"} className="log-config-wf-step-drawer__option-group">
                        {group.label ? (
                          <p className="log-config-wf-step-drawer__option-group-label">{group.label}</p>
                        ) : null}
                        <ul className="log-config-wf-step-drawer__options-list">
                          {group.options.map((option) => {
                            const saved = (draft.options ?? []).find((entry) => entry.id === option.id);
                            const displayOption: ResolvedWorkflowOption = saved
                              ? { ...option, ...saved }
                              : option;
                            const optionConditions = displayOption.conditions ?? [];
                            const showOptionConditions =
                              expandedOptionConditions[displayOption.id] ?? false;
                            const isManaged = Boolean(displayOption.fromManagedSet);

                            return (
                              <li
                                key={displayOption.id}
                                className="log-config-wf-step-drawer__option-block"
                                draggable={!disabled && !isManaged}
                                onDragStart={() => setDraggingOptionId(displayOption.id)}
                                onDragEnd={() => setDraggingOptionId(null)}
                                onDragOver={(event: DragEvent<HTMLLIElement>) =>
                                  event.preventDefault()
                                }
                                onDrop={(event: DragEvent<HTMLLIElement>) => {
                                  event.preventDefault();
                                  if (!draggingOptionId || isManaged || !draft.options) return;
                                  updateDraft({
                                    options: reorderById(draft.options, draggingOptionId, displayOption.id),
                                  });
                                  setDraggingOptionId(null);
                                }}
                              >
                                <div className="log-config-wf-step-drawer__option-row">
                                  {!isManaged ? (
                                    <span
                                      className="log-config-wf-step-drawer__handle"
                                      aria-hidden="true"
                                    >
                                      <DragHandleIcon />
                                    </span>
                                  ) : (
                                    <span
                                      className="log-config-wf-step-drawer__managed-badge"
                                      title="Managed option"
                                    >
                                      Managed
                                    </span>
                                  )}
                                  <FormField
                                    label="Option Name"
                                    htmlFor={`${formId}-option-name-${displayOption.id}`}
                                  >
                                    <Input
                                      id={`${formId}-option-name-${displayOption.id}`}
                                      variant="ui"
                                      value={displayOption.name}
                                      disabled={disabled || submitting || isManaged}
                                      onChange={(event) =>
                                        updateOption(displayOption.id, { name: event.target.value })
                                      }
                                    />
                                  </FormField>
                                  <FormField
                                    label="Group"
                                    htmlFor={`${formId}-option-group-${displayOption.id}`}
                                  >
                                    <Input
                                      id={`${formId}-option-group-${displayOption.id}`}
                                      variant="ui"
                                      placeholder="Soil, Rock, Non-Soil"
                                      value={displayOption.group ?? ""}
                                      disabled={disabled || submitting}
                                      onChange={(event) =>
                                        updateOption(displayOption.id, { group: event.target.value })
                                      }
                                    />
                                  </FormField>
                                  <FormField
                                    label="Option Abbreviation"
                                    htmlFor={`${formId}-option-abbr-${displayOption.id}`}
                                  >
                                    <Input
                                      id={`${formId}-option-abbr-${displayOption.id}`}
                                      variant="ui"
                                      value={displayOption.abbreviation ?? ""}
                                      disabled={disabled || submitting}
                                      onChange={(event) =>
                                        updateOption(displayOption.id, {
                                          abbreviation: event.target.value,
                                        })
                                      }
                                    />
                                  </FormField>
                                  <div className="log-config-wf-step-drawer__default-option">
                                    <span className="log-config-wf-step-drawer__default-label">
                                      Default
                                    </span>
                                    <Checkbox
                                      id={`${formId}-option-default-${displayOption.id}`}
                                      checked={Boolean(displayOption.isDefault)}
                                      disabled={disabled || submitting}
                                      onChange={(event) =>
                                        updateOption(displayOption.id, {
                                          isDefault: event.target.checked,
                                        })
                                      }
                                    />
                                  </div>
                                  <UiButton
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={disabled || submitting}
                                    onClick={() =>
                                      setExpandedOptionConditions((current) => ({
                                        ...current,
                                        [displayOption.id]: !showOptionConditions,
                                      }))
                                    }
                                  >
                                    {showOptionConditions ? "Hide Conditions" : "Show Conditions"}
                                  </UiButton>
                                  {!isManaged ? (
                                    <UiButton
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      disabled={disabled || submitting}
                                      onClick={() =>
                                        updateDraft({
                                          options: (draft.options ?? []).filter(
                                            (entry) => entry.id !== displayOption.id
                                          ),
                                        })
                                      }
                                    >
                                      Remove
                                    </UiButton>
                                  ) : null}
                                </div>

                                {showOptionConditions ? (
                                  <div className="log-config-wf-step-drawer__option-conditions">
                                    {optionConditions.map((optionCondition, index) => {
                                      const optionIsValueOptions = getConditionIsValueOptions(
                                        allSteps,
                                        optionCondition,
                                        subsurfaceSettings
                                      );
                                      return (
                                      <div
                                        key={`${displayOption.id}-condition-${index}`}
                                        className="log-config-wf-step-drawer__option-condition-row"
                                      >
                                        <FormField label="When Step">
                                          <Select
                                            value={optionCondition.field}
                                            disabled={disabled || submitting}
                                            options={[
                                              { value: "", label: "Search step" },
                                              ...stepFieldOptions,
                                              ...(optionCondition.field &&
                                              !stepFieldOptions.some(
                                                (entry) => entry.value === optionCondition.field
                                              )
                                                ? [
                                                    {
                                                      value: optionCondition.field,
                                                      label: optionCondition.field,
                                                    },
                                                  ]
                                                : []),
                                            ]}
                                            onChange={(value) =>
                                              updateOption(displayOption.id, {
                                                conditions: optionConditions.map(
                                                  (entry, entryIndex) =>
                                                    entryIndex === index
                                                      ? applyWhenFieldChange(entry, value, allSteps)
                                                      : entry
                                                ),
                                              })
                                            }
                                          />
                                        </FormField>
                                        <FormField label="Is Value">
                                          {conditionValueControl(
                                            {
                                              id: `${displayOption.id}-${index}`,
                                              value: optionCondition.value,
                                              field: optionCondition.field,
                                              searchTerm: optionCondition.searchTerm,
                                              isOriginType: optionCondition.isOriginType,
                                            },
                                            formId,
                                            Boolean(disabled),
                                            submitting,
                                            optionIsValueOptions,
                                            (value) =>
                                              updateOption(displayOption.id, {
                                                conditions: optionConditions.map(
                                                  (entry, entryIndex) =>
                                                    entryIndex === index
                                                      ? { ...entry, value }
                                                      : entry
                                                ),
                                              })
                                          )}
                                        </FormField>
                                        <FormField label="Action">
                                          <Select
                                            value={optionCondition.type}
                                            disabled={disabled || submitting}
                                            options={CONDITION_ACTION_OPTIONS}
                                            onChange={(value) =>
                                              updateOption(displayOption.id, {
                                                conditions: optionConditions.map(
                                                  (entry, entryIndex) =>
                                                    entryIndex === index
                                                      ? {
                                                          ...entry,
                                                          type: value as WorkflowStepCondition["type"],
                                                        }
                                                      : entry
                                                ),
                                              })
                                            }
                                          />
                                        </FormField>
                                        <UiButton
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          disabled={disabled || submitting}
                                          onClick={() =>
                                            updateOption(displayOption.id, {
                                              conditions: optionConditions.filter(
                                                (_, entryIndex) => entryIndex !== index
                                              ),
                                            })
                                          }
                                        >
                                          Remove Condition
                                        </UiButton>
                                      </div>
                                      );
                                    })}
                                    <UiButton
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      disabled={disabled || submitting}
                                      onClick={() =>
                                        updateOption(displayOption.id, {
                                          conditions: [
                                            ...optionConditions,
                                            createEmptyCondition(),
                                          ],
                                        })
                                      }
                                    >
                                      Add Condition for Option
                                    </UiButton>
                                  </div>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}

                    {!draft.optionSet ? (
                      <div className="log-config-wf-step-drawer__add-option">
                        <UiButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={
                            disabled ||
                            submitting ||
                            (draft.options?.length ?? 0) >= MODULE_OPTIONS_MAX_COUNT
                          }
                          onClick={() =>
                            updateDraft({
                              options: [...(draft.options ?? []), createOption()],
                            })
                          }
                        >
                          Add Option
                        </UiButton>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {/* <div className="log-config-wf-step-drawer__section-body log-config-wf-step-drawer__instructions">
                <p className="log-config-wf-step-drawer__section-title">Step Information</p>
                <p className="log-config-wf-step-drawer__section-description">
                  You can use the below rich text to build out instructions for how to log something
                  inside your workflow. This may be used for multiple choice options to indicate the
                  relevant standards citing choice or your companies specific standards.
                </p>
                <FormField label="Instructions" htmlFor={`${formId}-instructions`}>
                  <textarea
                    id={`${formId}-instructions`}
                    className="ui-textarea log-config-wf-step-drawer__instructions-input"
                    rows={6}
                    placeholder="Insert text here ..."
                    value={draft.instructions ?? ""}
                    disabled={disabled || submitting}
                    onChange={(event) => updateDraft({ instructions: event.target.value })}
                  />
                </FormField>
              </div> */}
            </div>

            <footer className="log-config-wf-step-drawer__footer">
              <UiButton
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={onClose}
              >
                Cancel
              </UiButton>
              <UiButton type="submit" variant="primary" disabled={disabled || submitting}>
                Save
              </UiButton>
            </footer>
          </form>
        </aside>
      </div>
    </ProjectModalPortal>
  );
}
