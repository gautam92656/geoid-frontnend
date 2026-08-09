"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import { FormField, Select, UiButton, ProjectModalPortal } from "@/shared/components/ui";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { getApiErrorMessage, showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { PROJECT_STATUSES } from "../data/projectOptions";
import { updateProjectStatus } from "../services/projectStatusHistoryApi";
import type { Project } from "../types/project";
import type { ProjectStatusHistoryEntry } from "../types/projectStatusHistory";

type UpdateProjectStatusModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  project: Project;
  onSubmit: (result: { project: Project; entry: ProjectStatusHistoryEntry }) => void;
}>;

export function UpdateProjectStatusModal({
  open,
  onClose,
  project,
  onSubmit,
}: UpdateProjectStatusModalProps) {
  const titleId = useId();
  const formId = useId();
  const [status, setStatus] = useState(project.status);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatus(project.status);
    setError("");
  }, [open, project.status]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (status === project.status) {
      setError("Choose a different status to update.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { data, message } = await updateProjectStatus(project.id, status);
      showApiSuccess(message, API_MESSAGES.PROJECT_STATUS_UPDATED);
      onSubmit(data);
      onClose();
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, API_ERROR_MESSAGES.UPDATE_PROJECT_STATUS);
      if (errorMessage.toLowerCase().includes("already has this status")) {
        setError("This project already has the selected status.");
      } else {
        showApiError(err, errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close update status dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="project-modal__header">
            <h2 id={titleId} className="project-modal__title">
              Update Project Status
            </h2>
            <p className="project-modal__subtitle">
              Current status: <strong>{project.status}</strong>
            </p>
          </div>

          <form id={formId} className="project-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="project-modal__body">
              <FormField label="New status" required error={error}>
                <Select
                  value={status}
                  onChange={setStatus}
                  options={PROJECT_STATUSES}
                />
              </FormField>
            </div>

            <div className="project-modal__footer">
              <UiButton type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </UiButton>
              <UiButton type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Updating…" : "Update Status"}
              </UiButton>
            </div>
          </form>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
