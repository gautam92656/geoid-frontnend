"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  DatePicker,
  FormField,
  Input,
  ProjectModalPortal,
  TimePicker,
  UiButton,
} from "@/shared/components/ui";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";

export type LogRqdTcrFormPayload = {
  depthFrom: string;
  depthTo: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  corePieceLength: string;
  rqdPercent: string;
  coreLossLength: string;
  coreRecoveryLength: string;
  tcrPercent: string;
  photoName: string;
};

type EditRqdTcrModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  initialValues?: Partial<LogRqdTcrFormPayload> | null;
  onSubmit?: (payload: LogRqdTcrFormPayload) => void | Promise<void>;
}>;

type DraftState = {
  depthFrom: string;
  depthTo: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  corePieceLength: string;
  rqdPercent: string;
  coreLossLength: string;
  coreRecoveryLength: string;
  tcrPercent: string;
  photoFile: File | null;
  photoName: string;
};

type DraftErrors = {
  rqdPercent?: string;
  coreLossLength?: string;
  coreRecoveryLength?: string;
  tcrPercent?: string;
  depthFrom?: string;
  depthTo?: string;
};

function createEmptyDraft(): DraftState {
  return {
    depthFrom: "",
    depthTo: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    corePieceLength: "",
    rqdPercent: "",
    coreLossLength: "",
    coreRecoveryLength: "",
    tcrPercent: "",
    photoFile: null,
    photoName: "",
  };
}

function createDraft(initial: Partial<LogRqdTcrFormPayload> | null | undefined): DraftState {
  const empty = createEmptyDraft();
  if (!initial) return empty;

  return {
    ...empty,
    depthFrom: initial.depthFrom ?? "",
    depthTo: initial.depthTo ?? "",
    startDate: initial.startDate ?? "",
    startTime: initial.startTime ?? "",
    endDate: initial.endDate ?? "",
    endTime: initial.endTime ?? "",
    corePieceLength: initial.corePieceLength ?? "",
    rqdPercent: initial.rqdPercent ?? "",
    coreLossLength: initial.coreLossLength ?? "",
    coreRecoveryLength: initial.coreRecoveryLength ?? "",
    tcrPercent: initial.tcrPercent ?? "",
    photoFile: null,
    photoName: initial.photoName ?? "",
  };
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 7l1.2-2h3.6L15 7h3a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function validateNumber(value: string, label: string, required: boolean): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return required ? "This field is required" : undefined;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return `${label} must be a valid number.`;
  return undefined;
}

export function EditRqdTcrModal({
  open,
  onClose,
  mode = "add",
  initialValues = null,
  onSubmit,
}: EditRqdTcrModalProps) {
  const formId = useId();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<DraftState>(createEmptyDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(createDraft(mode === "edit" ? initialValues : null));
    setErrors({});
    setSubmitting(false);
  }, [open, mode, initialValues]);

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

  const update =
    <K extends keyof DraftState>(key: K) =>
    (value: DraftState[K]) => {
      setDraft((current) => ({ ...current, [key]: value }));
      if (key in errors) {
        setErrors((current) => ({ ...current, [key]: undefined }));
      }
    };

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    const depthFromError = validateNumber(draft.depthFrom, "Depth From", false);
    if (depthFromError) next.depthFrom = depthFromError;
    const depthToError = validateNumber(draft.depthTo, "Depth To", false);
    if (depthToError) next.depthTo = depthToError;

    const rqdError = validateNumber(draft.rqdPercent, "RQD %", true);
    if (rqdError) next.rqdPercent = rqdError;
    const coreLossError = validateNumber(draft.coreLossLength, "Length of Core Loss", true);
    if (coreLossError) next.coreLossLength = coreLossError;
    const coreRecoveryError = validateNumber(
      draft.coreRecoveryLength,
      "Length of Core Recovery",
      true
    );
    if (coreRecoveryError) next.coreRecoveryLength = coreRecoveryError;
    const tcrError = validateNumber(draft.tcrPercent, "TCR %", true);
    if (tcrError) next.tcrPercent = tcrError;

    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: LogRqdTcrFormPayload = {
      depthFrom: draft.depthFrom.trim(),
      depthTo: draft.depthTo.trim(),
      startDate: draft.startDate.trim(),
      startTime: draft.startTime.trim(),
      endDate: draft.endDate.trim(),
      endTime: draft.endTime.trim(),
      corePieceLength: draft.corePieceLength.trim(),
      rqdPercent: draft.rqdPercent.trim(),
      coreLossLength: draft.coreLossLength.trim(),
      coreRecoveryLength: draft.coreRecoveryLength.trim(),
      tcrPercent: draft.tcrPercent.trim(),
      photoName: draft.photoName.trim(),
    };

    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(payload);
      }
      showApiSuccess(undefined, mode === "edit" ? "RQD/TCR updated." : "RQD/TCR added.");
      onClose();
    } catch (err) {
      showApiError(err, "Failed to save RQD/TCR.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit RQD/TCR" : "Add RQD/TCR";

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close RQD/TCR dialog"
          onClick={onClose}
        />
        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields edit-rqd-tcr-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-title`}
        >
          <div className="project-modal__header">
            <h2 id={`${formId}-title`} className="project-modal__title">
              {title}
            </h2>
          </div>

          <form className="project-modal__form" onSubmit={(e) => void handleSubmit(e)} noValidate>
            <div className="project-modal__body ui-scrollbar">
              <div className="project-modal__fields project-modal__fields--stack edit-rqd-tcr-modal__fields">
                <div className="edit-rqd-tcr-modal__row">
                  <FormField
                    label="Depth From (m)"
                    error={errors.depthFrom}
                    htmlFor={`${formId}-depth-from`}
                  >
                    <Input
                      id={`${formId}-depth-from`}
                      variant="ui"
                      type="text"
                      inputMode="decimal"
                      value={draft.depthFrom}
                      placeholder="Depth"
                      disabled={submitting}
                      onChange={(event) => update("depthFrom")(event.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Depth To (m)"
                    error={errors.depthTo}
                    htmlFor={`${formId}-depth-to`}
                  >
                    <Input
                      id={`${formId}-depth-to`}
                      variant="ui"
                      type="text"
                      inputMode="decimal"
                      value={draft.depthTo}
                      placeholder="Depth"
                      disabled={submitting}
                      onChange={(event) => update("depthTo")(event.target.value)}
                    />
                  </FormField>
                </div>

                <div className="edit-rqd-tcr-modal__row">
                  <FormField label="Start Date" htmlFor={`${formId}-start-date`}>
                    <DatePicker
                      id={`${formId}-start-date`}
                      value={draft.startDate}
                      placeholder="Start Date"
                      disabled={submitting}
                      onChange={(value) => update("startDate")(value)}
                    />
                  </FormField>

                  <FormField label="Start Time" htmlFor={`${formId}-start-time`}>
                    <TimePicker
                      id={`${formId}-start-time`}
                      value={draft.startTime}
                      placeholder="Start Time"
                      disabled={submitting}
                      onChange={(value) => update("startTime")(value)}
                    />
                  </FormField>
                </div>

                <div className="edit-rqd-tcr-modal__row">
                  <FormField label="End Date" htmlFor={`${formId}-end-date`}>
                    <DatePicker
                      id={`${formId}-end-date`}
                      value={draft.endDate}
                      placeholder="End Date"
                      disabled={submitting}
                      onChange={(value) => update("endDate")(value)}
                    />
                  </FormField>

                  <FormField label="End Time" htmlFor={`${formId}-end-time`}>
                    <TimePicker
                      id={`${formId}-end-time`}
                      value={draft.endTime}
                      placeholder="End Time"
                      disabled={submitting}
                      onChange={(value) => update("endTime")(value)}
                    />
                  </FormField>
                </div>

                <h3 className="edit-rqd-tcr-modal__section-title">RQD Length</h3>

                <div className="edit-rqd-tcr-modal__row">
                  <FormField
                    label="Sum length of intact core pieces >=0.1 (m)"
                    htmlFor={`${formId}-core-piece`}
                  >
                    <Input
                      id={`${formId}-core-piece`}
                      variant="ui"
                      type="text"
                      inputMode="decimal"
                      value={draft.corePieceLength}
                      disabled={submitting}
                      onChange={(event) => update("corePieceLength")(event.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="RQD %"
                    required
                    error={errors.rqdPercent}
                    htmlFor={`${formId}-rqd-percent`}
                  >
                    <Input
                      id={`${formId}-rqd-percent`}
                      variant="ui"
                      type="text"
                      inputMode="decimal"
                      value={draft.rqdPercent}
                      disabled={submitting}
                      onChange={(event) => update("rqdPercent")(event.target.value)}
                    />
                  </FormField>
                </div>

                <h3 className="edit-rqd-tcr-modal__section-title">TCR</h3>

                <div className="edit-rqd-tcr-modal__row edit-rqd-tcr-modal__row--3">
                  <FormField
                    label="Length of Core Loss(m)"
                    required
                    error={errors.coreLossLength}
                    htmlFor={`${formId}-core-loss`}
                  >
                    <Input
                      id={`${formId}-core-loss`}
                      variant="ui"
                      type="text"
                      inputMode="decimal"
                      value={draft.coreLossLength}
                      disabled={submitting}
                      onChange={(event) => update("coreLossLength")(event.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Length of Core Recovery(m)"
                    required
                    error={errors.coreRecoveryLength}
                    htmlFor={`${formId}-core-recovery`}
                  >
                    <Input
                      id={`${formId}-core-recovery`}
                      variant="ui"
                      type="text"
                      inputMode="decimal"
                      value={draft.coreRecoveryLength}
                      disabled={submitting}
                      onChange={(event) => update("coreRecoveryLength")(event.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="TCR %"
                    required
                    error={errors.tcrPercent}
                    htmlFor={`${formId}-tcr-percent`}
                  >
                    <Input
                      id={`${formId}-tcr-percent`}
                      variant="ui"
                      type="text"
                      inputMode="decimal"
                      value={draft.tcrPercent}
                      disabled={submitting}
                      onChange={(event) => update("tcrPercent")(event.target.value)}
                    />
                  </FormField>
                </div>

                <div className="ui-field project-modal__field--full edit-rqd-tcr-modal__photo">
                  <span className="ui-field__label">Add Photo</span>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="edit-rqd-tcr-modal__photo-input"
                    disabled={submitting}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setDraft((current) => ({
                        ...current,
                        photoFile: file,
                        photoName: file?.name ?? "",
                      }));
                    }}
                  />
                  <button
                    type="button"
                    className="edit-rqd-tcr-modal__photo-trigger"
                    disabled={submitting}
                    aria-label="Add photo"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <CameraIcon />
                  </button>
                  {draft.photoName ? (
                    <p className="edit-rqd-tcr-modal__photo-name">{draft.photoName}</p>
                  ) : null}
                </div>
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
