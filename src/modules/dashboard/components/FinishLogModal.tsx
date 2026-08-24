"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import {
  Checkbox,
  DatePicker,
  FormField,
  Input,
  Select,
  UiButton,
  ProjectModalPortal,
} from "@/shared/components/ui";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import type { DateDisplayFormat } from "@/shared/utils/dateUtils";
import {
  DEFAULT_FINISHING_REASON_OPTIONS,
  type FinishingReasonOption,
} from "../utils/configModules";
import { useUserFinishingReasons } from "../hooks/useUserFinishingReasons";
import type { LogFinishLogFormPayload } from "../types/logFinishLog";

export type { LogFinishLogFormPayload };

export type FinishLogInitialValues = {
  finishTypeId?: string;
  finishTypeName?: string;
  completedDate?: string;
  endDepth?: string;
  comments?: string;
  scaleLogReport?: boolean;
};

type FinishLogModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  logConfigurationId: string;
  dateFormat?: DateDisplayFormat;
  minDate?: string;
  initialValues?: FinishLogInitialValues | null;
  onSubmit?: (payload: LogFinishLogFormPayload) => void | Promise<void>;
}>;

type DraftState = {
  finishTypeId: string;
  completedDate: string;
  endDepth: string;
  comments: string;
  scaleLogReport: boolean;
};

type DraftErrors = {
  finishTypeId?: string;
  completedDate?: string;
  endDepth?: string;
};

function resolveInitialTypeId(
  options: FinishingReasonOption[],
  initial: FinishLogInitialValues | null | undefined
): string {
  if (initial?.finishTypeId) {
    const byId = options.find((entry) => entry.id === initial.finishTypeId);
    if (byId) return byId.id;
  }
  if (initial?.finishTypeName?.trim()) {
    const name = initial.finishTypeName.trim().toLowerCase();
    const byName = options.find((entry) => entry.name.trim().toLowerCase() === name);
    if (byName) return byName.id;
  }
  return options.find((entry) => entry.active !== false && entry.id.trim())?.id ?? "";
}

function createDraft(
  options: FinishingReasonOption[],
  initial: FinishLogInitialValues | null | undefined
): DraftState {
  const finishTypeId = resolveInitialTypeId(options, initial);
  return {
    finishTypeId,
    completedDate: initial?.completedDate?.trim() ?? "",
    endDepth: initial?.endDepth?.trim() ?? "",
    comments: initial?.comments?.trim() ?? "",
    scaleLogReport: Boolean(initial?.scaleLogReport),
  };
}

export function FinishLogModal({
  open,
  onClose,
  logConfigurationId,
  dateFormat = "YYYY-MM-DD",
  minDate,
  initialValues = null,
  onSubmit,
}: FinishLogModalProps) {
  const formId = useId();
  const [workingTypes, setWorkingTypes] = useState<FinishingReasonOption[]>(
    DEFAULT_FINISHING_REASON_OPTIONS
  );
  const [draft, setDraft] = useState<DraftState>(() =>
    createDraft(DEFAULT_FINISHING_REASON_OPTIONS, initialValues)
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const finishingReasonsApi = useUserFinishingReasons({
    enabled: open && Boolean(logConfigurationId.trim()),
    logConfigurationId,
  });

  const loadedOptions = finishingReasonsApi.finishingReasons;
  const activeTypes = useMemo(
    () => workingTypes.filter((entry) => entry.active !== false),
    [workingTypes]
  );

  const selectableTypes = useMemo(() => {
    if (!initialValues?.finishTypeId && !initialValues?.finishTypeName) return activeTypes;
    const existing =
      workingTypes.find((entry) => entry.id === initialValues.finishTypeId) ??
      workingTypes.find(
        (entry) =>
          entry.name.trim().toLowerCase() ===
          (initialValues.finishTypeName ?? "").trim().toLowerCase()
      );
    if (!existing || activeTypes.some((entry) => entry.id === existing.id)) {
      return activeTypes;
    }
    return [existing, ...activeTypes];
  }, [activeTypes, initialValues, workingTypes]);

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.finishTypeId) ??
      workingTypes.find((entry) => entry.id === draft.finishTypeId) ??
      null,
    [draft.finishTypeId, selectableTypes, workingTypes]
  );

  const showScaleCheckbox = selectedType?.showAutoScale !== false;

  const finishTypeSelectOptions = useMemo(
    () =>
      selectableTypes.map((entry) => ({
        value: entry.id,
        label: entry.abbreviation?.trim()
          ? `${entry.name} (${entry.abbreviation.trim()})`
          : entry.name,
      })),
    [selectableTypes]
  );

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(loadedOptions);
    setDraft(createDraft(loadedOptions, initialValues));
    setErrors({});
    setSubmitting(false);
    // Reseed when the dialog opens or initial values change — not on every options refresh
    // after the first open, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, initialValues]);

  useEffect(() => {
    if (!open || workingTypes.length > 0) return;
    setWorkingTypes(loadedOptions);
    setDraft(createDraft(loadedOptions, initialValues));
  }, [open, loadedOptions, workingTypes.length, initialValues]);

  useEffect(() => {
    if (!open || finishingReasonsApi.loading) return;
    setWorkingTypes(loadedOptions);
    setDraft((current) => {
      if (current.finishTypeId && loadedOptions.some((entry) => entry.id === current.finishTypeId)) {
        return current;
      }
      return createDraft(loadedOptions, initialValues);
    });
  }, [open, finishingReasonsApi.loading, loadedOptions, initialValues]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, submitting]);

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!selectedType) {
      next.finishTypeId = "Please select a finish log type.";
    }

    if (draft.completedDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(draft.completedDate.trim())) {
      next.completedDate = "Finish log date must be a valid date.";
    } else if (
      draft.completedDate.trim() &&
      minDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(minDate) &&
      draft.completedDate.trim() < minDate
    ) {
      next.completedDate = "Finish log date must be on or after the drilling date.";
    }

    const depth = draft.endDepth.trim();
    if (depth) {
      const numeric = Number(depth);
      if (!Number.isFinite(numeric)) {
        next.endDepth = "End depth must be a valid number.";
      } else if (numeric < 0) {
        next.endDepth = "End depth cannot be negative.";
      }
    }

    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSubmit || submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedType) return;

    const payload: LogFinishLogFormPayload = {
      finishTypeId: selectedType.id,
      finishTypeName: selectedType.name,
      completedDate: draft.completedDate.trim(),
      endDepth: draft.endDepth.trim(),
      comments: draft.comments.trim(),
      scaleLogReport: showScaleCheckbox ? draft.scaleLogReport : false,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      showApiSuccess(undefined, "Finish log added.");
      onClose();
    } catch (err) {
      showApiError(err, "Failed to save finish log.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Add Finish Log dialog"
          onClick={onClose}
        />
        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields finish-log-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-title`}
        >
          <div className="project-modal__header">
            <h2 id={`${formId}-title`} className="project-modal__title">
              Add Finish Log
            </h2>
          </div>

          <form className="project-modal__form" onSubmit={(e) => void handleSubmit(e)} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__fields project-modal__fields--stack">
                <FormField
                  label="Finish Log"
                  required
                  error={errors.finishTypeId}
                  htmlFor={`${formId}-finish-type`}
                  className="project-modal__field--full"
                >
                  <Select
                    id={`${formId}-finish-type`}
                    value={draft.finishTypeId}
                    disabled={submitting || selectableTypes.length === 0 || finishingReasonsApi.loading}
                    options={finishTypeSelectOptions}
                    placeholder="Select finish type"
                    onChange={(value) => {
                      const nextType = selectableTypes.find((entry) => entry.id === value);
                      setDraft((current) => ({
                        ...current,
                        finishTypeId: value,
                        scaleLogReport:
                          nextType?.showAutoScale === false ? false : current.scaleLogReport,
                      }));
                      setErrors((current) => ({ ...current, finishTypeId: undefined }));
                    }}
                  />
                </FormField>

                <FormField
                  label="Finish Log Date"
                  error={errors.completedDate}
                  htmlFor={`${formId}-completed-date`}
                  className="project-modal__field--full"
                >
                  <DatePicker
                    id={`${formId}-completed-date`}
                    value={draft.completedDate}
                    onChange={(value) => {
                      setDraft((current) => ({ ...current, completedDate: value }));
                      setErrors((current) => ({ ...current, completedDate: undefined }));
                    }}
                    placeholder={dateFormat}
                    displayFormat={dateFormat}
                    min={minDate || undefined}
                    disabled={submitting}
                  />
                </FormField>

                <FormField
                  label="End Depth (m)"
                  error={errors.endDepth}
                  htmlFor={`${formId}-end-depth`}
                  className="project-modal__field--full"
                >
                  <Input
                    id={`${formId}-end-depth`}
                    variant="ui"
                    type="text"
                    inputMode="decimal"
                    value={draft.endDepth}
                    placeholder="Depth"
                    disabled={submitting}
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, endDepth: event.target.value }));
                      setErrors((current) => ({ ...current, endDepth: undefined }));
                    }}
                  />
                </FormField>

                <FormField
                  label="Comments"
                  htmlFor={`${formId}-comments`}
                  className="project-modal__field--full"
                >
                  <textarea
                    id={`${formId}-comments`}
                    className="ui-textarea"
                    rows={3}
                    value={draft.comments}
                    placeholder="Comments"
                    disabled={submitting}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, comments: event.target.value }))
                    }
                  />
                </FormField>

                {/* {showScaleCheckbox ? (
                  <label
                    className="finish-log-modal__scale-row project-modal__field--full"
                    htmlFor={`${formId}-scale-log`}
                  >
                    <Checkbox
                      id={`${formId}-scale-log`}
                      checked={draft.scaleLogReport}
                      disabled={submitting}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          scaleLogReport: event.target.checked,
                        }))
                      }
                    />
                    <span>Scale Log Report to show log on one page</span>
                  </label>
                ) : null} */}
              </div>
            </div>

            <div className="project-modal__footer">
              <UiButton type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </UiButton>
              <UiButton type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Saving…" : "Submit"}
              </UiButton>
            </div>
          </form>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
