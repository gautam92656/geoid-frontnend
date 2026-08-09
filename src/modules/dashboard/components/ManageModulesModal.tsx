"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Input, Select, UiButton, ProjectModalPortal } from "@/shared/components/ui";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import {
  CONFIG_MODULE_FILTER_OPTIONS,
  CONFIG_MODULE_SCOPE_FILTER_OPTIONS,
  type ConfigModuleDefinition,
  type ConfigModuleFilter,
  type ConfigModuleScopeFilter,
  type ConfigModuleTagTone,
} from "../data/configModules";
import { adoptConfigModule } from "../services/configModulesApi";
import { filterModuleLibrary } from "../utils/filterModuleLibrary";
import type { StoredModuleSettings } from "../utils/configModules";
import { useConfigModuleCatalog } from "../hooks/useConfigModuleCatalog";

export type AdoptedModulePayload = {
  moduleId: string;
  settings?: StoredModuleSettings | null;
  definition: ConfigModuleDefinition;
};

type ManageModulesModalProps = Readonly<{
  open: boolean;
  logConfigurationId: string;
  enabledModuleIds: readonly string[];
  onClose: () => void;
  onAddModule: (payload: AdoptedModulePayload) => void | Promise<void>;
}>;

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ModuleTagBadge({ label, tone }: { label: string; tone: ConfigModuleTagTone }) {
  return (
    <span className={`log-config-module-modal__type log-config-module-modal__type--${tone}`}>
      {label}
    </span>
  );
}

function ModuleLibraryCard({
  module,
  isAdded,
  adopting,
  onAdd,
}: {
  module: ConfigModuleDefinition;
  isAdded: boolean;
  adopting: boolean;
  onAdd: (module: ConfigModuleDefinition) => void;
}) {
  return (
    <li className="log-config-module-modal__card">
      <div className="log-config-module-modal__card-top">
        <div className="log-config-module-modal__types">
          {module.scope === "user" ? (
            <ModuleTagBadge label="My module" tone="category" />
          ) : (
            <ModuleTagBadge label="Template" tone="region" />
          )}
          {module.tags.map((tag) => (
            <ModuleTagBadge key={`${tag.tone}-${tag.label}`} label={tag.label} tone={tag.tone} />
          ))}
        </div>
      </div>

      <h3 className="log-config-module-modal__card-title">{module.title}</h3>
      <p className="log-config-module-modal__card-description">{module.description}</p>

      <div className="log-config-module-modal__card-footer">
        {isAdded ? (
          <span className="log-config-module-modal__card-added">Added</span>
        ) : (
          <UiButton
            type="button"
            variant="secondary"
            size="sm"
            className="log-config-module-modal__use-btn"
            disabled={adopting}
            onClick={() => onAdd(module)}
          >
            {adopting ? "Adding…" : "Use Data Module"}
            <ChevronRightIcon />
          </UiButton>
        )}
      </div>
    </li>
  );
}

export function ManageModulesModal({
  open,
  logConfigurationId,
  enabledModuleIds,
  onClose,
  onAddModule,
}: ManageModulesModalProps) {
  const searchId = useId();
  const filterId = useId();
  const scopeFilterId = useId();
  const [categoryFilter, setCategoryFilter] = useState<ConfigModuleFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ConfigModuleScopeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [adoptingId, setAdoptingId] = useState<string | null>(null);

  const { modules, loading, error } = useConfigModuleCatalog({
    enabled: open,
    logConfigurationId,
  });

  const enabledSet = useMemo(() => new Set(enabledModuleIds), [enabledModuleIds]);

  // Library cards are templates (and standalone user modules). Adopted copies of a
  // common template belong on the Active Modules sidebar, not as extra library cards.
  const libraryModules = useMemo(() => {
    if (scopeFilter === "user") return modules;

    const commonIds = new Set(
      modules.filter((entry) => entry.scope === "common").map((entry) => entry.id)
    );

    return modules.filter((entry) => {
      if (entry.scope !== "user") return true;
      const source = entry.sourceSlug?.trim();
      return !source || !commonIds.has(source);
    });
  }, [modules, scopeFilter]);

  const filteredModules = useMemo(
    () =>
      filterModuleLibrary(libraryModules, {
        query: searchQuery,
        category: categoryFilter,
        scope: scopeFilter,
      }),
    [categoryFilter, libraryModules, scopeFilter, searchQuery]
  );

  const resetFilters = useCallback(() => {
    setCategoryFilter("all");
    setScopeFilter("all");
    setSearchQuery("");
    setAdoptingId(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetFilters();
      return;
    }

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
  }, [onClose, open, resetFilters]);

  const handleUseModule = async (module: ConfigModuleDefinition) => {
    const templateSlug = module.sourceSlug?.trim() || module.id;
    if (enabledSet.has(templateSlug) || adoptingId) return;

    setAdoptingId(module.slug);

    try {
      // Common templates are adopted into a configuration-scoped customization first.
      // Existing user modules for this config are reused as-is. The adopted copy is
      // enabled on the configuration sidebar — it is not inserted as a new Module Library card.
      const adopted =
        module.scope === "common"
          ? await adoptConfigModule(templateSlug, logConfigurationId)
          : { data: module, message: undefined };

      await onAddModule({
        moduleId: adopted.data.id,
        settings: adopted.data.settings,
        definition: adopted.data,
      });
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.ADOPT_CONFIG_MODULE);
    } finally {
      setAdoptingId(null);
    }
  };

  const emptyMessage = (() => {
    if (loading) return "Loading modules…";
    if (error) return error;
    return "No modules match your search.";
  })();

  return (
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close module library dialog"
          onClick={onClose}
        />

        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields log-config-module-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-modules-title"
        >
          <div className="project-modal__header log-config-module-modal__header">
            <h2 id="manage-modules-title" className="project-modal__title">
              Module Library
            </h2>
            <p className="project-modal__subtitle">
              Choose a data module to add to this configuration. Selected modules appear in the
              Active Modules sidebar. Customizations are saved on this configuration only and are
              not reused across your other log configurations.
            </p>
          </div>

          <div className="project-modal__body ui-scrollbar log-config-module-modal__body">
            <div className="log-config-module-modal__toolbar">
              <Select
                id={scopeFilterId}
                value={scopeFilter}
                onChange={(value) => setScopeFilter(value as ConfigModuleScopeFilter)}
                options={[...CONFIG_MODULE_SCOPE_FILTER_OPTIONS]}
              />

              <Select
                id={filterId}
                value={categoryFilter}
                onChange={(value) => setCategoryFilter(value as ConfigModuleFilter)}
                options={[...CONFIG_MODULE_FILTER_OPTIONS]}
              />

              <Input
                id={searchId}
                variant="ui"
                type="search"
                className="log-config-module-modal__search"
                placeholder="Search by title or description"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Search modules"
              />
            </div>

            {filteredModules.length === 0 ? (
              <p className="log-config-module-modal__empty">{emptyMessage}</p>
            ) : (
              <ul className="log-config-module-modal__grid" aria-label="Available modules">
                {filteredModules.map((module) => {
                  const enablementId = module.sourceSlug?.trim() || module.id;
                  return (
                    <ModuleLibraryCard
                      key={`${module.scope}-${module.slug}`}
                      module={module}
                      isAdded={enabledSet.has(enablementId)}
                      adopting={adoptingId === module.slug}
                      onAdd={handleUseModule}
                    />
                  );
                })}
              </ul>
            )}
          </div>

          <div className="project-modal__footer log-config-module-modal__footer">
            <p className="log-config-module-modal__footer-hint">
              {loading
                ? "Loading…"
                : `${filteredModules.length} module${filteredModules.length === 1 ? "" : "s"} available`}
            </p>
            <UiButton type="button" variant="ghost" onClick={onClose}>
              Close
            </UiButton>
          </div>
        </div>
      </div>
    </ProjectModalPortal>
  );
}
