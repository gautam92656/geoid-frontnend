"use client";

import { useMemo, useState } from "react";
import { Checkbox, Input, UiButton } from "@/shared/components/ui";
import {
  groupWorkflowOptionsForDisplay,
  mergeWorkflowStepOptions,
  getWorkflowStepPreviewLabel,
  isWorkflowStepDisabled,
  isWorkflowStepVisible,
  isWorkflowOptionDisabled,
  isWorkflowOptionVisible,
  type ResolvedWorkflowOption,
  type StoredModuleSettings,
  type WorkflowPreviewValidationResult,
  type WorkflowPreviewValues,
  type WorkflowStep,
} from "../../utils/configModuleSettings";

type WorkflowPreviewFormProps = Readonly<{
  formId: string;
  steps: WorkflowStep[];
  previewValues: WorkflowPreviewValues;
  subsurfaceSettings?: StoredModuleSettings;
  disabled?: boolean;
  visibleStepCount: number;
  showPreviewValidation: boolean;
  previewValidation: WorkflowPreviewValidationResult;
  /** When false, hides the bottom validate bar (entry modals). Defaults to true. */
  showValidationBar?: boolean;
  /** "entry" hides preview-only hints such as As above. Defaults to "preview". */
  variant?: "preview" | "entry";
  onSetPreviewValue: (key: string, value: string | boolean | string[] | null) => void;
  onTogglePreviewOption: (
    key: string,
    optionValue: string,
    multiple: boolean,
    maxSelected?: number
  ) => void;
  onManageStep: (step: WorkflowStep) => void;
  onValidate: () => void;
}>;

const COLOR_SWATCHES: Record<string, string> = {
  brown: "#8B4513",
  yellow: "#EAB308",
  orange: "#F97316",
  grey: "#9CA3AF",
  gray: "#9CA3AF",
  black: "#111827",
  white: "#F9FAFB",
  red: "#DC2626",
  green: "#16A34A",
  blue: "#2563EB",
  pink: "#EC4899",
  purple: "#9333EA",
};

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function stepKey(step: WorkflowStep): string {
  return step.fieldName?.trim() || step.name.trim();
}

function readPreviewSelection(previewValues: WorkflowPreviewValues, key: string): string[] {
  const raw = previewValues[key];
  if (Array.isArray(raw)) {
    return raw.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
    );
  }
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

function resolvePreviewOptions(
  step: WorkflowStep,
  steps: readonly WorkflowStep[],
  previewValues: WorkflowPreviewValues,
  subsurfaceSettings?: StoredModuleSettings
): ResolvedWorkflowOption[] {
  return mergeWorkflowStepOptions(step, subsurfaceSettings).filter((option) =>
    isWorkflowOptionVisible(option, steps, previewValues)
  );
}

function filterOptionsBySearch(
  options: readonly ResolvedWorkflowOption[],
  query: string
): ResolvedWorkflowOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...options];
  return options.filter((option) => {
    const haystack = `${option.name} ${option.value} ${option.group ?? ""}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

function colorSwatchForOption(option: ResolvedWorkflowOption): string | undefined {
  if (typeof option.color === "string" && option.color.trim()) {
    return option.color.trim();
  }
  const key = (option.value || option.name).trim().toLowerCase();
  return COLOR_SWATCHES[key];
}

function normalizeStepLabel(step: WorkflowStep): string {
  return (step.fieldName?.trim() || step.name.trim()).toLowerCase();
}

function stepSupportsManage(step: WorkflowStep): boolean {
  const label = normalizeStepLabel(step);
  const optionSet = step.optionSet?.trim().toLowerCase() ?? "";
  const databaseField = step.databaseField?.trim().toLowerCase() ?? "";

  if (optionSet === "origin" || label === "origin") return true;
  if (
    optionSet === "rock_type" ||
    databaseField === "rock_type" ||
    label === "rock type"
  ) {
    return true;
  }
  if (
    optionSet === "non_soil_type" ||
    databaseField === "non_soil_type" ||
    databaseField === "pavement_type" ||
    label === "non-soil type" ||
    label === "non soil type"
  ) {
    return true;
  }
  if (
    optionSet === "soil_type" ||
    databaseField === "soil_type" ||
    label === "soil type"
  ) {
    return true;
  }

  return false;
}

function renderFieldLabel(label: string, required?: boolean) {
  return (
    <span className="log-config-wf-builder__preview-label">
      {label}
      {required ? (
        <span className="log-config-wf-builder__required" aria-hidden="true">
          {" "}
          *
        </span>
      ) : null}
    </span>
  );
}

export function WorkflowPreviewForm({
  formId,
  steps,
  previewValues,
  subsurfaceSettings,
  disabled,
  visibleStepCount,
  showPreviewValidation,
  previewValidation,
  showValidationBar = true,
  variant = "preview",
  onSetPreviewValue,
  onTogglePreviewOption,
  onManageStep,
  onValidate,
}: WorkflowPreviewFormProps) {
  const [optionSearch, setOptionSearch] = useState<Record<string, string>>({});

  const stepsForConditions = useMemo(
    () =>
      steps.map((step) => {
        const merged = mergeWorkflowStepOptions(step, subsurfaceSettings);
        if (merged.length === 0) return step;
        return { ...step, options: merged };
      }),
    [steps, subsurfaceSettings]
  );

  const visibleSteps = useMemo(
    () =>
      stepsForConditions.filter((step) =>
        isWorkflowStepVisible(step, stepsForConditions, previewValues)
      ),
    [previewValues, stepsForConditions]
  );

  const renderOptionChip = (
    step: WorkflowStep,
    option: ResolvedWorkflowOption,
    selected: string[],
    inputDisabled: boolean,
    allowsMultiple: boolean,
    showSwatch: boolean
  ) => {
    const sourceOption =
      (step.options ?? []).find(
        (entry) =>
          entry.id === option.id ||
          entry.value === option.value ||
          entry.name === option.name
      ) ?? option;
    const optionDisabled =
      inputDisabled ||
      isWorkflowOptionDisabled(sourceOption, stepsForConditions, previewValues);
    const isActive = selected.includes(option.value) || selected.includes(option.name);
    const swatch = showSwatch ? colorSwatchForOption(option) : undefined;

    return (
      <button
        key={option.id}
        type="button"
        role="option"
        aria-selected={isActive}
        className={`log-config-wf-builder__chip${isActive ? " is-selected" : ""}${
          swatch ? " has-swatch" : ""
        }`}
        disabled={optionDisabled}
        onClick={() =>
          onTogglePreviewOption(
            stepKey(step),
            option.value,
            allowsMultiple,
            step.maxOptionsSelected
          )
        }
      >
        {swatch ? (
          <span
            className="log-config-wf-builder__chip-swatch"
            style={{ backgroundColor: swatch }}
            aria-hidden="true"
          />
        ) : null}
        <span className="log-config-wf-builder__chip-label">{option.name}</span>
      </button>
    );
  };

  const renderOptionsField = (
    step: WorkflowStep,
    label: string,
    fieldError: string | undefined,
    inputDisabled: boolean,
    showSwatch = false
  ) => {
    const key = stepKey(step);
    const options = resolvePreviewOptions(
      step,
      stepsForConditions,
      previewValues,
      subsurfaceSettings
    );
    const searchQuery = optionSearch[step.id] ?? "";
    const filteredOptions = filterOptionsBySearch(options, searchQuery);
    const selected = readPreviewSelection(previewValues, key);
    const allowsMultiple = Boolean(step.multipleOptions);
    const optionGroups = groupWorkflowOptionsForDisplay(filteredOptions, step);
    const hasGroupedLayout =
      optionGroups.length > 1 || Boolean(optionGroups[0]?.label?.trim());
    const showSearch = options.length >= 8 || step.optionSet === "origin";

    return (
      <div
        key={step.id}
        className={`log-config-wf-builder__preview-field-card${fieldError ? " has-error" : ""}`}
      >
        <div className="log-config-wf-builder__preview-field-head">
          <div className="log-config-wf-builder__preview-field-title">
            {renderFieldLabel(label, step.required)}
            {allowsMultiple && selected.length > 0 ? (
              <span className="log-config-wf-builder__selection-count">
                {selected.length}
                {step.maxOptionsSelected ? ` / ${step.maxOptionsSelected}` : ""} selected
              </span>
            ) : null}
          </div>
          {stepSupportsManage(step) ? (
            <UiButton
              type="button"
              variant="primary"
              size="sm"
              className=""
              disabled={inputDisabled || disabled}
              onClick={() => onManageStep(step)}
            >
              Manage
            </UiButton>
          ) : null}
        </div>

        <div className="log-config-wf-builder__preview-field-body">
          {allowsMultiple && step.maxOptionsSelected ? (
            <p className="log-config-wf-builder__preview-hint">
              Select up to {step.maxOptionsSelected} options.
            </p>
          ) : null}

          {showSearch ? (
            <div className="log-config-wf-builder__option-search">
              <span className="log-config-wf-builder__option-search-icon" aria-hidden="true">
                <SearchIcon />
              </span>
              <Input
                variant="ui"
                value={searchQuery}
                disabled={inputDisabled || disabled}
                placeholder={`Search ${label.toLowerCase()} options`}
                aria-label={`Search ${label} options`}
                onChange={(event) =>
                  setOptionSearch((current) => ({
                    ...current,
                    [step.id]: event.target.value,
                  }))
                }
              />
            </div>
          ) : null}

          {filteredOptions.length === 0 ? (
            <p className="log-config-wf-builder__preview-hint">
              {searchQuery.trim()
                ? "No options match your search."
                : "No options are available for the current selections."}
            </p>
          ) : hasGroupedLayout ? (
            <div
              className="log-config-wf-builder__option-groups log-config-wf-builder__option-groups--scroll"
              role="listbox"
              aria-label={label}
              aria-multiselectable={allowsMultiple || undefined}
            >
              {optionGroups.map((group) => (
                <div
                  key={group.label || "default"}
                  className="log-config-wf-builder__option-group-panel"
                >
                  {group.label ? (
                    <div className="log-config-wf-builder__option-group-label">{group.label}</div>
                  ) : null}
                  <div className="log-config-wf-builder__chips">
                    {group.options.map((option) =>
                      renderOptionChip(
                        step,
                        option,
                        selected,
                        inputDisabled,
                        allowsMultiple,
                        showSwatch
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`log-config-wf-builder__chips${
                filteredOptions.length >= 12 ? " log-config-wf-builder__chips--scroll" : ""
              }`}
              role="listbox"
              aria-label={label}
              aria-multiselectable={allowsMultiple || undefined}
            >
              {filteredOptions.map((option) =>
                renderOptionChip(
                  step,
                  option,
                  selected,
                  inputDisabled,
                  allowsMultiple,
                  showSwatch
                )
              )}
            </div>
          )}
        </div>

        {fieldError ? <p className="log-config-wf-builder__field-error">{fieldError}</p> : null}
      </div>
    );
  };

  const renderStepField = (step: WorkflowStep) => {
    const key = stepKey(step);
    const label = getWorkflowStepPreviewLabel(step);
    const fieldError = showPreviewValidation ? previewValidation.errors[key] : undefined;
    const inputDisabled =
      disabled || isWorkflowStepDisabled(step, stepsForConditions, previewValues);
    const inputType = step.inputType ?? "text";

    if (inputType === "checkbox") {
      const isAsAbove = key.toLowerCase() === "as above";
      return (
        <div
          key={step.id}
          className={`log-config-wf-builder__preview-field-card log-config-wf-builder__preview-field-card--checkbox${
            fieldError ? " has-error" : ""
          }`}
        >
          <div className="log-config-wf-builder__checkbox-row">
            <Checkbox
              id={`${formId}-${step.id}`}
              checked={Boolean(previewValues[key])}
              disabled={inputDisabled}
              onChange={(event) => onSetPreviewValue(key, event.target.checked)}
            />
            <label className="log-config-wf-builder__preview-label" htmlFor={`${formId}-${step.id}`}>
              {label}
              {isAsAbove && variant === "preview" ? (
                <span className="log-config-wf-builder__preview-hint">
                  {" "}
                  (As above doesn&apos;t work in preview as there is no workflow above to apply)
                </span>
              ) : null}
            </label>
          </div>
          {fieldError ? <p className="log-config-wf-builder__field-error">{fieldError}</p> : null}
        </div>
      );
    }

    if (inputType === "options") {
      return renderOptionsField(step, label, fieldError, inputDisabled);
    }

    if (inputType === "color") {
      const colorOptions = resolvePreviewOptions(
        step,
        stepsForConditions,
        previewValues,
        subsurfaceSettings
      );
      if (colorOptions.length > 0) {
        return renderOptionsField(step, label, fieldError, inputDisabled, true);
      }

      return (
        <div
          key={step.id}
          className={`log-config-wf-builder__preview-field-card${fieldError ? " has-error" : ""}`}
        >
          <div className="log-config-wf-builder__preview-field-head">
            {renderFieldLabel(label, step.required)}
            {stepSupportsManage(step) ? (
              <UiButton
                type="button"
                variant="primary"
                size="sm"
                className=""
                disabled={inputDisabled || disabled}
                onClick={() => onManageStep(step)}
              >
                Manage
              </UiButton>
            ) : null}
          </div>
          <div className="log-config-wf-builder__preview-field-body">
            <Input
              id={`${formId}-${step.id}`}
              variant="ui"
              type="text"
              disabled={inputDisabled}
              placeholder="Select or enter a colour"
              value={typeof previewValues[key] === "string" ? (previewValues[key] as string) : ""}
              onChange={(event) => onSetPreviewValue(key, event.target.value)}
            />
          </div>
          {fieldError ? <p className="log-config-wf-builder__field-error">{fieldError}</p> : null}
        </div>
      );
    }

    if (inputType === "note") {
      return (
        <div
          key={step.id}
          className={`log-config-wf-builder__preview-field-card${fieldError ? " has-error" : ""}`}
        >
          <div className="log-config-wf-builder__preview-field-head">
            {renderFieldLabel(label, step.required)}
          </div>
          <div className="log-config-wf-builder__preview-field-body">
            <textarea
              id={`${formId}-${step.id}`}
              className="ui-textarea log-config-wf-builder__preview-textarea"
              rows={3}
              disabled={inputDisabled}
              value={typeof previewValues[key] === "string" ? (previewValues[key] as string) : ""}
              onChange={(event) => onSetPreviewValue(key, event.target.value)}
            />
          </div>
          {fieldError ? <p className="log-config-wf-builder__field-error">{fieldError}</p> : null}
        </div>
      );
    }

    return (
      <div
        key={step.id}
        className={`log-config-wf-builder__preview-field-card${fieldError ? " has-error" : ""}`}
      >
        <div className="log-config-wf-builder__preview-field-head">
          {renderFieldLabel(label, step.required)}
        </div>
        <div className="log-config-wf-builder__preview-field-body">
          <Input
            id={`${formId}-${step.id}`}
            variant="ui"
            type={inputType === "number" ? "number" : "text"}
            disabled={inputDisabled}
            value={typeof previewValues[key] === "string" ? (previewValues[key] as string) : ""}
            onChange={(event) => onSetPreviewValue(key, event.target.value)}
          />
        </div>
        {fieldError ? <p className="log-config-wf-builder__field-error">{fieldError}</p> : null}
      </div>
    );
  };

  return (
    <>
      <div className="log-config-wf-builder__preview-scroll ui-scrollbar">
        {visibleStepCount === 0 ? (
          <p className="log-config-wf-builder__preview-empty">
            No fields are visible yet. Select an origin or adjust values to reveal workflow steps
            based on your conditions.
          </p>
        ) : (
          <div className="log-config-wf-builder__preview-fields-list">
            {visibleSteps.map((step) => renderStepField(step))}
          </div>
        )}
      </div>

      {showValidationBar ? (
        <div
          className={`log-config-wf-builder__validation-bar${
            showPreviewValidation
              ? previewValidation.valid
                ? " is-valid"
                : " is-invalid"
              : ""
          }`}
        >
          <p className="log-config-wf-builder__validation-message">
            {showPreviewValidation
              ? previewValidation.valid
                ? "All visible required fields are valid."
                : `${previewValidation.errorCount} validation issue${
                    previewValidation.errorCount === 1 ? "" : "s"
                  } in the preview form.`
              : "Run validation to check required fields and selections against current conditions."}
          </p>
          <UiButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={onValidate}
          >
            Validate preview
          </UiButton>
        </div>
      ) : null}
    </>
  );
}
