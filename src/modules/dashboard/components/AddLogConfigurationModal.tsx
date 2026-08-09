"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Input, UiButton, ProjectModalPortal } from "@/shared/components/ui";
import { API_ERROR_MESSAGES, API_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import type {
  LogConfigurationTemplate,
  LogConfigurationTemplateDiscipline,
} from "../data/logConfigurationTemplates";
import {
  createLogConfiguration,
  listLogConfigurationTemplates,
} from "../services/logConfigurationApi";
import { useLogConfigurationOwnerUserId } from "../context/LogConfigurationOwnerContext";
import type { LogConfiguration } from "../types/logConfiguration";

type AddLogConfigurationModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  existingNames: readonly string[];
  onCreated: (configuration: LogConfiguration) => void;
}>;

type DisciplineFilter = "all" | LogConfigurationTemplateDiscipline;

const DISCIPLINE_TABS: readonly {
  id: DisciplineFilter;
  label: string;
  tone?: "geotechnical" | "environmental";
}[] = [
  { id: "all", label: "All" },
  { id: "Geotechnical", label: "Geotechnical", tone: "geotechnical" },
  { id: "Environmental", label: "Environmental", tone: "environmental" },
];

const DISCIPLINE_BADGE_TONE: Record<
  LogConfigurationTemplateDiscipline,
  "geotechnical" | "environmental"
> = {
  Geotechnical: "geotechnical",
  Environmental: "environmental",
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function TemplateDisciplineBadge({ discipline }: { discipline: LogConfigurationTemplateDiscipline }) {
  const tone = DISCIPLINE_BADGE_TONE[discipline];
  return (
    <span className={`log-config-template-modal__type log-config-template-modal__type--${tone}`}>
      {discipline}
    </span>
  );
}

export function AddLogConfigurationModal({
  open,
  onClose,
  existingNames,
  onCreated,
}: AddLogConfigurationModalProps) {
  const searchId = useId();
  const ownerUserId = useLogConfigurationOwnerUserId();
  const [disciplineFilter, setDisciplineFilter] = useState<DisciplineFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<LogConfigurationTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const existingNameSet = useMemo(
    () => new Set(existingNames.map((name) => normalizeName(name))),
    [existingNames]
  );

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return templates.filter((template) => {
      if (disciplineFilter !== "all" && !template.disciplines.includes(disciplineFilter)) {
        return false;
      }
      if (!template.available) return false;
      if (!query) return true;

      const haystack = [template.name, template.description, ...template.disciplines, template.region]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [disciplineFilter, searchQuery, templates]);

  const resetState = useCallback(() => {
    setDisciplineFilter("all");
    setSearchQuery("");
    setSubmittingId(null);
    setTemplates([]);
    setTemplatesError(null);
    setLoadingTemplates(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    let cancelled = false;

    const loadTemplates = async () => {
      setLoadingTemplates(true);
      setTemplatesError(null);

      try {
        const result = await listLogConfigurationTemplates(1, 100, {
          region: "AU",
          availableOnly: true,
        });
        if (!cancelled) {
          setTemplates(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setTemplates([]);
          setTemplatesError(API_ERROR_MESSAGES.LOAD_LOG_CONFIGURATION_TEMPLATES);
          showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_CONFIGURATION_TEMPLATES);
        }
      } finally {
        if (!cancelled) {
          setLoadingTemplates(false);
        }
      }
    };

    void loadTemplates();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelled = true;
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, resetState]);

  const isNameTaken = (name: string) => existingNameSet.has(normalizeName(name));

  const handleCreate = async (name: string, templateId: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || isNameTaken(trimmedName)) return;

    setSubmittingId(templateId);

    try {
      const { data, message } = await createLogConfiguration(
        {
          name: trimmedName,
          templateSlug: templateId,
        },
        ownerUserId
      );
      onCreated(data);
      showApiSuccess(message, API_MESSAGES.LOG_CONFIGURATION_ADDED);
      onClose();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.ADD_LOG_CONFIGURATION);
    } finally {
      setSubmittingId(null);
    }
  };

  const isBusy = submittingId !== null;

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close add log configuration dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields log-config-template-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-log-config-title"
        >
          <div className="project-modal__header log-config-template-modal__header">
            <h2 id="add-log-config-title" className="project-modal__title">
              Add Log Configuration
            </h2>
            <p className="project-modal__subtitle">
              Choose an AS1726 template to add to your account.
            </p>
          </div>

          <div className="project-modal__body ui-scrollbar log-config-template-modal__body">
            <div className="log-config-template-modal__toolbar">
              <Input
                id={searchId}
                variant="ui"
                type="search"
                className="log-config-template-modal__search"
                placeholder="Search templates…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Search log configuration templates"
                disabled={loadingTemplates}
              />

              <div
                className="log-config-template-modal__filter-tabs"
                role="tablist"
                aria-label="Filter by type"
              >
                {DISCIPLINE_TABS.map((tab) => {
                  const isActive = disciplineFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={[
                        "log-config-template-modal__filter-tab",
                        tab.tone ? `log-config-template-modal__filter-tab--${tab.tone}` : "",
                        isActive ? "is-active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setDisciplineFilter(tab.id)}
                      disabled={loadingTemplates}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {loadingTemplates ? (
              <p className="log-config-template-modal__empty">Loading templates…</p>
            ) : templatesError ? (
              <p className="log-config-template-modal__empty">{templatesError}</p>
            ) : filteredTemplates.length === 0 ? (
              <p className="log-config-template-modal__empty">No templates match your search.</p>
            ) : (
              <ul className="log-config-template-modal__grid" aria-label="Available templates">
                {filteredTemplates.map((template) => {
                  const nameTaken = isNameTaken(template.name);
                  const isSubmitting = submittingId === template.id;
                  const canUse = !nameTaken && !isBusy;

                  return (
                    <li key={template.id} className="log-config-template-modal__card">
                      <div className="log-config-template-modal__card-top">
                        <div className="log-config-template-modal__types">
                          <span className="log-config-template-modal__type log-config-template-modal__type--region">
                            {template.region}
                          </span>
                          {template.disciplines.map((discipline) => (
                            <TemplateDisciplineBadge key={discipline} discipline={discipline} />
                          ))}
                        </div>
                      </div>

                      <h3 className="log-config-template-modal__card-title">{template.name}</h3>
                      <p className="log-config-template-modal__card-description">
                        {template.description}
                      </p>

                      <div className="log-config-template-modal__card-footer">
                        {nameTaken ? (
                          <span className="log-config-template-modal__card-added">Added</span>
                        ) : (
                          <UiButton
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={!canUse}
                            onClick={() => void handleCreate(template.name, template.id)}
                          >
                            {isSubmitting ? "Adding…" : "Add template"}
                          </UiButton>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="project-modal__footer log-config-template-modal__footer">
            <p className="log-config-template-modal__footer-hint">
              {loadingTemplates
                ? "Loading templates…"
                : `${filteredTemplates.length} template${filteredTemplates.length === 1 ? "" : "s"} available`}
            </p>
            <UiButton type="button" variant="ghost" onClick={onClose} disabled={isBusy}>
              Cancel
            </UiButton>
          </div>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
