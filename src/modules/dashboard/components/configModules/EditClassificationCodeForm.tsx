"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  FormField,
  Input,
  MultiSelect,
  Select,
  IconButton,
  UiButton,
} from "@/shared/components/ui";
import {
  CLASSIFICATION_CODE_ABBREVIATION_MAX_LENGTH,
  CLASSIFICATION_CODE_NAME_MAX_LENGTH,
  CLASSIFICATION_RULE_CONDITIONS,
  CLASSIFICATION_RULE_FIELDS,
  cloneClassificationCode,
  createBlankClassificationRuleCondition,
  createEmptyClassificationRuleGroup,
  getClassificationGraphicUrl,
  type ClassificationCode,
  type ClassificationRuleGroup,
  type ClassificationRuleLeaf,
  type ClassificationRuleNode,
  type StoredModuleSettings,
  type WorkflowStep,
} from "../../utils/configModuleSettings";
import {
  getConditionIsValueOptions,
  getWorkflowStepFieldOptions,
} from "../../utils/configModules/workflowStepEditor";
import {
  listClassificationGraphics,
  type ClassificationGraphic,
} from "../../services/classificationGraphicsApi";
import { GraphicCodeLabel } from "./GraphicCodeLabel";

type EditClassificationCodeFormProps = Readonly<{
  code: ClassificationCode;
  allCodes: readonly ClassificationCode[];
  workflowSteps?: readonly WorkflowStep[];
  subsurfaceSettings?: StoredModuleSettings;
  isNew?: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onSave: (code: ClassificationCode, applyGraphicToIds: string[]) => void;
}>;

const CONDITION_LABELS: Record<string, string> = {
  equal_one: "Equals one of",
  equal_all: "Equals all of",
  equal_null: "Is empty",
  not_equal: "Does not equal",
  not_contains_any: "Does not contain any of",
  contains_one_or_more: "Contains one or more of",
};

function ColorField({
  id,
  label,
  value,
  disabled,
  onChange,
  onClear,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
}>) {
  const hex = value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "#ffffff";
  return (
    <div className="log-config-class-edit__color-row">
      <FormField label={label} htmlFor={id} className="log-config-class-edit__color-field">
        <div className="log-config-class-edit__color-inputs">
          <input
            id={id}
            type="color"
            className="log-config-class-edit__color-swatch"
            value={hex}
            disabled={disabled}
            aria-label={label}
            onChange={(event) => onChange(event.target.value)}
          />
          <Input
            variant="ui"
            value={value}
            disabled={disabled}
            placeholder="#ffffff"
            aria-label={`${label} value`}
            onChange={(event) => onChange(event.target.value)}
          />
          <span
            className="log-config-class-edit__color-chip"
            style={{ backgroundColor: value || "transparent" }}
            aria-hidden="true"
          />
        </div>
      </FormField>
      <UiButton
        type="button"
        variant="outline"
        className="log-config-class-edit__clear-btn"
        disabled={disabled || !value}
        onClick={onClear}
      >
        Clear
      </UiButton>
    </div>
  );
}

function updateNodeInTree(
  root: ClassificationRuleGroup,
  targetId: string,
  updater: (node: ClassificationRuleNode) => ClassificationRuleNode | null
): ClassificationRuleGroup {
  const walk = (node: ClassificationRuleNode): ClassificationRuleNode | null => {
    if (node.id === targetId) return updater(node);
    if (node.kind !== "group") return node;
    const nextRules: ClassificationRuleNode[] = [];
    for (const child of node.rules) {
      const next = walk(child);
      if (next) nextRules.push(next);
    }
    return { ...node, rules: nextRules };
  };

  const nextRoot = walk(root);
  if (!nextRoot || nextRoot.kind !== "group") return createEmptyClassificationRuleGroup();
  return nextRoot;
}

function RuleConditionEditor({
  rule,
  workflowSteps,
  subsurfaceSettings,
  disabled,
  onChange,
  onRemove,
}: Readonly<{
  rule: ClassificationRuleLeaf;
  workflowSteps: readonly WorkflowStep[];
  subsurfaceSettings?: StoredModuleSettings;
  disabled?: boolean;
  onChange: (next: ClassificationRuleLeaf) => void;
  onRemove: () => void;
}>) {
  const fieldOptions = useMemo(() => {
    const fromWorkflow = getWorkflowStepFieldOptions([...workflowSteps]);
    const fields = new Map<string, string>();
    for (const field of CLASSIFICATION_RULE_FIELDS) {
      fields.set(field, field);
    }
    for (const option of fromWorkflow) {
      fields.set(option.value, option.label);
    }
    if (rule.field) fields.set(rule.field, rule.field);
    return Array.from(fields.entries()).map(([value, label]) => ({ value, label }));
  }, [rule.field, workflowSteps]);

  const valueOptions = useMemo(() => {
    const choices = getConditionIsValueOptions(
      [...workflowSteps],
      { field: rule.field, searchTerm: rule.searchTerm },
      subsurfaceSettings
    );
    const seen = new Set(choices.map((entry) => entry.value.toLowerCase()));
    for (const value of rule.value) {
      if (!value.trim() || seen.has(value.toLowerCase())) continue;
      seen.add(value.toLowerCase());
      choices.push({ value, label: value });
    }
    return choices;
  }, [rule.field, rule.searchTerm, rule.value, subsurfaceSettings, workflowSteps]);

  const needsValue = rule.condition !== "equal_null";

  return (
    <div className="log-config-class-rules__condition">
      <Select
        value={rule.field}
        disabled={disabled}
        options={fieldOptions}
        onChange={(field) =>
          onChange({
            ...rule,
            field,
            searchTerm: field,
            value: [],
          })
        }
      />
      <Select
        value={rule.condition}
        disabled={disabled}
        options={CLASSIFICATION_RULE_CONDITIONS.map((condition) => ({
          value: condition,
          label: CONDITION_LABELS[condition] ?? condition,
        }))}
        onChange={(condition) => {
          const nextCondition = condition as ClassificationRuleLeaf["condition"];
          onChange({
            ...rule,
            condition: nextCondition,
            value: nextCondition === "equal_null" ? [] : rule.value,
          });
        }}
      />
      {needsValue ? (
        valueOptions.length > 0 ? (
          <MultiSelect
            value={rule.value}
            disabled={disabled}
            options={valueOptions}
            placeholder="Select values"
            search
            floatingMenu
            onChange={(value) => onChange({ ...rule, value })}
          />
        ) : (
          <Input
            variant="ui"
            value={rule.value.join(", ")}
            disabled={disabled}
            placeholder="Values (comma separated)"
            aria-label="Condition values"
            onChange={(event) =>
              onChange({
                ...rule,
                value: event.target.value
                  .split(",")
                  .map((entry) => entry.trim())
                  .filter(Boolean),
              })
            }
          />
        )
      ) : (
        <Input
          variant="ui"
          value=""
          disabled
          placeholder="No value needed"
          aria-label="Condition values"
        />
      )}
      <UiButton
        type="button"
        variant="danger"
        className="log-config-class-rules__condition-remove"
        disabled={disabled}
        onClick={onRemove}
      >
        Remove
      </UiButton>
    </div>
  );
}

function RuleGroupEditor({
  group,
  workflowSteps,
  subsurfaceSettings,
  depth = 0,
  disabled,
  canRemoveGroup = false,
  onChange,
  onRemoveGroup,
}: Readonly<{
  group: ClassificationRuleGroup;
  workflowSteps: readonly WorkflowStep[];
  subsurfaceSettings?: StoredModuleSettings;
  depth?: number;
  disabled?: boolean;
  canRemoveGroup?: boolean;
  onChange: (next: ClassificationRuleGroup) => void;
  onRemoveGroup?: () => void;
}>) {
  const [collapsed, setCollapsed] = useState(false);

  const addCondition = () => {
    onChange({
      ...group,
      rules: [...group.rules, createBlankClassificationRuleCondition()],
    });
  };

  const addGroup = () => {
    onChange({
      ...group,
      rules: [...group.rules, createEmptyClassificationRuleGroup()],
    });
  };

  const clearGroup = () => {
    onChange({ ...group, rules: [] });
  };

  return (
    <div className={`log-config-class-rules__group${depth > 0 ? " is-nested" : ""}`}>
      <div className="log-config-class-rules__toolbar">
        <Select
          value={group.operator}
          disabled={disabled}
          options={[
            { value: "AND", label: "AND" },
            { value: "OR", label: "OR" },
          ]}
          onChange={(operator) =>
            onChange({ ...group, operator: operator === "OR" ? "OR" : "AND" })
          }
        />
        <UiButton type="button" variant="primary" disabled={disabled} onClick={addCondition}>
          Condition
        </UiButton>
        <UiButton type="button" variant="primary" disabled={disabled} onClick={addGroup}>
          Group
        </UiButton>
        {canRemoveGroup && onRemoveGroup ? (
          <UiButton type="button" variant="danger" disabled={disabled} onClick={onRemoveGroup}>
            − Group
          </UiButton>
        ) : (
          <UiButton type="button" variant="danger" disabled={disabled} onClick={clearGroup}>
            Clear
          </UiButton>
        )}
        <UiButton type="button" variant="secondary" onClick={() => setCollapsed((prev) => !prev)}>
          {collapsed ? "Expand" : "Collapse"}
        </UiButton>
      </div>

      {!collapsed ? (
        <div className="log-config-class-rules__body">
          {group.rules.length === 0 ? (
            <p className="log-config-class-rules__empty">
              No conditions yet. Add a condition or nested group.
            </p>
          ) : (
            group.rules.map((node) =>
              node.kind === "condition" ? (
                <RuleConditionEditor
                  key={node.id}
                  rule={node}
                  workflowSteps={workflowSteps}
                  subsurfaceSettings={subsurfaceSettings}
                  disabled={disabled}
                  onChange={(next) =>
                    onChange(updateNodeInTree(group, node.id, () => next))
                  }
                  onRemove={() =>
                    onChange(updateNodeInTree(group, node.id, () => null))
                  }
                />
              ) : (
                <RuleGroupEditor
                  key={node.id}
                  group={node}
                  workflowSteps={workflowSteps}
                  subsurfaceSettings={subsurfaceSettings}
                  depth={depth + 1}
                  disabled={disabled}
                  canRemoveGroup
                  onChange={(next) =>
                    onChange(updateNodeInTree(group, node.id, () => next))
                  }
                  onRemoveGroup={() =>
                    onChange(updateNodeInTree(group, node.id, () => null))
                  }
                />
              )
            )
          )}
        </div>
      ) : null}
    </div>
  );
}

export function EditClassificationCodeForm({
  code,
  allCodes,
  workflowSteps = [],
  subsurfaceSettings,
  isNew = false,
  disabled = false,
  onCancel,
  onSave,
}: EditClassificationCodeFormProps) {
  const formId = useId();
  const [draft, setDraft] = useState(() => cloneClassificationCode(code));
  const [graphicModalOpen, setGraphicModalOpen] = useState(false);
  const [graphicFilter, setGraphicFilter] = useState("");
  const [graphics, setGraphics] = useState<ClassificationGraphic[]>([]);
  const [graphicsLoading, setGraphicsLoading] = useState(false);
  const [graphicsError, setGraphicsError] = useState<string | null>(null);

  useEffect(() => {
    if (!graphicModalOpen) {
      setGraphics([]);
      setGraphicsError(null);
      setGraphicsLoading(false);
      return;
    }

    let cancelled = false;
    setGraphics([]);
    setGraphicsLoading(true);
    setGraphicsError(null);

    listClassificationGraphics()
      .then((items) => {
        if (!cancelled) setGraphics(items);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Failed to load classification graphics.";
        setGraphicsError(message);
        setGraphics([]);
      })
      .finally(() => {
        if (!cancelled) setGraphicsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [graphicModalOpen]);

  const otherCodeOptions = useMemo(
    () =>
      allCodes
        .filter((entry) => entry.id !== code.id)
        .map((entry) => ({
          value: entry.id,
          label: `${entry.name}${entry.abbreviation ? ` (${entry.abbreviation})` : ""}`,
        })),
    [allCodes, code.id]
  );

  const filteredGraphics = useMemo(() => {
    const query = graphicFilter.trim().toLowerCase();
    if (!query) return graphics;
    return graphics.filter(
      (graphic) =>
        graphic.code.toLowerCase().includes(query) ||
        graphic.path.toLowerCase().includes(query)
    );
  }, [graphicFilter, graphics]);

  const selectedGraphicCode = useMemo(() => {
    const match = graphics.find((graphic) => graphic.path === draft.graphic);
    if (match) return match.code;
    if (draft.abbreviation.trim()) return draft.abbreviation.trim();
    if (draft.graphic) {
      return draft.graphic.replace(/\.png$/i, "");
    }
    return "";
  }, [graphics, draft.graphic, draft.abbreviation]);

  const graphicUrl = getClassificationGraphicUrl(draft.graphic);

  const patch = (partial: Partial<ClassificationCode>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const handleSave = () => {
    const name = draft.name.trim();
    if (!name || disabled) return;
    onSave(
      {
        ...draft,
        name: name.slice(0, CLASSIFICATION_CODE_NAME_MAX_LENGTH),
        abbreviation: draft.abbreviation
          .trim()
          .slice(0, CLASSIFICATION_CODE_ABBREVIATION_MAX_LENGTH),
        graphicColorOverlay: draft.graphicColorOverlay || null,
        fillOverrideColor: draft.fillOverrideColor || null,
        rules: draft.rules ?? createEmptyClassificationRuleGroup(),
      },
      draft.applyGraphicToIds ?? []
    );
  };

  return (
    <div className="log-config-class-edit">
      <header className="log-config-class-edit__intro">
        <h2 className="log-config-class-edit__title">
          {isNew ? "Add Classification" : "Edit Classification:"}
          {!isNew && draft.name ? ` ${draft.name}` : null}
        </h2>

      </header>

      <section className="log-config-class-edit__card">
        <div className="log-config-class-edit__card-header">
          <p className="log-config-class-edit__card-title">Classification information</p>
          
        </div>
        <div className="log-config-class-edit__card-body">
          <FormField label="Classification Name" htmlFor={`${formId}-name`} required>
            <Input
              id={`${formId}-name`}
              variant="ui"
              value={draft.name}
              disabled={disabled}
              maxLength={CLASSIFICATION_CODE_NAME_MAX_LENGTH}
              onChange={(event) => patch({ name: event.target.value })}
            />
          </FormField>
          <FormField label="Classification Abbreviation" htmlFor={`${formId}-abbr`}>
            <Input
              id={`${formId}-abbr`}
              variant="ui"
              value={draft.abbreviation}
              disabled={disabled}
              maxLength={CLASSIFICATION_CODE_ABBREVIATION_MAX_LENGTH}
              onChange={(event) => patch({ abbreviation: event.target.value })}
            />
          </FormField>
        </div>
      </section>

      <section className="log-config-class-edit__card">
        <div className="log-config-class-edit__card-header">
          <p className="log-config-class-edit__card-title">Classification Graphic</p>
          <p className="log-config-class-edit__card-desc">Set what graphic is used for</p>
        </div>
        <div className="log-config-class-edit__card-body">
          <FormField label="Classification Graphic" htmlFor={`${formId}-graphic`}>
            <button
              id={`${formId}-graphic`}
              type="button"
              className="log-config-class-edit__graphic-picker"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                setGraphicFilter("");
                setGraphics([]);
                setGraphicsError(null);
                setGraphicModalOpen(true);
              }}
            >
              {graphicUrl ? (
                <span className="log-config-class-edit__graphic-frame">
                  <img
                    src={graphicUrl}
                    alt={draft.abbreviation || draft.name || "Classification graphic"}
                    className="log-config-class-edit__graphic-img"
                  />
                  {selectedGraphicCode ? (
                    <GraphicCodeLabel
                      text={selectedGraphicCode}
                      className="log-config-class-edit__graphic-code"
                    />
                  ) : null}
                  {draft.fillOverrideColor || draft.graphicColorOverlay ? (
                    <span
                      className="log-config-class-edit__graphic-overlay"
                      style={{
                        backgroundColor:
                          draft.graphicColorOverlay || draft.fillOverrideColor || "transparent",
                      }}
                    />
                  ) : null}
                </span>
              ) : (
                <span className="log-config-class-edit__graphic-empty">Click to select a graphic</span>
              )}
              <span className="log-config-class-edit__graphic-name">
                {draft.graphic || "No graphic selected"}
              </span>
            </button>
          </FormField>

          <ColorField
            id={`${formId}-fill`}
            label="Select graphic color"
            value={draft.fillOverrideColor ?? ""}
            disabled={disabled}
            onChange={(value) => patch({ fillOverrideColor: value })}
            onClear={() => patch({ fillOverrideColor: null })}
          />

          <ColorField
            id={`${formId}-overlay`}
            label="Select graphic overlay color"
            value={draft.graphicColorOverlay ?? ""}
            disabled={disabled}
            onChange={(value) => patch({ graphicColorOverlay: value })}
            onClear={() => patch({ graphicColorOverlay: null })}
          />

          <FormField
            label="Apply this graphic to other Soil Classifications"
            htmlFor={`${formId}-apply-graphic`}
          >
            <MultiSelect
              id={`${formId}-apply-graphic`}
              value={draft.applyGraphicToIds ?? []}
              options={otherCodeOptions}
              placeholder="Select classification code"
              search
              disabled={disabled || otherCodeOptions.length === 0}
              onChange={(applyGraphicToIds) => patch({ applyGraphicToIds })}
            />
          </FormField>
        </div>
      </section>

      {graphicModalOpen
        ? createPortal(
            <div className="project-modal" role="dialog" aria-modal="true">
              <button
                type="button"
                className="project-modal__backdrop"
                aria-label="Close graphic selector"
                onClick={() => setGraphicModalOpen(false)}
                disabled={disabled}
              />
              <div className="project-modal__dialog project-modal__dialog--scroll log-config-class-edit__graphic-modal-dialog">
                <div className="project-modal__header">
                  <div className="log-config-class-edit__graphic-modal-head">
                    <div>
                      <h3 className="log-config-class-edit__graphic-modal-title">Select Graphic</h3>
                      <p className="log-config-class-edit__graphic-modal-subtitle">
                        Choose a graphic for this classification.
                      </p>
                    </div>
                    <IconButton
                      label="Close"
                      size="sm"
                      className="log-config-class-edit__graphic-modal-close"
                      onClick={() => setGraphicModalOpen(false)}
                      disabled={disabled}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </IconButton>
                  </div>
                </div>

                <div className="log-config-class-edit__graphic-modal-body">
                  <Input
                    variant="ui"
                    value={graphicFilter}
                    disabled={disabled}
                    placeholder="Search graphics"
                    aria-label="Search graphics"
                    onChange={(event) => setGraphicFilter(event.target.value)}
                  />

                  <div
                    className="log-config-class-edit__picker-grid log-config-class-edit__picker-grid--modal"
                    role="listbox"
                    aria-label="Graphics"
                  >
                    {graphicsLoading ? (
                      <p className="log-config-class-edit__graphic-modal-status">Loading graphics...</p>
                    ) : graphicsError ? (
                      <p className="log-config-class-edit__graphic-modal-status is-error">{graphicsError}</p>
                    ) : filteredGraphics.length === 0 ? (
                      <p className="log-config-class-edit__graphic-modal-status">No graphics found.</p>
                    ) : (
                      filteredGraphics.map((graphic) => {
                        const selected = draft.graphic === graphic.path;
                        return (
                          <button
                            key={graphic.path}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={`log-config-class-edit__picker-item${
                              selected ? " is-selected" : ""
                            }`}
                            disabled={disabled}
                            title={`${graphic.code} (${graphic.path})`}
                            onClick={() => patch({ graphic: graphic.path })}
                          >
                            <span className="log-config-class-edit__picker-thumb">
                              <img src={graphic.full_path} alt={graphic.code} />
                              <GraphicCodeLabel
                                text={graphic.code}
                                className="log-config-class-edit__picker-code"
                              />
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="log-config-class-edit__graphic-modal-actions">
                    <UiButton
                      type="button"
                      variant="primary"
                      onClick={() => setGraphicModalOpen(false)}
                      disabled={disabled}
                    >
                      Done
                    </UiButton>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <section className="log-config-class-edit__card">
        <div className="log-config-class-edit__card-header">
          <p className="log-config-class-edit__card-title">Classification Rules</p>
          <p className="log-config-class-edit__card-desc">
            Define the logic that will determine if this classification is applied
          </p>
        </div>
        <div className="log-config-class-edit__card-body">
          <RuleGroupEditor
            group={draft.rules ?? createEmptyClassificationRuleGroup()}
            workflowSteps={workflowSteps}
            subsurfaceSettings={subsurfaceSettings}
            disabled={disabled}
            onChange={(rules) => patch({ rules })}
          />
        </div>
      </section>

      <footer className="log-config-class-edit__footer">
        <UiButton type="button" variant="outline" disabled={disabled} onClick={onCancel}>
          Cancel
        </UiButton>
        <UiButton
          type="button"
          variant="primary"
          disabled={disabled || !draft.name.trim()}
          onClick={handleSave}
        >
          Save
        </UiButton>
      </footer>
    </div>
  );
}
