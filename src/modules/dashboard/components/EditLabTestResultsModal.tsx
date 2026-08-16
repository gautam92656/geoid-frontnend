"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Input,
  PlusIcon,
  ProjectModalPortal,
  Select,
  TrashIcon,
  UiButton,
} from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { useUserLabTestTypes } from "../hooks/useUserLabTestTypes";
import { listLogSamples } from "../services/logSampleApi";
import type { LogLabTest, LabTestResultValues } from "../types/logLabTest";
import type { LogSample } from "../types/logSample";
import {
  DEFAULT_LAB_TEST_TYPE_OPTIONS,
  LAB_TESTS_MODULE_ID,
  type LabTestResultField,
  type LabTestTypeOption,
} from "../utils/configModules";
import { ManageLabTestTypesModal } from "./configModules/ManageLabTestTypesModal";

export type LabTestResultFormPayload = {
  depthFrom: string;
  depthTo: string;
  testTypeId: string;
  testTypeName: string;
  results: string;
  comments: string;
  resultValues: LabTestResultValues;
  sampleId: string | null;
  sampleNo: string;
};

type EditLabTestResultsModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  projectId: number;
  logId: number;
  logConfigurationId: string;
  testTypes: LabTestTypeOption[];
  initialTest?: LogLabTest | null;
  onSubmit?: (payloads: LabTestResultFormPayload[]) => void | Promise<void>;
  onTestTypesChange?: (options: LabTestTypeOption[]) => void;
}>;

type EntryDraft = {
  key: string;
  sampleId: string;
  sampleNo: string;
  depthFrom: string;
  depthTo: string;
  results: string;
  fieldValues: Record<string, string>;
};

type DraftState = {
  testTypeId: string;
  entries: EntryDraft[];
};

type DraftErrors = {
  testTypeId?: string;
  entries?: string;
  [key: string]: string | undefined;
};

function createEntryKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `lab-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resultFieldsForType(option: LabTestTypeOption | null): LabTestResultField[] {
  return (option?.labTestResultFields ?? []).filter((field) => field.name.trim());
}

function asStoredString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function fieldValuesFromStored(
  fields: LabTestResultField[],
  resultValues: LabTestResultValues | undefined,
  fallbackResults = ""
): Record<string, string> {
  const stored = resultValues ?? {};
  const values: Record<string, string> = {};
  fields.forEach((field, index) => {
    const byId = asStoredString(stored[field.id]).trim();
    const byName = asStoredString(stored[field.name]).trim();
    const alias = field.tablogsAlias?.trim() ?? "";
    const byAlias = alias ? asStoredString(stored[alias]).trim() : "";
    if (byId) {
      values[field.id] = byId;
      return;
    }
    if (byName) {
      values[field.id] = byName;
      return;
    }
    if (byAlias) {
      values[field.id] = byAlias;
      return;
    }
    if (fields.length === 1 && fallbackResults.trim()) {
      values[field.id] = fallbackResults.trim();
      return;
    }
    if (index === 0 && fallbackResults.trim() && Object.keys(stored).length === 0) {
      values[field.id] = fallbackResults.trim();
    }
  });
  return values;
}

function summarizeResultFields(
  fields: LabTestResultField[],
  fieldValues: Record<string, string>,
  fallbackResults = ""
): string {
  if (fields.length === 0) return fallbackResults.trim();
  if (fields.length === 1) {
    return (fieldValues[fields[0].id] ?? "").trim();
  }
  return fields
    .map((field) => {
      const value = (fieldValues[field.id] ?? "").trim();
      return value ? `${field.name.trim()}: ${value}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

function createBlankEntry(): EntryDraft {
  return {
    key: createEntryKey(),
    sampleId: "",
    sampleNo: "",
    depthFrom: "",
    depthTo: "",
    results: "",
    fieldValues: {},
  };
}

function createDraft(
  testTypes: LabTestTypeOption[],
  mode: "add" | "edit",
  initial?: LogLabTest | null
): DraftState {
  if (mode === "edit" && initial) {
    const selected =
      testTypes.find((entry) => entry.id === initial.testTypeId) ?? null;
    const fields = resultFieldsForType(selected);
    return {
      testTypeId: initial.testTypeId || "",
      entries: [
        {
          key: createEntryKey(),
          sampleId: initial.sampleId ?? "",
          sampleNo: initial.sampleNo ?? "",
          depthFrom: initial.depthFrom,
          depthTo: initial.depthTo,
          results: initial.results,
          fieldValues: fieldValuesFromStored(fields, initial.resultValues, initial.results),
        },
      ],
    };
  }

  const firstActive = testTypes.find((entry) => entry.active !== false) ?? testTypes[0] ?? null;
  return {
    testTypeId: firstActive?.id ?? "",
    entries: [createBlankEntry()],
  };
}

function sampleOptionLabel(sample: LogSample): string {
  const no = sample.sampleNo.trim();
  return no || `Sample #${sample.id}`;
}

function UploadCloudIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 18a4.5 4.5 0 01.4-9 5.5 5.5 0 0110.7 1.5A3.5 3.5 0 0118.5 18H7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 15V9m0 0l-2.5 2.5M12 9l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function EditLabTestResultsModal({
  open,
  onClose,
  mode = "add",
  projectId,
  logId,
  logConfigurationId,
  testTypes,
  initialTest = null,
  onSubmit,
  onTestTypesChange,
}: EditLabTestResultsModalProps) {
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [workingTypes, setWorkingTypes] = useState<LabTestTypeOption[]>(testTypes);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(testTypes, mode, initialTest));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);
  const [samples, setSamples] = useState<LogSample[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);

  const canManageTypes = Boolean(logConfigurationId.trim());
  const labTestTypesApi = useUserLabTestTypes(LAB_TESTS_MODULE_ID, {
    enabled: manageTypesOpen && canManageTypes,
    logConfigurationId,
  });

  const manageTypeOptions =
    manageTypesOpen && labTestTypesApi.items.length > 0
      ? labTestTypesApi.items
      : workingTypes;

  const activeTypes = useMemo(
    () => workingTypes.filter((entry) => entry.active !== false),
    [workingTypes]
  );

  const selectableTypes = useMemo(() => {
    if (mode !== "edit" || !initialTest?.testTypeId) return activeTypes;
    const existing = workingTypes.find((entry) => entry.id === initialTest.testTypeId);
    if (!existing || activeTypes.some((entry) => entry.id === existing.id)) {
      return activeTypes;
    }
    return [existing, ...activeTypes];
  }, [activeTypes, initialTest, mode, workingTypes]);

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.testTypeId) ??
      workingTypes.find((entry) => entry.id === draft.testTypeId) ??
      null,
    [draft.testTypeId, selectableTypes, workingTypes]
  );

  const resultFields = useMemo(() => resultFieldsForType(selectedType), [selectedType]);

  const typeOptions = useMemo(
    () =>
      selectableTypes.map((entry) => ({
        value: entry.id,
        label: entry.name,
      })),
    [selectableTypes]
  );

  const sampleOptions = useMemo(
    () => [
      { value: "", label: loadingSamples ? "Loading…" : "Select sample" },
      ...samples.map((sample) => ({
        value: sample.id,
        label: sampleOptionLabel(sample),
      })),
    ],
    [loadingSamples, samples]
  );

  const typeName = selectedType?.name?.trim() || "Lab Test";
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return;
    }
    const justOpened = !prevOpenRef.current;
    prevOpenRef.current = true;
    setWorkingTypes(testTypes);
    if (!justOpened) return;
    setDraft(createDraft(testTypes, mode, initialTest));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    setHasUploaded(false);
  }, [open, testTypes, mode, initialTest]);

  useEffect(() => {
    if (!open || !projectId || !logId) {
      if (!open) setSamples([]);
      return;
    }
    let cancelled = false;
    setLoadingSamples(true);
    void (async () => {
      try {
        const pageSize = MAX_TABLE_PAGE_SIZE;
        const first = await listLogSamples(projectId, logId, 1, pageSize, {
          sortBy: "sortOrder",
          sortOrder: "asc",
        });
        const loaded = [...first.data];
        const totalPages = Math.max(1, first.totalPages || Math.ceil((first.total || 0) / pageSize));
        for (let page = 2; page <= totalPages && !cancelled; page += 1) {
          const next = await listLogSamples(projectId, logId, page, pageSize, {
            sortBy: "sortOrder",
            sortOrder: "asc",
          });
          loaded.push(...next.data);
        }
        if (cancelled) return;
        setSamples(loaded);
      } catch (err) {
        if (!cancelled) {
          setSamples([]);
          showApiError(err, API_ERROR_MESSAGES.LOAD_LOG_SAMPLES);
        }
      } finally {
        if (!cancelled) setLoadingSamples(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, logId]);

  useEffect(() => {
    if (!open || manageTypesOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, manageTypesOpen, onClose]);

  const handleManageTypesSave = async (options: LabTestTypeOption[]) => {
    const saved = await labTestTypesApi.save(options);
    setWorkingTypes(saved);
    onTestTypesChange?.(saved);
    setManageTypesOpen(false);
    showApiSuccess(undefined, "Lab test types updated.");
  };

  const handleTypeChange = (testTypeId: string) => {
    setDraft((prev) => ({
      testTypeId,
      entries:
        prev.entries.length > 0
          ? prev.entries.map((entry) => ({ ...entry, fieldValues: {}, results: "" }))
          : [createBlankEntry()],
    }));
    setErrors((prev) => ({ ...prev, testTypeId: undefined }));
    setHasUploaded(false);
  };

  const updateEntry = (key: string, patch: Partial<EntryDraft>) => {
    setDraft((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)),
    }));
  };

  const updateFieldValue = (key: string, fieldId: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) =>
        entry.key === key
          ? { ...entry, fieldValues: { ...entry.fieldValues, [fieldId]: value } }
          : entry
      ),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`entry-${key}-field-${fieldId}`];
      delete next[`entry-${key}-results`];
      return next;
    });
  };

  const handleSampleChange = (key: string, sampleId: string) => {
    const sample = samples.find((entry) => entry.id === sampleId) ?? null;
    updateEntry(key, {
      sampleId,
      sampleNo: sample?.sampleNo ?? "",
      depthFrom: sample?.depthFrom ?? "",
      depthTo: sample?.depthTo ?? "",
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`entry-${key}-depthFrom`];
      return next;
    });
  };

  const addEntry = () => {
    setDraft((prev) => ({
      ...prev,
      entries: [...prev.entries, createBlankEntry()],
    }));
  };

  const removeEntry = (key: string) => {
    setDraft((prev) => {
      if (prev.entries.length <= 1) return prev;
      return {
        ...prev,
        entries: prev.entries.filter((entry) => entry.key !== key),
      };
    });
  };

  const handleDownloadTemplate = () => {
    const resultHeaders =
      resultFields.length > 0 ? resultFields.map((field) => field.name.trim()) : ["Results"];
    const header = ["Sample No", "Depth From (m)", "Depth To (m)", ...resultHeaders];
    const rows = draft.entries.map((entry) => [
      entry.sampleNo ||
        samples.find((sample) => sample.id === entry.sampleId)?.sampleNo ||
        "",
      entry.depthFrom,
      entry.depthTo,
      ...(resultFields.length > 0
        ? resultFields.map((field) => entry.fieldValues[field.id] ?? "")
        : [entry.results]),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => csvEscape(String(cell ?? ""))).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${typeName.replace(/[^\w\-]+/g, "_")}_template.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        showApiError(undefined, "Uploaded file has no data rows.");
        return;
      }

      const header = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
      const sampleIdx = header.findIndex((cell) => cell.includes("sample"));
      const fromIdx = header.findIndex((cell) => cell.includes("from"));
      const toIdx = header.findIndex((cell) => cell.includes("to"));
      const resultsIdx = header.findIndex((cell) => cell.includes("result"));
      const fieldIndexes = resultFields.map((field) => {
        const name = field.name.trim().toLowerCase();
        const alias = field.tablogsAlias?.trim().toLowerCase() ?? "";
        const byName = header.findIndex((cell) => cell === name);
        if (byName >= 0) return byName;
        if (alias) {
          const byAlias = header.findIndex((cell) => cell === alias);
          if (byAlias >= 0) return byAlias;
        }
        return header.findIndex((cell) => cell.includes(name));
      });

      const nextEntries: EntryDraft[] = [];
      for (const line of lines.slice(1)) {
        const cells = parseCsvLine(line);
        const sampleNo = sampleIdx >= 0 ? cells[sampleIdx] ?? "" : "";
        const matched =
          samples.find(
            (sample) => sample.sampleNo.trim().toLowerCase() === sampleNo.trim().toLowerCase()
          ) ?? null;
        const fieldValues: Record<string, string> = {};
        resultFields.forEach((field, fieldIndex) => {
          const columnIndex = fieldIndexes[fieldIndex];
          fieldValues[field.id] = columnIndex >= 0 ? cells[columnIndex] ?? "" : "";
        });
        const results =
          resultFields.length > 0
            ? summarizeResultFields(resultFields, fieldValues)
            : resultsIdx >= 0
              ? cells[resultsIdx] ?? ""
              : "";
        nextEntries.push({
          key: createEntryKey(),
          sampleId: matched?.id ?? "",
          sampleNo: matched?.sampleNo ?? sampleNo,
          depthFrom:
            fromIdx >= 0 ? cells[fromIdx] ?? matched?.depthFrom ?? "" : matched?.depthFrom ?? "",
          depthTo: toIdx >= 0 ? cells[toIdx] ?? matched?.depthTo ?? "" : matched?.depthTo ?? "",
          results,
          fieldValues,
        });
      }

      if (!nextEntries.length) {
        showApiError(undefined, "No valid rows found in the uploaded file.");
        return;
      }

      setDraft((prev) => ({ ...prev, entries: nextEntries }));
      setHasUploaded(true);
      setErrors({});
      showApiSuccess(undefined, "Template uploaded.");
    } catch (err) {
      showApiError(err, "Failed to read uploaded file.");
    }
  };

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!draft.testTypeId.trim()) {
      next.testTypeId = "Select a lab test type.";
    }
    if (!draft.entries.length) {
      next.entries = "Add at least one sample row.";
    }

    draft.entries.forEach((entry, index) => {
      if (!entry.depthFrom.trim()) {
        next[`entry-${entry.key}-depthFrom`] = `Depth From is required on row ${index + 1}.`;
      }
      if (resultFields.length === 0 && !entry.results.trim()) {
        next[`entry-${entry.key}-results`] = `Results are required on row ${index + 1}.`;
      }
    });

    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!selectedType) {
      setErrors({ testTypeId: "Select a lab test type." });
      return;
    }

    const payloads: LabTestResultFormPayload[] = draft.entries.map((entry) => {
      const resultValues: LabTestResultValues = {};
      if (resultFields.length > 0) {
        for (const field of resultFields) {
          const value = (entry.fieldValues[field.id] ?? "").trim();
          resultValues[field.id] = value;
          resultValues[field.name] = value;
          if (field.tablogsAlias?.trim()) {
            resultValues[field.tablogsAlias.trim()] = value;
          }
        }
      } else if (entry.results.trim()) {
        resultValues.Result = entry.results.trim();
      }

      return {
        depthFrom: entry.depthFrom.trim(),
        depthTo: entry.depthTo.trim(),
        testTypeId: selectedType.id,
        testTypeName: selectedType.name,
        results: summarizeResultFields(resultFields, entry.fieldValues, entry.results),
        comments: "",
        resultValues,
        sampleId: entry.sampleId.trim() || null,
        sampleNo: entry.sampleNo.trim(),
      };
    });

    setSubmitting(true);
    try {
      await onSubmit?.(payloads);
      onClose();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LAB_TEST);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit Lab Test Results" : "Add Lab Test Results";

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close lab test results dialog"
            onClick={onClose}
          />
          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--wide project-modal__dialog--fields edit-lab-test-results-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${formId}-title`}
          >
            <div className="project-modal__header">
              <h2 id={`${formId}-title`} className="project-modal__title">
                {title}
              </h2>
            </div>

            <form className="project-modal__form" onSubmit={handleSubmit} noValidate>
              <div className="project-modal__body ui-scrollbar">
                <div className="project-modal__fields project-modal__fields--stack edit-lab-test-results-modal__fields">
                  <div
                    className={[
                      "ui-field",
                      "project-modal__field--full",
                      errors.testTypeId ? "ui-field--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="edit-lab-test-results-modal__type-field-head">
                      <label className="ui-field__label" htmlFor={`${formId}-type`}>
                        Select Lab Test Type
                        <span className="ui-field__required"> *</span>
                      </label>
                      {canManageTypes ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          className="edit-lab-test-results-modal__manage-btn"
                          onClick={() => setManageTypesOpen(true)}
                          disabled={submitting}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </div>
                    <Select
                      id={`${formId}-type`}
                      value={draft.testTypeId}
                      options={typeOptions}
                      placeholder={
                        typeOptions.length === 0
                          ? "No lab test types configured"
                          : "Select lab test type"
                      }
                      onChange={handleTypeChange}
                      disabled={submitting || typeOptions.length === 0 || mode === "edit"}
                      search
                      searchPlaceholder="Search lab test types…"
                    />
                    {errors.testTypeId ? (
                      <p className="ui-field__error">{errors.testTypeId}</p>
                    ) : null}
                  </div>

                  {mode === "add" && typeOptions.length > 0 ? (
                    <div className="edit-lab-test-results-modal__add-row-wrap">
                      <UiButton
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={addEntry}
                        disabled={submitting || !selectedType}
                      >
                        <PlusIcon />
                        Add Row
                      </UiButton>
                    </div>
                  ) : null}

                  {typeOptions.length === 0 ? (
                    <p className="edit-lab-test-results-modal__hint">
                      No active lab test types are configured for this log configuration. Use Manage
                      to add lab test types.
                    </p>
                  ) : null}

                  {selectedType ? (
                    <>
                      {/* <h3 className="edit-lab-test-results-modal__section-heading">
                        {mode === "edit"
                          ? `Edit ${typeName} Results`
                          : `Add ${typeName} Results`}
                      </h3> */}

                      <div className="edit-lab-test-results-modal__toolbar">
                        <div className="edit-lab-test-results-modal__toolbar-actions">
                          {/* <UiButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadTemplate}
                            disabled={submitting}
                          >
                            <DownloadIcon />
                            Download Template
                          </UiButton>
                          <UiButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleUploadClick}
                            disabled={submitting}
                          >
                            <UploadCloudIcon />
                            {hasUploaded ? "Re-upload" : "Upload"}
                          </UiButton> */}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls,text/csv"
                            className="edit-lab-test-results-modal__file-input"
                            onChange={(event) => {
                              void handleFileChange(event);
                            }}
                          />
                        </div>
                        {/* {mode === "add" ? (
                          <UiButton
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={addEntry}
                            disabled={submitting}
                          >
                            + Add Sample
                          </UiButton>
                        ) : null} */}
                      </div>

                      {errors.entries ? (
                        <p className="edit-lab-test-results-modal__error" role="alert">
                          {errors.entries}
                        </p>
                      ) : null}

                      <div className="edit-lab-test-results-modal__table-wrap ui-scrollbar">
                        <table className="edit-lab-test-results-modal__table">
                          <thead>
                            <tr>
                              <th scope="col">Sample No</th>
                              <th scope="col">Depth From (m)</th>
                              <th scope="col">Depth To (m)</th>
                              {resultFields.length > 0 ? (
                                resultFields.map((field) => (
                                  <th key={field.id} scope="col" title={field.name.trim()}>
                                    {field.name.trim()}
                                  </th>
                                ))
                              ) : (
                                <th scope="col">Results</th>
                              )}
                              {mode === "add" ? (
                                <th
                                  scope="col"
                                  className="edit-lab-test-results-modal__table-add"
                                  aria-label="Row actions"
                                />
                              ) : null}
                            </tr>
                          </thead>
                          <tbody>
                            {draft.entries.map((entry, index) => {
                              const depthError = errors[`entry-${entry.key}-depthFrom`];
                              const resultsError = errors[`entry-${entry.key}-results`];
                              return (
                                <tr key={entry.key}>
                                  <td>
                                    <Select
                                      id={`${formId}-sample-${entry.key}`}
                                      value={entry.sampleId}
                                      options={sampleOptions}
                                      onChange={(value) => handleSampleChange(entry.key, value)}
                                      disabled={submitting || loadingSamples}
                                    />
                                  </td>
                                  <td>
                                    <Input
                                      id={`${formId}-from-${entry.key}`}
                                      variant="ui"
                                      value={entry.depthFrom}
                                      placeholder="Enter Depth From (m)"
                                      onChange={(event) =>
                                        updateEntry(entry.key, {
                                          depthFrom: event.target.value,
                                        })
                                      }
                                      disabled={submitting}
                                      aria-invalid={Boolean(depthError)}
                                      aria-label={`Depth from row ${index + 1}`}
                                    />
                                    {depthError ? (
                                      <span className="edit-lab-test-results-modal__cell-error">
                                        {depthError}
                                      </span>
                                    ) : null}
                                  </td>
                                  <td>
                                    <Input
                                      id={`${formId}-to-${entry.key}`}
                                      variant="ui"
                                      value={entry.depthTo}
                                      placeholder="Enter Depth To (m)"
                                      onChange={(event) =>
                                        updateEntry(entry.key, { depthTo: event.target.value })
                                      }
                                      disabled={submitting}
                                      aria-label={`Depth to row ${index + 1}`}
                                    />
                                  </td>
                                  {resultFields.length > 0 ? (
                                    resultFields.map((field) => {
                                      const fieldError =
                                        errors[`entry-${entry.key}-field-${field.id}`];
                                      return (
                                        <td key={field.id}>
                                          <Input
                                            id={`${formId}-field-${entry.key}-${field.id}`}
                                            variant="ui"
                                            value={entry.fieldValues[field.id] ?? ""}
                                            placeholder={field.name.trim()}
                                            onChange={(event) =>
                                              updateFieldValue(
                                                entry.key,
                                                field.id,
                                                event.target.value
                                              )
                                            }
                                            disabled={submitting}
                                            aria-invalid={Boolean(fieldError)}
                                            aria-label={`${field.name.trim()} row ${index + 1}`}
                                          />
                                          {fieldError ? (
                                            <span className="edit-lab-test-results-modal__cell-error">
                                              {fieldError}
                                            </span>
                                          ) : null}
                                        </td>
                                      );
                                    })
                                  ) : (
                                    <td>
                                      <Input
                                        id={`${formId}-results-${entry.key}`}
                                        variant="ui"
                                        value={entry.results}
                                        placeholder="Enter Results"
                                        onChange={(event) =>
                                          updateEntry(entry.key, { results: event.target.value })
                                        }
                                        disabled={submitting}
                                        aria-invalid={Boolean(resultsError)}
                                        aria-label={`Results row ${index + 1}`}
                                      />
                                      {resultsError ? (
                                        <span className="edit-lab-test-results-modal__cell-error">
                                          {resultsError}
                                        </span>
                                      ) : null}
                                    </td>
                                  )}
                                  {mode === "add" ? (
                                    <td className="edit-lab-test-results-modal__table-add">
                                      {draft.entries.length > 1 ? (
                                        <button
                                          type="button"
                                          className="edit-lab-test-results-modal__row-delete"
                                          aria-label={`Remove row ${index + 1}`}
                                          onClick={() => removeEntry(entry.key)}
                                          disabled={submitting}
                                        >
                                          <TrashIcon />
                                        </button>
                                      ) : null}
                                    </td>
                                  ) : null}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="project-modal__footer">
                <UiButton type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                  Cancel
                </UiButton>
                <UiButton
                  type="submit"
                  variant="primary"
                  disabled={submitting || typeOptions.length === 0}
                >
                  {submitting ? "Saving…" : mode === "edit" ? "Save" : "Add"}
                </UiButton>
              </div>
            </form>
          </div>
        </div>
      </ProjectModalPortal>

      <ManageLabTestTypesModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        companyOptions={DEFAULT_LAB_TEST_TYPE_OPTIONS}
        onClose={() => setManageTypesOpen(false)}
        onSave={handleManageTypesSave}
      />
    </>
  );
}
