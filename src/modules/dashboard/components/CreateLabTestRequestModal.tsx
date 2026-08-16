"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import {
  Checkbox,
  DatePicker,
  FormField,
  Input,
  MultiSelect,
  SaveIcon,
  Select,
  type SelectOption,
  UiButton,
  ProjectModalPortal,
} from "@/shared/components/ui";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { getUserLabTestPresets, getUserLabTestTypes } from "../services/configModulesApi";
import { LAB_TESTS_MODULE_ID } from "../utils/configModules";
import { parseLabTestPresetOptions } from "../utils/configModules/labTestPreset";
import { parseLabTestTypeOptions } from "../utils/configModules/labTestType";

export type CreateLabTestRequestPayload = {
  requestName: string;
  supplierId: string;
  includesAllLogs: boolean;
  logIds: string[];
  presetId: string;
  labTestTypeIds: string[];
  dueDate: string;
  notes: string;
};

export type LabTestRequestPresetOption = SelectOption & {
  labTestTypeIds?: string[];
};

type CreateLabTestRequestModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  /** When set, lab test types (and presets) are loaded from the DB on open. */
  logConfigurationId?: string;
  labOptions?: readonly SelectOption[];
  logOptions?: readonly SelectOption[];
  presetOptions?: readonly LabTestRequestPresetOption[];
  labTestTypeOptions?: readonly SelectOption[];
  initialValues?: Partial<CreateLabTestRequestPayload> | null;
  mode?: "create" | "edit";
  loadingOptions?: boolean;
  onSubmit?: (payload: CreateLabTestRequestPayload) => void | Promise<void>;
}>;

type DraftState = {
  requestName: string;
  supplierId: string;
  includesAllLogs: boolean;
  logIds: string[];
  presetId: string;
  labTestTypeIds: string[];
  dueDate: string;
  notes: string;
};

type DraftErrors = {
  requestName?: string;
  supplierId?: string;
  logIds?: string;
};

function createEmptyDraft(
  initial?: Partial<CreateLabTestRequestPayload> | null
): DraftState {
  return {
    requestName: initial?.requestName ?? "",
    supplierId: initial?.supplierId ?? "",
    includesAllLogs: initial?.includesAllLogs ?? false,
    logIds: initial?.logIds ? [...initial.logIds] : [],
    presetId: initial?.presetId ?? "",
    labTestTypeIds: initial?.labTestTypeIds ? [...initial.labTestTypeIds] : [],
    dueDate: initial?.dueDate ?? "",
    notes: initial?.notes ?? "",
  };
}

function validateDraft(draft: DraftState): DraftErrors {
  const next: DraftErrors = {};
  if (!draft.requestName.trim()) {
    next.requestName = "Request name is required.";
  }
  if (!draft.supplierId.trim()) {
    next.supplierId = "Lab is required.";
  }
  if (!draft.includesAllLogs && draft.logIds.length === 0) {
    next.logIds = "Select at least one log.";
  }
  return next;
}

function isDraftValid(draft: DraftState): boolean {
  return Object.keys(validateDraft(draft)).length === 0;
}

export function CreateLabTestRequestModal({
  open,
  onClose,
  logConfigurationId = "",
  labOptions = [],
  logOptions = [],
  presetOptions = [],
  labTestTypeOptions = [],
  initialValues = null,
  mode = "create",
  loadingOptions = false,
  onSubmit,
}: CreateLabTestRequestModalProps) {
  const formId = useId();
  const [draft, setDraft] = useState<DraftState>(() => createEmptyDraft(initialValues));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [loadingLabTestCatalog, setLoadingLabTestCatalog] = useState(false);
  const [fetchedLabTestTypeOptions, setFetchedLabTestTypeOptions] = useState<SelectOption[]>([]);
  const [fetchedPresetOptions, setFetchedPresetOptions] = useState<LabTestRequestPresetOption[]>(
    []
  );

  useEffect(() => {
    if (!open) return;
    setDraft(createEmptyDraft(initialValues));
    setErrors({});
    setSubmitting(false);
    setAttemptedSubmit(false);
  }, [open, initialValues]);

  useEffect(() => {
    if (!open) {
      setFetchedLabTestTypeOptions([]);
      setFetchedPresetOptions([]);
      setLoadingLabTestCatalog(false);
      return;
    }

    const configId = logConfigurationId.trim();
    if (!configId) return;

    let cancelled = false;
    setLoadingLabTestCatalog(true);

    void (async () => {
      try {
        const [typesResult, presetsResult] = await Promise.all([
          getUserLabTestTypes(LAB_TESTS_MODULE_ID, configId),
          getUserLabTestPresets(LAB_TESTS_MODULE_ID, configId),
        ]);
        if (cancelled) return;

        const types = parseLabTestTypeOptions(typesResult.data, []);
        setFetchedLabTestTypeOptions(
          types
            .filter((entry) => entry.active !== false)
            .map((entry) => ({ value: entry.id, label: entry.name }))
        );

        const presets = parseLabTestPresetOptions(presetsResult.data, []);
        setFetchedPresetOptions(
          presets.map((entry) => ({
            value: entry.id,
            label: entry.name,
            labTestTypeIds: [...entry.labTestTypeIds],
          }))
        );
      } catch (err) {
        if (cancelled) return;
        setFetchedLabTestTypeOptions([]);
        setFetchedPresetOptions([]);
        showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      } finally {
        if (!cancelled) setLoadingLabTestCatalog(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, logConfigurationId]);

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
  }, [open, onClose]);

  const resolvedLabTestTypeOptions =
    fetchedLabTestTypeOptions.length > 0 ? fetchedLabTestTypeOptions : labTestTypeOptions;

  const resolvedPresetOptions =
    fetchedPresetOptions.length > 0 ? fetchedPresetOptions : presetOptions;

  const presetSelectOptions = useMemo(
    () => resolvedPresetOptions.map(({ value, label }) => ({ value, label })),
    [resolvedPresetOptions]
  );

  const optionsLoading = loadingOptions || loadingLabTestCatalog;
  const canSubmit = isDraftValid(draft) && !submitting && !optionsLoading;

  const handleIncludesAllLogsChange = (checked: boolean) => {
    setDraft((current) => ({
      ...current,
      includesAllLogs: checked,
      logIds: checked ? [] : current.logIds,
    }));
    if (!attemptedSubmit) return;
    setErrors((currentErrors) => {
      if (checked) {
        const { logIds: _logIds, ...rest } = currentErrors;
        void _logIds;
        return rest;
      }
      return { ...currentErrors, logIds: "Select at least one log." };
    });
  };

  const handlePresetChange = (presetId: string) => {
    const preset = resolvedPresetOptions.find((entry) => entry.value === presetId);
    setDraft((current) => ({
      ...current,
      presetId,
      labTestTypeIds: preset?.labTestTypeIds ? [...preset.labTestTypeIds] : current.labTestTypeIds,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setAttemptedSubmit(true);
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: CreateLabTestRequestPayload = {
      requestName: draft.requestName.trim(),
      supplierId: draft.supplierId.trim(),
      includesAllLogs: draft.includesAllLogs,
      logIds: draft.includesAllLogs ? [] : [...draft.logIds],
      presetId: draft.presetId.trim(),
      labTestTypeIds: [...draft.labTestTypeIds],
      dueDate: draft.dueDate.trim(),
      notes: draft.notes.trim(),
    };

    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(payload);
      }
      showApiSuccess(
        undefined,
        mode === "edit" ? "Lab test request updated." : "Lab test request created."
      );
      onClose();
    } catch (err) {
      showApiError(
        err,
        mode === "edit"
          ? "Failed to update lab test request."
          : "Failed to create lab test request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit Lab Test Request" : "Create Lab Test Request";
  const submitLabel = mode === "edit" ? "Save" : "Create";
  const showLogErrors = attemptedSubmit && Boolean(errors.logIds);

  return (
    <ProjectModalPortal open={open}>
      <div
        className="project-modal project-modal--stacked project-modal--nested"
        role="presentation"
      >
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close lab test request dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields create-lab-test-request-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-title`}
        >
          <div className="project-modal__header">
            <h2 id={`${formId}-title`} className="project-modal__title">
              {title}
            </h2>
          </div>

          <form
            className="project-modal__form"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__fields project-modal__fields--stack create-lab-test-request-modal__fields">
                <FormField
                  label="Request Name"
                  htmlFor={`${formId}-request-name`}
                  required
                  error={attemptedSubmit ? errors.requestName : undefined}
                  className="project-modal__field--full"
                >
                  <Input
                    id={`${formId}-request-name`}
                    variant="ui"
                    type="text"
                    value={draft.requestName}
                    placeholder="e.g., Concrete Cylinder Tests"
                    disabled={submitting}
                    required
                    aria-invalid={attemptedSubmit && Boolean(errors.requestName)}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDraft((current) => ({ ...current, requestName: value }));
                      if (attemptedSubmit) {
                        setErrors((current) => ({
                          ...current,
                          requestName: value.trim() ? undefined : "Request name is required.",
                        }));
                      }
                    }}
                  />
                </FormField>

                <FormField
                  label="Lab"
                  htmlFor={`${formId}-lab`}
                  required
                  error={attemptedSubmit ? errors.supplierId : undefined}
                  className="project-modal__field--full"
                >
                  <Select
                    id={`${formId}-lab`}
                    value={draft.supplierId}
                    options={labOptions}
                    placeholder={optionsLoading ? "Loading labs…" : "Select a lab"}
                    search
                    searchPlaceholder="Search labs…"
                    disabled={submitting || optionsLoading}
                    onChange={(value) => {
                      setDraft((current) => ({ ...current, supplierId: value }));
                      if (attemptedSubmit) {
                        setErrors((current) => ({
                          ...current,
                          supplierId: value.trim() ? undefined : "Lab is required.",
                        }));
                      }
                    }}
                  />
                </FormField>

                <div className="create-lab-test-request-modal__panel">
                  <label className="create-lab-test-request-modal__check">
                    <Checkbox
                      checked={draft.includesAllLogs}
                      disabled={submitting}
                      onChange={(event) => handleIncludesAllLogsChange(event.target.checked)}
                      aria-label="Include all logs"
                    />
                    <span>Include all logs</span>
                  </label>
                  <p className="create-lab-test-request-modal__hint">
                    When ticked, every log in the project — including logs added later — is included
                    in this request.
                  </p>

                  {!draft.includesAllLogs ? (
                    <FormField
                      label="Logs in this request"
                      htmlFor={`${formId}-logs`}
                      error={showLogErrors ? errors.logIds : undefined}
                      className="project-modal__field--full"
                    >
                      <MultiSelect
                        id={`${formId}-logs`}
                        value={draft.logIds}
                        options={logOptions}
                        placeholder={
                          optionsLoading ? "Loading logs…" : "Select logs to include"
                        }
                        search
                        searchPlaceholder="Search logs…"
                        disabled={submitting || optionsLoading}
                        onChange={(value) => {
                          setDraft((current) => ({ ...current, logIds: value }));
                          if (attemptedSubmit) {
                            setErrors((current) => ({
                              ...current,
                              logIds:
                                value.length > 0 ? undefined : "Select at least one log.",
                            }));
                          }
                        }}
                      />
                    </FormField>
                  ) : null}
                </div>

                <div className="create-lab-test-request-modal__panel">
                  <FormField
                    label="Lab Test Preset"
                    htmlFor={`${formId}-preset`}
                    className="project-modal__field--full"
                  >
                    <Select
                      id={`${formId}-preset`}
                      value={draft.presetId}
                      options={presetSelectOptions}
                      placeholder={
                        optionsLoading
                          ? "Loading presets…"
                          : "Select a preset (optional)"
                      }
                      search
                      searchPlaceholder="Search presets…"
                      disabled={submitting || optionsLoading}
                      onChange={handlePresetChange}
                    />
                  </FormField>

                  <FormField
                    label="Lab Test Types"
                    htmlFor={`${formId}-lab-test-types`}
                    className="project-modal__field--full"
                  >
                    <MultiSelect
                      id={`${formId}-lab-test-types`}
                      value={draft.labTestTypeIds}
                      options={resolvedLabTestTypeOptions}
                      placeholder={
                        optionsLoading
                          ? "Loading lab test types…"
                          : resolvedLabTestTypeOptions.length === 0
                            ? "No lab test types available"
                            : "Select lab test types"
                      }
                      search
                      searchPlaceholder="Search lab test types…"
                      disabled={submitting || optionsLoading}
                      onChange={(value) =>
                        setDraft((current) => ({ ...current, labTestTypeIds: value }))
                      }
                    />
                  </FormField>
                </div>

                <FormField
                  label="Due Date"
                  htmlFor={`${formId}-due-date`}
                  className="project-modal__field--full"
                >
                  <DatePicker
                    id={`${formId}-due-date`}
                    value={draft.dueDate}
                    placeholder="Due Date"
                    disabled={submitting}
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, dueDate: value }))
                    }
                  />
                </FormField>

                <FormField
                  label="Notes"
                  htmlFor={`${formId}-notes`}
                  className="project-modal__field--full"
                >
                  <textarea
                    id={`${formId}-notes`}
                    className="ui-textarea"
                    rows={4}
                    value={draft.notes}
                    placeholder="Additional instructions or context"
                    disabled={submitting}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDraft((current) => ({ ...current, notes: value }));
                    }}
                  />
                </FormField>
              </div>
            </div>

            <div className="project-modal__footer">
              <UiButton type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </UiButton>
              <UiButton type="submit" variant="primary" disabled={!canSubmit}>
                <span className="create-lab-test-request-modal__submit">
                  <SaveIcon />
                  <span>{submitting ? "Saving…" : submitLabel}</span>
                </span>
              </UiButton>
            </div>
          </form>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
