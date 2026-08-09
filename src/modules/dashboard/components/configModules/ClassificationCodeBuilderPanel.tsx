"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  Checkbox,
  ConfirmDialog,
  EditIcon,
  Input,
  TableRowActionsMenu,
  Toggle,
  TrashIcon,
  UiButton,
} from "@/shared/components/ui";
import {
  CLASSIFICATION_CODES_MAX_COUNT,
  cloneClassificationCode,
  createBlankClassificationCode,
  getClassificationGraphicUrl,
  type ClassificationCode,
  type WorkflowSettings,
  type StoredModuleSettings,
} from "../../utils/configModuleSettings";
import { EditClassificationCodeForm } from "./EditClassificationCodeForm";
import { GraphicCodeLabel } from "./GraphicCodeLabel";

const PAGE_SIZE = 25;

type ClassificationCodeBuilderPanelProps = Readonly<{
  workflow: WorkflowSettings;
  subsurfaceSettings?: StoredModuleSettings;
  disabled?: boolean;
  onChange: (workflow: WorkflowSettings) => void;
}>;

type EditorState =
  | { mode: "closed" }
  | { mode: "create"; draft: ClassificationCode }
  | { mode: "edit"; draft: ClassificationCode };

function DuplicateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 15V5.5A1.5 1.5 0 016.5 4H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21V9m0 0l4 4m-4-4l-4 4M5 5h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClassificationCodeBuilderPanel({
  workflow,
  subsurfaceSettings,
  disabled = false,
  onChange,
}: ClassificationCodeBuilderPanelProps) {
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<ClassificationCode | null>(null);
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });

  const codes = workflow.classificationCodes ?? [];
  const applyClassificationRules = workflow.applyClassificationRules ?? true;

  const emitCodes = (classificationCodes: ClassificationCode[]) => {
    onChange({ ...workflow, classificationCodes });
  };

  const filteredCodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return codes;
    return codes.filter(
      (code) =>
        code.name.toLowerCase().includes(query) ||
        code.abbreviation.toLowerCase().includes(query)
    );
  }, [codes, search]);

  const pageCount = Math.max(1, Math.ceil(filteredCodes.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageCodes = filteredCodes.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const pageIds = pageCodes.map((code) => code.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const somePageSelected = pageIds.some((id) => selectedIds.includes(id));

  const toggleSelectAllPage = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    );
  };

  const openCreate = () => {
    if (disabled || codes.length >= CLASSIFICATION_CODES_MAX_COUNT) return;
    setEditor({ mode: "create", draft: createBlankClassificationCode() });
  };

  const openEdit = (code: ClassificationCode) => {
    setEditor({ mode: "edit", draft: cloneClassificationCode(code) });
  };

  const closeEditor = () => setEditor({ mode: "closed" });

  const saveEditor = (nextCode: ClassificationCode, applyGraphicToIds: string[]) => {
    let nextCodes =
      editor.mode === "create"
        ? [nextCode, ...codes]
        : codes.map((code) => (code.id === nextCode.id ? nextCode : code));

    if (applyGraphicToIds.length > 0) {
      const targetIds = new Set(applyGraphicToIds);
      nextCodes = nextCodes.map((code) => {
        if (!targetIds.has(code.id) || code.id === nextCode.id) return code;
        return {
          ...code,
          graphic: nextCode.graphic,
          fillOverrideColor: nextCode.fillOverrideColor ?? null,
          graphicColorOverlay: nextCode.graphicColorOverlay ?? null,
        };
      });
    }

    emitCodes(nextCodes);
    setSelectedIds([nextCode.id]);
    setEditor({ mode: "closed" });
    if (editor.mode === "create") {
      setPage(0);
      setSearch("");
    }
  };

  const duplicateCode = (code: ClassificationCode) => {
    if (disabled || codes.length >= CLASSIFICATION_CODES_MAX_COUNT) return;
    const copy = cloneClassificationCode({
      ...code,
      id: createBlankClassificationCode().id,
      name: `${code.name} (Copy)`,
    });
    const index = codes.findIndex((entry) => entry.id === code.id);
    const next = [...codes];
    next.splice(index + 1, 0, copy);
    emitCodes(next);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    emitCodes(codes.filter((code) => code.id !== deleteTarget.id));
    setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const downloadOriginalGraphics = () => {
    const targets =
      selectedIds.length > 0
        ? codes.filter((code) => selectedIds.includes(code.id))
        : codes;
    const lines = targets
      .map((code) => getClassificationGraphicUrl(code.graphic))
      .filter(Boolean);
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "original-graphics.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (editor.mode !== "closed") {
    return (
      <div className="log-config-class-builder log-config-class-builder--edit ui-scrollbar">
        <EditClassificationCodeForm
          code={editor.draft}
          allCodes={codes}
          workflowSteps={workflow.steps}
          subsurfaceSettings={subsurfaceSettings}
          isNew={editor.mode === "create"}
          disabled={disabled}
          onCancel={closeEditor}
          onSave={saveEditor}
        />
      </div>
    );
  }

  return (
    <section className="log-config-class-builder" aria-label="Manage classification codes">
      <div className="log-config-class-builder__header">
        <div className="log-config-class-builder__title-block">
          <h3 className="log-config-class-builder__title">
            Manage Classification Codes
            <span className="log-config-class-builder__apply">
              <Toggle
                id={`${formId}-apply-rules`}
                checked={applyClassificationRules}
                disabled={disabled}
                onChange={(checked) =>
                  onChange({ ...workflow, applyClassificationRules: checked })
                }
              />
              <label
                className="log-config-class-builder__apply-label"
                htmlFor={`${formId}-apply-rules`}
              >
                Apply the current classification code rules
              </label>
            </span>
          </h3>
        </div>
        <UiButton type="button" variant="primary" disabled={disabled} onClick={openCreate}>
          Add Classification Code
        </UiButton>
      </div>

      {/* <p className="log-config-class-builder__intro">
        Log configurations allow you to build and manage log configurations for your projects. This
        provides you with the flexibility to customise how you log information across geographical
        locations or types of projects.
      </p>

      <div className="log-config-class-builder__toolbar">
        <div className="log-config-class-builder__toolbar-actions">
          <UiButton
            type="button"
            variant="primary"
            disabled={disabled || codes.length === 0}
            onClick={downloadOriginalGraphics}
          >
            <DownloadIcon />
            Download Original Graphics
          </UiButton>
          <span className="log-config-class-builder__upload">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpeg,.jpg,.png,.svg"
              multiple
              hidden
              disabled={disabled}
              onChange={() => {
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <UiButton
              type="button"
              variant="primary"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon />
              Add New Graphic(s)
            </UiButton>
          </span>
        </div>
      </div> */}

      <div className="log-config-class-builder__search">
        <Input
          variant="ui"
          value={search}
          disabled={disabled}
          placeholder="Search"
          aria-label="Search classification codes"
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
        />
      </div>

      <div className="log-config-class-builder__table-wrap">
        <table className="log-config-class-builder__table">
          <thead>
            <tr>
              <th scope="col" className="log-config-class-builder__col-select">
                <Checkbox
                  checked={allPageSelected}
                  indeterminate={somePageSelected && !allPageSelected}
                  disabled={disabled || pageCodes.length === 0}
                  aria-label="Select all classification codes on this page"
                  onChange={toggleSelectAllPage}
                />
              </th>
              <th scope="col">Name</th>
              <th scope="col">Abbreviation</th>
              <th scope="col">Graphic</th>
              <th scope="col" className="log-config-class-builder__col-actions">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pageCodes.length === 0 ? (
              <tr>
                <td colSpan={5} className="log-config-class-builder__empty">
                  No classification codes match your search.
                </td>
              </tr>
            ) : (
              pageCodes.map((code) => {
                const selected = selectedIds.includes(code.id);
                const graphicUrl = getClassificationGraphicUrl(code.graphic);
                return (
                  <tr
                    key={code.id}
                    className={selected ? "is-selected" : undefined}
                    onClick={() => {
                      setSelectedIds([code.id]);
                      if (!disabled) openEdit(code);
                    }}
                  >
                    <td className="log-config-class-builder__col-select">
                      <Checkbox
                        checked={selected}
                        disabled={disabled}
                        aria-label={`Select ${code.name}`}
                        onChange={() => toggleSelect(code.id)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="log-config-class-builder__name-btn"
                        disabled={disabled}
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(code);
                        }}
                      >
                        {code.name}
                      </button>
                    </td>
                    <td>{code.abbreviation || "—"}</td>
                    <td>
                      {graphicUrl ? (
                        <div className="log-config-class-builder__graphic">
                          <img
                            className="log-config-class-builder__graphic-preview"
                            src={graphicUrl}
                            alt={`${code.abbreviation || code.name} graphic`}
                            title={code.abbreviation || code.name}
                            loading="lazy"
                            decoding="async"
                          />
                          {code.abbreviation ? (
                            <GraphicCodeLabel
                              text={code.abbreviation}
                              tooltip={code.name}
                              className="log-config-class-builder__graphic-code"
                            />
                          ) : null}
                        </div>
                      ) : (
                        <span className="log-config-class-builder__no-graphic">—</span>
                      )}
                    </td>
                    <td
                      className="log-config-class-builder__col-actions"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <TableRowActionsMenu
                        label={`Actions for ${code.name}`}
                        actions={[
                          {
                            id: "edit",
                            label: "Edit",
                            icon: <EditIcon />,
                            onClick: () => openEdit(code),
                          },
                          {
                            id: "duplicate",
                            label: "Duplicate",
                            icon: <DuplicateIcon />,
                            disabled: codes.length >= CLASSIFICATION_CODES_MAX_COUNT,
                            onClick: () => duplicateCode(code),
                          },
                          {
                            id: "delete",
                            label: "Delete",
                            icon: <TrashIcon />,
                            onClick: () => setDeleteTarget(code),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="log-config-class-builder__pager">
        <span className="log-config-class-builder__pager-meta">
          {filteredCodes.length === 0
            ? "0 codes"
            : `${safePage * PAGE_SIZE + 1}–${Math.min(
                (safePage + 1) * PAGE_SIZE,
                filteredCodes.length
              )} of ${filteredCodes.length}`}
        </span>
        <div className="log-config-class-builder__pager-actions">
          <UiButton
            type="button"
            variant="ghost"
            disabled={safePage <= 0}
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
          >
            Previous
          </UiButton>
          <UiButton
            type="button"
            variant="ghost"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((prev) => Math.min(pageCount - 1, prev + 1))}
          >
            Next
          </UiButton>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete classification code?"
        message={
          deleteTarget
            ? `Remove “${deleteTarget.name}” from this configuration?`
            : "Remove this classification code?"
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
