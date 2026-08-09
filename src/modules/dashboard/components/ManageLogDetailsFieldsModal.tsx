"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useState } from "react";
import { Toggle, UiButton, ProjectModalPortal } from "@/shared/components/ui";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import {
  LOG_DETAIL_FIELD_SECTIONS,
  MANAGEABLE_LOG_DETAIL_FIELD_META,
  type LogDetailFieldKey,
  type ManageableLogDetailFieldKey,
} from "../data/logDetailFields";
import {
  replaceLogConfigurationFieldOptions,
  updateLogConfiguration,
} from "../services/logConfigurationApi";
import { useLogConfigurationOwnerUserId } from "../context/LogConfigurationOwnerContext";
import {
  cloneLogDetailFieldsSettings,
  isManageableLogDetailFieldKey,
  type LogDetailFieldsSettings,
} from "../utils/logDetailFieldsUtils";
import { ManageCustomFieldOptionsModal } from "./ManageProjectDetailOptionsModal";

type ManageLogDetailsFieldsModalProps = Readonly<{
  open: boolean;
  configurationId: string;
  settings: LogDetailFieldsSettings;
  onClose: () => void;
  onSaved: (settings: LogDetailFieldsSettings) => void;
}>;

export function ManageLogDetailsFieldsModal({
  open,
  configurationId,
  settings,
  onClose,
  onSaved,
}: ManageLogDetailsFieldsModalProps) {
  const formId = useId();
  const ownerUserId = useLogConfigurationOwnerUserId();
  const [draft, setDraft] = useState<LogDetailFieldsSettings>(() =>
    cloneLogDetailFieldsSettings(settings)
  );
  const [saving, setSaving] = useState(false);
  const [savingOptions, setSavingOptions] = useState(false);
  const [optionsModalKey, setOptionsModalKey] = useState<ManageableLogDetailFieldKey | null>(null);
  const isBusy = saving || savingOptions;

  useEffect(() => {
    if (!open) return;
    setDraft(cloneLogDetailFieldsSettings(settings));
    setOptionsModalKey(null);
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !optionsModalKey) {
        event.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onClose, open, optionsModalKey]);

  const toggleField = useCallback((key: LogDetailFieldKey, enabled: boolean) => {
    setDraft((current) => ({
      ...current,
      enabled: { ...current.enabled, [key]: enabled },
    }));
  }, []);

  const handleOptionsSaved = useCallback(
    async (fieldKey: ManageableLogDetailFieldKey, options: string[]) => {
      setSavingOptions(true);

      try {
        const { data, message } = await replaceLogConfigurationFieldOptions(
          configurationId,
          "log-detail",
          fieldKey,
          options,
          ownerUserId
        );
        const nextSettings: LogDetailFieldsSettings = {
          ...draft,
          options: { ...draft.options, [fieldKey]: data.options },
        };
        setDraft(nextSettings);
        onSaved(nextSettings);
        showApiSuccess(message, API_MESSAGES.LOG_CONFIGURATION_UPDATED);
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
        throw err;
      } finally {
        setSavingOptions(false);
      }
    },
    [configurationId, draft, onSaved, ownerUserId]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);

    try {
      const { data, message } = await updateLogConfiguration(
        configurationId,
        {
          logDetailFields: { enabled: draft.enabled },
        },
        ownerUserId
      );
      setDraft(data.logDetailFields);
      onSaved(data.logDetailFields);
      showApiSuccess(message, API_MESSAGES.LOG_CONFIGURATION_UPDATED);
      onClose();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    } finally {
      setSaving(false);
    }
  };

  const optionsModalMeta = optionsModalKey ? MANAGEABLE_LOG_DETAIL_FIELD_META[optionsModalKey] : null;

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close log details custom fields dialog"
            onClick={onClose}
          />

          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--form log-detail-fields-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-log-detail-fields-title"
          >
            <div className="project-modal__header">
              <h2 id="manage-log-detail-fields-title" className="project-modal__title">
                Log Details Custom Fields
              </h2>
              <p className="project-modal__subtitle">
                Different regions and log types require different fields. Use the toggles below to
                control the fields collected when creating your log and in the log details section
                below.
              </p>
            </div>

            <form
              id={formId}
              className="project-modal__form"
              onSubmit={(event) => void handleSubmit(event)}
              noValidate
            >
              <div className="project-modal__body ui-scrollbar">
                <div className="log-detail-fields-modal__grid">
                  {LOG_DETAIL_FIELD_SECTIONS.map((section) => (
                    <section key={section.id} className="log-detail-fields-modal__section">
                      <h3 className="log-detail-fields-modal__section-title">{section.title}</h3>

                      <div className="log-detail-fields-modal__toggles">
                        {section.fields.map((field) => {
                          const enabled = draft.enabled[field.key];
                          const manageable = isManageableLogDetailFieldKey(field.key);
                          const showManage = manageable && enabled;

                          return (
                            <div key={field.key} className="log-detail-fields-modal__toggle-row">
                              <span className="log-detail-fields-modal__toggle-label">
                                {field.label}
                              </span>
                              <div className="log-detail-fields-modal__toggle-switch">
                                <Toggle
                                  checked={enabled}
                                  disabled={isBusy}
                                  onChange={(checked) => toggleField(field.key, checked)}
                                  aria-label={`${field.label} ${enabled ? "enabled" : "disabled"}`}
                                />
                              </div>
                              <div className="log-detail-fields-modal__toggle-manage">
                                {showManage ? (
                                  <UiButton
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setOptionsModalKey(field.key as ManageableLogDetailFieldKey)}
                                    disabled={isBusy}
                                  >
                                    Manage
                                  </UiButton>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </div>

              <div className="project-modal__footer">
                <UiButton type="button" variant="ghost" onClick={onClose} disabled={isBusy}>
                  Cancel
                </UiButton>
                <UiButton type="submit" variant="primary" disabled={isBusy}>
                  {saving ? "Saving…" : "Save"}
                </UiButton>
              </div>
            </form>
          </div>
        </div>
      </ProjectModalPortal>

      <ManageCustomFieldOptionsModal
        open={optionsModalKey !== null}
        meta={optionsModalMeta}
        options={optionsModalKey ? draft.options[optionsModalKey] : []}
        onClose={() => setOptionsModalKey(null)}
        onSave={async (options) => {
          if (!optionsModalKey) return;
          await handleOptionsSaved(optionsModalKey, options);
        }}
      />
    </>
  );
}
