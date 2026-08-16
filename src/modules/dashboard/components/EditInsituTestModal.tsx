"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import {
  FormField,
  Input,
  Select,
  TrashIcon,
  UiButton,
  ProjectModalPortal,
} from "@/shared/components/ui";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import type { LogInsituTest, InsituTestResultValues } from "../types/logInsituTest";
import {
  DEFAULT_DATA_TYPE_OPTIONS,
  INSITU_TESTS_USA_MODULE_ID,
  parseInsituTestTypeOptions,
  SAMPLES_MODULE_ID,
  type InsituTestTypeOption,
} from "../utils/configModules";
import { useUserInsituTestTypes } from "../hooks/useUserInsituTestTypes";
import { useUserSampleTypes } from "../hooks/useUserSampleTypes";
import { ManageInsituTestTypesModal } from "./configModules/ManageInsituTestTypesModal";
import {
  appendIntervalRow,
  appendResultRowSameDepth,
  calculateSptNValue,
  createDefaultIntervalRows,
  createDefaultResultRows,
  createResultRow,
  createSptDrives,
  emptyResultValuesFromFields,
  formatInsituResultsSummary,
  formatResultRowSummary,
  formatSptResultsSummary,
  getInsituFormDescriptor,
  mmToMeters,
  parseIntervalNumber,
  parseResultRowsFromTest,
  parseRowsFromResultValues,
  parseSptDrivesFromResultValues,
  recalculateIntervalRows,
  resizeSptDrives,
  type InsituFormDescriptor,
  type InsituIntervalRow,
  type InsituResultRow,
  type InsituSptDrive,
} from "../utils/insituTestForm";

export type InsituTestFormSubmitPayload = {
  depthFrom: string;
  depthTo: string;
  testTypeId: string;
  testTypeName: string;
  results: string;
  comments: string;
  resultValues: InsituTestResultValues;
};

type EditInsituTestModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  logConfigurationId: string;
  testTypes: InsituTestTypeOption[];
  initialTest?: LogInsituTest | null;
  onSubmit?: (payloads: InsituTestFormSubmitPayload[]) => void | Promise<void>;
  onTestTypesChange?: (options: InsituTestTypeOption[]) => void;
}>;

type DraftState = {
  testTypeId: string;
  interval: string;
  depthFrom: string;
  depthTo: string;
  comments: string;
  rows: InsituIntervalRow[];
  resultRows: InsituResultRow[];
  sptDrives: InsituSptDrive[];
  nValue: string;
  nLabel: string;
  recovery: string;
  hammer: string;
  resultValues: InsituTestResultValues;
};

type DraftErrors = {
  testTypeId?: string;
  interval?: string;
  depthFrom?: string;
  rows?: string;
  resultRows?: string;
  sptDrives?: string;
  [key: string]: string | undefined;
};

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function createDraftForType(option: InsituTestTypeOption | null): DraftState {
  const descriptor = getInsituFormDescriptor(option);
  const interval = descriptor.defaultIntervalValue;

  if (descriptor.kind === "penetration-rows") {
    return {
      testTypeId: option?.id ?? "",
      interval,
      depthFrom: "",
      depthTo: "",
      comments: "",
      rows: createDefaultIntervalRows(option, interval, 3),
      resultRows: [],
      sptDrives: [],
      nValue: "",
      nLabel: "",
      recovery: "",
      hammer: "",
      resultValues: {},
    };
  }

  if (descriptor.kind === "spt") {
    const count = parseIntervalNumber(option, interval) ?? 3;
    return {
      testTypeId: option?.id ?? "",
      interval,
      depthFrom: "",
      depthTo: "",
      comments: "",
      rows: [],
      resultRows: [],
      sptDrives: createSptDrives(count, descriptor.driveLengthMm),
      nValue: "",
      nLabel: "",
      recovery: "",
      hammer: "",
      resultValues: {},
    };
  }

  if (descriptor.kind === "result-rows") {
    return {
      testTypeId: option?.id ?? "",
      interval: "",
      depthFrom: "",
      depthTo: "",
      comments: "",
      rows: [],
      resultRows: createDefaultResultRows(descriptor.fields, 2),
      sptDrives: [],
      nValue: "",
      nLabel: "",
      recovery: "",
      hammer: "",
      resultValues: {},
    };
  }

  return {
    testTypeId: option?.id ?? "",
    interval: "",
    depthFrom: "",
    depthTo: "",
    comments: "",
    rows: [],
    resultRows: [],
    sptDrives: [],
    nValue: "",
    nLabel: "",
    recovery: "",
    hammer: "",
    resultValues: emptyResultValuesFromFields(descriptor.fields),
  };
}

function createDraft(
  testTypes: InsituTestTypeOption[],
  initial?: LogInsituTest | null
): DraftState {
  if (initial) {
    const matched =
      testTypes.find((entry) => entry.id === initial.testTypeId) ??
      testTypes.find(
        (entry) =>
          entry.name.trim().toLowerCase() === initial.testTypeName.trim().toLowerCase()
      ) ??
      null;
    const descriptor = getInsituFormDescriptor(matched);
    const interval =
      asString(initial.resultValues?.interval) || descriptor.defaultIntervalValue;

    if (descriptor.kind === "penetration-rows") {
      return {
        testTypeId: initial.testTypeId || matched?.id || "",
        interval,
        depthFrom: initial.depthFrom,
        depthTo: initial.depthTo,
        comments: initial.comments,
        rows: parseRowsFromResultValues(
          initial.resultValues,
          initial.depthFrom,
          initial.depthTo,
          initial.results
        ),
        resultRows: [],
        sptDrives: [],
        nValue: "",
        nLabel: "",
        recovery: "",
        hammer: "",
        resultValues: {},
      };
    }

    if (descriptor.kind === "spt") {
      const count = parseIntervalNumber(matched, interval) ?? 3;
      return {
        testTypeId: initial.testTypeId || matched?.id || "",
        interval,
        depthFrom: initial.depthFrom,
        depthTo: initial.depthTo,
        comments: initial.comments,
        rows: [],
        resultRows: [],
        sptDrives: parseSptDrivesFromResultValues(
          initial.resultValues,
          count,
          descriptor.driveLengthMm
        ),
        nValue: asString(initial.resultValues?.nValue),
        nLabel: asString(initial.resultValues?.nLabel),
        recovery: asString(initial.resultValues?.recovery),
        hammer: asString(initial.resultValues?.hammer),
        resultValues: {},
      };
    }

    if (descriptor.kind === "result-rows") {
      return {
        testTypeId: initial.testTypeId || matched?.id || "",
        interval: "",
        depthFrom: initial.depthFrom,
        depthTo: initial.depthTo,
        comments: initial.comments,
        rows: [],
        resultRows: parseResultRowsFromTest(initial, descriptor.fields),
        sptDrives: [],
        nValue: "",
        nLabel: "",
        recovery: "",
        hammer: "",
        resultValues: {},
      };
    }

    return {
      testTypeId: initial.testTypeId || matched?.id || "",
      interval: "",
      depthFrom: initial.depthFrom,
      depthTo: initial.depthTo,
      comments: initial.comments,
      rows: [],
      resultRows: [],
      sptDrives: [],
      nValue: "",
      nLabel: "",
      recovery: "",
      hammer: "",
      resultValues: {
        ...emptyResultValuesFromFields(descriptor.fields),
        ...initial.resultValues,
      },
    };
  }

  const first = testTypes.find((entry) => entry.active !== false) ?? testTypes[0] ?? null;
  return createDraftForType(first);
}

function validateDraft(
  draft: DraftState,
  selectedType: InsituTestTypeOption | null,
  descriptor: InsituFormDescriptor
): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.testTypeId.trim() || !selectedType) {
    errors.testTypeId = "Testing type is required.";
  }

  if (descriptor.kind === "penetration-rows") {
    if (!draft.interval.trim()) errors.interval = "Interval type is required.";
    if (draft.rows.length === 0) errors.rows = "Add at least one row.";
    else if (!draft.rows.some((row) => row.value.trim())) {
      errors.rows = `${descriptor.valueColumnLabel} is required for at least one row.`;
    }
    return errors;
  }

  if (descriptor.kind === "spt") {
    if (!draft.interval.trim()) errors.interval = "Interval is required.";
    if (!draft.depthFrom.trim()) errors.depthFrom = "Depth is required.";
    if (!draft.sptDrives.some((drive) => drive.blows.trim())) {
      errors.sptDrives = "Enter at least one blow count.";
    }
    return errors;
  }

  if (descriptor.kind === "ass") {
    return errors;
  }

  if (descriptor.kind === "result-rows") {
    if (draft.resultRows.length === 0) {
      errors.resultRows = "Add at least one row.";
      return errors;
    }
    for (const row of draft.resultRows) {
      if (descriptor.depthFromRequired && !String(row.depthFrom).trim()) {
        errors.resultRows = `${descriptor.depthFromLabel} is required on every row.`;
        break;
      }
      if (descriptor.showDepthTo && descriptor.depthToRequired && !String(row.depthTo).trim()) {
        errors.resultRows = `${descriptor.depthToLabel} is required on every row.`;
        break;
      }
    }
    return errors;
  }

  if (!draft.depthFrom.trim()) {
    errors.depthFrom = "Depth from is required.";
  }

  for (const field of descriptor.fields) {
    if (!field.required) continue;
    const value = draft.resultValues[field.key];
    if (value == null || !String(value).trim()) {
      errors[field.key] = `${field.label} is required.`;
    }
  }

  return errors;
}

function buildPenetrationPayloads(
  selectedType: InsituTestTypeOption,
  draft: DraftState,
  _mode: "add" | "edit",
  intervalLabel: string
): InsituTestFormSubmitPayload[] {
  void _mode;
  if (draft.rows.length === 0) return [];

  const rows = draft.rows;
  const first = rows[0];
  const last = rows[rows.length - 1] ?? first;
  const results = rows.map((row) => row.value.trim()).join(", ");

  return [
    {
      depthFrom: mmToMeters(first.depthFromMm) || "0",
      depthTo: mmToMeters(last.depthToMm),
      testTypeId: selectedType.id,
      testTypeName: selectedType.name,
      results,
      comments: draft.comments.trim(),
      resultValues: {
        interval: draft.interval,
        intervalLabel,
        rows: rows.map((row) => ({
          id: row.id,
          depthFromMm: row.depthFromMm,
          depthToMm: row.depthToMm,
          value: row.value.trim(),
        })),
        depthFromMm: first.depthFromMm,
        depthToMm: last.depthToMm,
        blowCount: results,
        value: results,
      },
    },
  ];
}

export function EditInsituTestModal({
  open,
  onClose,
  mode = "add",
  logConfigurationId,
  testTypes,
  initialTest = null,
  onSubmit,
  onTestTypesChange,
}: EditInsituTestModalProps) {
  const formId = useId();
  const [workingTypes, setWorkingTypes] = useState<InsituTestTypeOption[]>(testTypes);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(testTypes, initialTest));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  const canManageTypes = Boolean(logConfigurationId.trim());

  const testingTypesApi = useUserInsituTestTypes(INSITU_TESTS_USA_MODULE_ID, {
    enabled: manageTypesOpen && canManageTypes,
    logConfigurationId,
  });
  const sampleTypesApi = useUserSampleTypes(SAMPLES_MODULE_ID, {
    enabled: manageTypesOpen && canManageTypes,
    logConfigurationId,
  });

  const companyTestingTypes = useMemo(
    () => parseInsituTestTypeOptions(DEFAULT_DATA_TYPE_OPTIONS["testing-types"] ?? []),
    []
  );

  const manageTypeOptions =
    manageTypesOpen && testingTypesApi.items.length > 0
      ? testingTypesApi.items
      : workingTypes;

  const sampleTypeOptions = useMemo(
    () =>
      sampleTypesApi.items
        .filter((entry) => entry.id.trim() && entry.name.trim())
        .map((entry) => ({ id: entry.id.trim(), name: entry.name.trim() })),
    [sampleTypesApi.items]
  );

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

  const descriptor = useMemo(
    () => getInsituFormDescriptor(selectedType),
    [selectedType]
  );

  const intervalOptions = useMemo(
    () => descriptor.intervalOptions.map(({ value, label }) => ({ value, label })),
    [descriptor.intervalOptions]
  );

  const intervalNumber = parseIntervalNumber(selectedType, draft.interval);
  const depthsLocked = descriptor.kind === "penetration-rows" && intervalNumber != null;
  const supportsSameDepthAdd = mode === "add" && descriptor.kind === "result-rows";

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(testTypes);
    setDraft(createDraft(testTypes, mode === "edit" ? initialTest : null));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    // Reseed only when the dialog opens or the edit target changes — not when
    // test types are refreshed after Manage, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, mode, initialTest]);

  useEffect(() => {
    if (!open || workingTypes.length > 0 || testTypes.length === 0) return;
    setWorkingTypes(testTypes);
    setDraft(createDraft(testTypes, mode === "edit" ? initialTest : null));
  }, [open, testTypes, workingTypes.length, mode, initialTest]);

  useEffect(() => {
    if (!open || manageTypesOpen) return;
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
  }, [open, manageTypesOpen, onClose]);

  const handleSaveTestingTypes = async (options: InsituTestTypeOption[]) => {
    try {
      const saved = await testingTypesApi.save(options);
      setWorkingTypes(saved);
      onTestTypesChange?.(saved);
      setManageTypesOpen(false);
      showApiSuccess(undefined, "Testing types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const testTypeOptions = useMemo(
    () => selectableTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [selectableTypes]
  );

  const applyAutoN = (drives: InsituSptDrive[], nextDescriptor = descriptor) => {
    if (!nextDescriptor.autoCalculateN) return undefined;
    return calculateSptNValue(drives, nextDescriptor);
  };

  const resetForType = (testTypeId: string) => {
    const nextType = selectableTypes.find((entry) => entry.id === testTypeId) ?? null;
    setDraft(createDraftForType(nextType));
    setErrors({});
  };

  const handlePenetrationIntervalChange = (interval: string) => {
    const nextMm = parseIntervalNumber(selectedType, interval);
    setDraft((prev) => ({
      ...prev,
      interval,
      rows: recalculateIntervalRows(prev.rows, nextMm),
    }));
    setErrors((prev) => ({ ...prev, interval: undefined, rows: undefined }));
  };

  const handleSptIntervalChange = (interval: string) => {
    const count = parseIntervalNumber(selectedType, interval) ?? 3;
    setDraft((prev) => {
      const sptDrives = resizeSptDrives(prev.sptDrives, count, descriptor.driveLengthMm);
      const nValue = applyAutoN(sptDrives) ?? prev.nValue;
      return { ...prev, interval, sptDrives, nValue };
    });
    setErrors((prev) => ({ ...prev, interval: undefined, sptDrives: undefined }));
  };

  const handleAddRow = () => {
    setDraft((prev) => ({
      ...prev,
      rows: appendIntervalRow(prev.rows, parseIntervalNumber(selectedType, prev.interval)),
    }));
    setErrors((prev) => ({ ...prev, rows: undefined }));
  };

  const handleRemoveRow = (rowId: string) => {
    setDraft((prev) => {
      const remaining = prev.rows.filter((row) => row.id !== rowId);
      const nextRows =
        remaining.length > 0
          ? recalculateIntervalRows(
              remaining,
              parseIntervalNumber(selectedType, prev.interval)
            )
          : remaining;
      return { ...prev, rows: nextRows };
    });
  };

  const patchRow = (rowId: string, patch: Partial<InsituIntervalRow>) => {
    setDraft((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    }));
    setErrors((prev) => ({ ...prev, rows: undefined }));
  };

  const patchSptDrive = (driveId: string, blows: string) => {
    setDraft((prev) => {
      const sptDrives = prev.sptDrives.map((drive) =>
        drive.id === driveId ? { ...drive, blows } : drive
      );
      const nValue = applyAutoN(sptDrives) ?? prev.nValue;
      let nLabel = prev.nLabel;
      if (
        descriptor.showNLabel &&
        descriptor.nLabelOverrideAt != null &&
        Number(nValue) >= descriptor.nLabelOverrideAt &&
        descriptor.refusalLabel
      ) {
        nLabel = descriptor.refusalLabel;
      }
      return { ...prev, sptDrives, nValue, nLabel };
    });
    setErrors((prev) => ({ ...prev, sptDrives: undefined }));
  };

  const patchResultValue = (key: string, value: unknown) => {
    setDraft((prev) => ({
      ...prev,
      resultValues: {
        ...prev.resultValues,
        [key]: value,
      },
    }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleAddResultRow = () => {
    setDraft((prev) => ({
      ...prev,
      resultRows: [...prev.resultRows, createResultRow(descriptor.fields)],
    }));
    setErrors((prev) => ({ ...prev, resultRows: undefined }));
  };

  const handleAddSameDepth = () => {
    setDraft((prev) => ({
      ...prev,
      resultRows: appendResultRowSameDepth(prev.resultRows, descriptor.fields),
    }));
    setErrors((prev) => ({ ...prev, resultRows: undefined }));
  };

  const patchResultRow = (
    rowId: string,
    patch: Partial<InsituResultRow> | ((row: InsituResultRow) => InsituResultRow)
  ) => {
    setDraft((prev) => ({
      ...prev,
      resultRows: prev.resultRows.map((row) => {
        if (row.id !== rowId) return row;
        return typeof patch === "function" ? patch(row) : { ...row, ...patch };
      }),
    }));
    setErrors((prev) => ({ ...prev, resultRows: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateDraft(draft, selectedType, descriptor);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    if (!selectedType || !onSubmit) return;

    let payloads: InsituTestFormSubmitPayload[];

    if (descriptor.kind === "penetration-rows") {
      const intervalLabel =
        intervalOptions.find((entry) => entry.value === draft.interval)?.label ??
        draft.interval;
      payloads = buildPenetrationPayloads(selectedType, draft, mode, intervalLabel);
    } else if (descriptor.kind === "spt") {
      const intervalLabel =
        intervalOptions.find((entry) => entry.value === draft.interval)?.label ??
        draft.interval;
      const results = formatSptResultsSummary(draft.sptDrives, draft.nValue, draft.nLabel);
      const driveMmTotal = draft.sptDrives.reduce(
        (sum, drive) => sum + (Number(drive.lengthMm) || 0),
        0
      );
      const depthFrom = draft.depthFrom.trim();
      const depthToNumeric = Number(depthFrom) + driveMmTotal / 1000;
      payloads = [
        {
          depthFrom,
          depthTo: Number.isFinite(depthToNumeric)
            ? String(Number(depthToNumeric.toFixed(3)))
            : "",
          testTypeId: selectedType.id,
          testTypeName: selectedType.name,
          results,
          comments: draft.comments.trim(),
          resultValues: {
            interval: draft.interval,
            intervalLabel,
            sptDrives: draft.sptDrives,
            nValue: draft.nValue.trim(),
            nLabel: draft.nLabel.trim(),
            recovery: draft.recovery.trim(),
            hammer: draft.hammer.trim(),
          },
        },
      ];
    } else if (descriptor.kind === "ass") {
      payloads = [
        {
          depthFrom: "",
          depthTo: "",
          testTypeId: selectedType.id,
          testTypeName: selectedType.name,
          results: "",
          comments: draft.comments.trim(),
          resultValues: {},
        },
      ];
    } else if (descriptor.kind === "result-rows") {
      const rows = mode === "edit" ? draft.resultRows.slice(0, 1) : draft.resultRows;
      payloads = rows.map((row) => ({
        depthFrom: String(row.depthFrom).trim(),
        depthTo: descriptor.showDepthTo ? String(row.depthTo).trim() : "",
        testTypeId: selectedType.id,
        testTypeName: selectedType.name,
        results: formatResultRowSummary(row, descriptor.fields),
        comments: descriptor.commentsPerRow ? row.comments.trim() : draft.comments.trim(),
        resultValues: {
          ...row.values,
          comments: row.comments.trim(),
        },
      }));
    } else {
      const results = formatInsituResultsSummary(selectedType.name, draft.resultValues);
      payloads = [
        {
          depthFrom: draft.depthFrom.trim(),
          depthTo: descriptor.showDepthTo ? draft.depthTo.trim() : "",
          testTypeId: selectedType.id,
          testTypeName: selectedType.name,
          results,
          comments: draft.comments.trim(),
          resultValues: draft.resultValues,
        },
      ];
    }

    setSubmitting(true);
    try {
      await onSubmit(payloads);
      showApiSuccess(
        undefined,
        mode === "edit"
          ? "Insitu test updated."
          : payloads.length > 1
            ? "Insitu tests added."
            : "Insitu test added."
      );
      onClose();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_INSITU_TEST);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const typeName = selectedType?.name?.trim() || "Insitu";
  const title =
    mode === "edit" ? `Edit ${typeName} Testing Results` : `Add ${typeName} Testing Results`;

  return (
    <>
    <ProjectModalPortal open={open}>
      <div className="project-modal project-modal--stacked" role="presentation">
        <button
          type="button"
          className="project-modal__backdrop"
          aria-label="Close Insitu Test dialog"
          onClick={onClose}
        />
        <div
          className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--wide project-modal__dialog--fields edit-insitu-modal"
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
              <div className="project-modal__fields project-modal__fields--stack edit-insitu-modal__fields">
                <div
                  className={[
                    "ui-field",
                    "project-modal__field--full",
                    errors.testTypeId ? "ui-field--error" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="edit-insitu-modal__type-field-head">
                    <label className="ui-field__label" htmlFor={`${formId}-type`}>
                      Select Testing Type
                      <span className="ui-field__required"> *</span>
                    </label>
                    {canManageTypes ? (
                      <UiButton
                        type="button"
                        variant="primary"
                        size="sm"
                        className="edit-insitu-modal__manage-btn"
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
                    disabled={submitting || selectableTypes.length === 0 || mode === "edit"}
                    options={testTypeOptions}
                    placeholder="Select testing type"
                    onChange={resetForType}
                  />
                  {errors.testTypeId ? (
                    <p className="ui-field__error">{errors.testTypeId}</p>
                  ) : null}
                </div>

                {selectableTypes.length === 0 ? (
                  <p className="edit-insitu-modal__hint">
                    No active testing types are configured for this log configuration. Use Manage to
                    add testing types.
                  </p>
                ) : null}

                {selectedType ? (
                  <h3 className="edit-insitu-modal__section-heading">
                    {mode === "edit"
                      ? `Edit ${typeName} Testing Results`
                      : `Add ${typeName} Testing Results`}
                  </h3>
                ) : null}

                {descriptor.kind === "penetration-rows" ? (
                  <>
                    <div className="edit-insitu-modal__interval-bar">
                      <FormField
                        label="Select Interval Type"
                        required
                        error={errors.interval}
                        htmlFor={`${formId}-interval`}
                        className="edit-insitu-modal__interval-field"
                      >
                        <Select
                          id={`${formId}-interval`}
                          value={draft.interval}
                          disabled={submitting || intervalOptions.length === 0}
                          options={intervalOptions}
                          placeholder="Select interval type"
                          onChange={handlePenetrationIntervalChange}
                        />
                      </FormField>
                      {mode === "add" ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleAddRow}
                          disabled={submitting || !draft.interval}
                        >
                          + Add Row
                        </UiButton>
                      ) : null}
                    </div>

                    {errors.rows ? (
                      <p className="edit-insitu-modal__error" role="alert">
                        {errors.rows}
                      </p>
                    ) : null}

                    <div className="edit-insitu-modal__table-wrap ui-scrollbar">
                      <table className="edit-insitu-modal__table">
                        <thead>
                          <tr>
                            <th scope="col">Depth From (mm)</th>
                            <th scope="col">Depth To (mm)</th>
                            <th scope="col">{descriptor.valueColumnLabel}</th>
                            <th scope="col" className="edit-insitu-modal__table-actions">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {draft.rows.map((row, index) => (
                            <tr key={row.id}>
                              <td>
                                <Input
                                  variant="ui"
                                  value={row.depthFromMm}
                                  disabled={submitting || depthsLocked}
                                  aria-label={`Depth from row ${index + 1}`}
                                  onChange={(event) =>
                                    patchRow(row.id, { depthFromMm: event.target.value })
                                  }
                                />
                              </td>
                              <td>
                                <Input
                                  variant="ui"
                                  value={row.depthToMm}
                                  disabled={submitting || depthsLocked}
                                  aria-label={`Depth to row ${index + 1}`}
                                  onChange={(event) =>
                                    patchRow(row.id, { depthToMm: event.target.value })
                                  }
                                />
                              </td>
                              <td>
                                <Input
                                  variant="ui"
                                  value={row.value}
                                  disabled={submitting}
                                  aria-label={`${descriptor.valueColumnLabel} row ${index + 1}`}
                                  onChange={(event) =>
                                    patchRow(row.id, { value: event.target.value })
                                  }
                                />
                              </td>
                              <td className="edit-insitu-modal__table-actions">
                                <button
                                  type="button"
                                  className="edit-insitu-modal__row-delete"
                                  aria-label={`Delete row ${index + 1}`}
                                  disabled={
                                    submitting || (mode === "edit" && draft.rows.length <= 1)
                                  }
                                  onClick={() => handleRemoveRow(row.id)}
                                >
                                  <TrashIcon />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {descriptor.showComments ? (
                      <FormField
                        label={descriptor.commentsLabel}
                        htmlFor={`${formId}-comments`}
                        className="project-modal__field--full"
                      >
                        <textarea
                          id={`${formId}-comments`}
                          className="ui-textarea"
                          rows={3}
                          value={draft.comments}
                          disabled={submitting}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, comments: event.target.value }))
                          }
                        />
                      </FormField>
                    ) : null}
                  </>
                ) : null}

                {descriptor.kind === "spt" ? (
                  <>
                    <FormField
                      label="Select interval"
                      required
                      error={errors.interval}
                      htmlFor={`${formId}-spt-interval`}
                      className="project-modal__field--full"
                    >
                      <Select
                        id={`${formId}-spt-interval`}
                        value={draft.interval}
                        disabled={submitting || intervalOptions.length === 0}
                        options={intervalOptions}
                        placeholder="Select interval"
                        onChange={handleSptIntervalChange}
                      />
                    </FormField>

                    <FormField
                      label="Depth (m)"
                      required
                      error={errors.depthFrom}
                      htmlFor={`${formId}-spt-depth`}
                    >
                      <Input
                        id={`${formId}-spt-depth`}
                        variant="ui"
                        type="number"
                        step="any"
                        value={draft.depthFrom}
                        disabled={submitting}
                        placeholder="Type"
                        onChange={(event) => {
                          setDraft((prev) => ({ ...prev, depthFrom: event.target.value }));
                          setErrors((prev) => ({ ...prev, depthFrom: undefined }));
                        }}
                      />
                    </FormField>

                    <div className="edit-insitu-modal__spt-result">
                      <span className="edit-insitu-modal__spt-result-label">Result</span>
                      {errors.sptDrives ? (
                        <p className="edit-insitu-modal__error" role="alert">
                          {errors.sptDrives}
                        </p>
                      ) : null}
                      <div className="edit-insitu-modal__spt-drives">
                        {draft.sptDrives.map((drive, index) => (
                          <div key={drive.id} className="edit-insitu-modal__spt-drive">
                            <Input
                              variant="ui"
                              value={drive.blows}
                              disabled={submitting}
                              aria-label={`Blow count interval ${index + 1}`}
                              onChange={(event) => patchSptDrive(drive.id, event.target.value)}
                            />
                            <span className="edit-insitu-modal__spt-slash" aria-hidden="true">
                              /
                            </span>
                            <Input
                              variant="ui"
                              value={drive.lengthMm}
                              disabled
                              aria-label={`Drive length interval ${index + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="edit-insitu-modal__row">
                      {descriptor.showNValue ? (
                        <FormField label="N-Value" htmlFor={`${formId}-n-value`}>
                          <Input
                            id={`${formId}-n-value`}
                            variant="ui"
                            value={draft.nValue}
                            disabled={submitting}
                            onChange={(event) =>
                              setDraft((prev) => ({ ...prev, nValue: event.target.value }))
                            }
                          />
                        </FormField>
                      ) : null}
                      {descriptor.showNLabel ? (
                        <FormField label="Label" htmlFor={`${formId}-n-label`}>
                          <Input
                            id={`${formId}-n-label`}
                            variant="ui"
                            value={draft.nLabel}
                            disabled={submitting}
                            placeholder="Label for charts"
                            onChange={(event) =>
                              setDraft((prev) => ({ ...prev, nLabel: event.target.value }))
                            }
                          />
                        </FormField>
                      ) : null}
                    </div>

                    {descriptor.showRecovery ? (
                      <FormField
                        label="Recovery (mm)"
                        htmlFor={`${formId}-recovery`}
                        className="project-modal__field--full"
                      >
                        <Input
                          id={`${formId}-recovery`}
                          variant="ui"
                          type="number"
                          value={draft.recovery}
                          disabled={submitting}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, recovery: event.target.value }))
                          }
                        />
                      </FormField>
                    ) : null}

                    {descriptor.showHammer ? (
                      <FormField
                        label="Hammer / Weight"
                        htmlFor={`${formId}-hammer`}
                        className="project-modal__field--full"
                      >
                        <Input
                          id={`${formId}-hammer`}
                          variant="ui"
                          value={draft.hammer}
                          disabled={submitting}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, hammer: event.target.value }))
                          }
                        />
                      </FormField>
                    ) : null}

                    {descriptor.showComments ? (
                      <FormField
                        label={descriptor.commentsLabel}
                        htmlFor={`${formId}-spt-comments`}
                        className="project-modal__field--full"
                      >
                        <textarea
                          id={`${formId}-spt-comments`}
                          className="ui-textarea"
                          rows={3}
                          value={draft.comments}
                          disabled={submitting}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, comments: event.target.value }))
                          }
                        />
                      </FormField>
                    ) : null}
                  </>
                ) : null}

                {descriptor.kind === "result-rows" ? (
                  <>
                    {errors.resultRows ? (
                      <p className="edit-insitu-modal__error" role="alert">
                        {errors.resultRows}
                      </p>
                    ) : null}

                    <div className="edit-insitu-modal__result-rows">
                      {draft.resultRows.map((row, index) => (
                        <div key={row.id} className="edit-insitu-modal__result-row">
                          <FormField
                            label={descriptor.depthFromLabel}
                            required={descriptor.depthFromRequired}
                          >
                            <Input
                              variant="ui"
                              type="number"
                              step="any"
                              value={row.depthFrom}
                              disabled={submitting}
                              onChange={(event) =>
                                patchResultRow(row.id, { depthFrom: event.target.value })
                              }
                            />
                          </FormField>
                          {descriptor.showDepthTo ? (
                            <FormField
                              label={descriptor.depthToLabel}
                              required={descriptor.depthToRequired}
                            >
                              <Input
                                variant="ui"
                                type="number"
                                step="any"
                                value={row.depthTo}
                                disabled={submitting}
                                onChange={(event) =>
                                  patchResultRow(row.id, { depthTo: event.target.value })
                                }
                              />
                            </FormField>
                          ) : null}
                          {descriptor.fields.map((field) => (
                            <FormField key={field.key} label={field.label} required={field.required}>
                              <Input
                                variant="ui"
                                type={field.kind === "number" ? "number" : "text"}
                                step="any"
                                value={row.values[field.key] ?? ""}
                                disabled={submitting}
                                onChange={(event) =>
                                  patchResultRow(row.id, (current) => ({
                                    ...current,
                                    values: {
                                      ...current.values,
                                      [field.key]: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </FormField>
                          ))}
                          {descriptor.commentsPerRow ? (
                            <FormField label={descriptor.commentsLabel}>
                              <Input
                                variant="ui"
                                value={row.comments}
                                disabled={submitting}
                                placeholder="Type comment"
                                onChange={(event) =>
                                  patchResultRow(row.id, { comments: event.target.value })
                                }
                              />
                            </FormField>
                          ) : null}
                          <button
                            type="button"
                            className="edit-insitu-modal__row-delete"
                            aria-label={`Delete row ${index + 1}`}
                            disabled={
                              submitting || (mode === "edit" && draft.resultRows.length <= 1)
                            }
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                resultRows: prev.resultRows.filter((entry) => entry.id !== row.id),
                              }))
                            }
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      ))}
                    </div>

                    {mode === "add" ? (
                      <div className="edit-insitu-modal__add-row">
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleAddResultRow}
                          disabled={submitting}
                        >
                          Add Row
                        </UiButton>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {descriptor.kind === "ass" ? (
                  <>
                    <div className="edit-insitu-modal__ass-table" aria-label="ASS testing results">
                      <div className="edit-insitu-modal__ass-head">
                        <span>Depth From</span>
                        <span>Depth To</span>
                        <span>ΔpH</span>
                        <span>PHF</span>
                        <span>PHFOX</span>
                      </div>
                      <div className="edit-insitu-modal__ass-empty">
                        <strong>{descriptor.emptyStateTitle}</strong>
                        <p>{descriptor.emptyStateMessage}</p>
                      </div>
                    </div>

                    <FormField
                      label={descriptor.commentsLabel}
                      htmlFor={`${formId}-ass-comments`}
                      className="project-modal__field--full"
                    >
                      <textarea
                        id={`${formId}-ass-comments`}
                        className="ui-textarea"
                        rows={3}
                        placeholder="Type comment here"
                        value={draft.comments}
                        disabled={submitting}
                        onChange={(event) =>
                          setDraft((prev) => ({ ...prev, comments: event.target.value }))
                        }
                      />
                    </FormField>
                  </>
                ) : null}

                {descriptor.kind === "unit-fields" || descriptor.kind === "simple" ? (
                  <>
                    <div className="edit-insitu-modal__row">
                      <FormField
                        label={descriptor.depthFromLabel}
                        required
                        error={errors.depthFrom}
                        htmlFor={`${formId}-depth`}
                      >
                        <Input
                          id={`${formId}-depth`}
                          variant="ui"
                          type="number"
                          step="any"
                          value={draft.depthFrom}
                          disabled={submitting}
                          placeholder="Type"
                          onChange={(event) => {
                            setDraft((prev) => ({ ...prev, depthFrom: event.target.value }));
                            setErrors((prev) => ({ ...prev, depthFrom: undefined }));
                          }}
                        />
                      </FormField>
                      {descriptor.showDepthTo ? (
                        <FormField
                          label={descriptor.depthToLabel}
                          htmlFor={`${formId}-depth-to`}
                        >
                          <Input
                            id={`${formId}-depth-to`}
                            variant="ui"
                            type="number"
                            step="any"
                            value={draft.depthTo}
                            disabled={submitting}
                            placeholder="Optional"
                            onChange={(event) =>
                              setDraft((prev) => ({ ...prev, depthTo: event.target.value }))
                            }
                          />
                        </FormField>
                      ) : null}
                    </div>

                    {descriptor.fields.length > 0 ? (
                      <div className="edit-insitu-modal__results-grid">
                        {descriptor.fields.map((field) => (
                          <FormField
                            key={field.key}
                            label={field.label}
                            required={field.required}
                            error={errors[field.key]}
                            htmlFor={`${formId}-${field.key}`}
                            className={
                              descriptor.fields.length === 1
                                ? "project-modal__field--full"
                                : undefined
                            }
                          >
                            <Input
                              id={`${formId}-${field.key}`}
                              variant="ui"
                              type={field.kind === "number" ? "number" : "text"}
                              step="any"
                              value={String(draft.resultValues[field.key] ?? "")}
                              disabled={submitting}
                              onChange={(event) =>
                                patchResultValue(field.key, event.target.value)
                              }
                            />
                          </FormField>
                        ))}
                      </div>
                    ) : null}

                    {descriptor.showComments ? (
                      <FormField
                        label={descriptor.commentsLabel}
                        htmlFor={`${formId}-unit-comments`}
                        className="project-modal__field--full"
                      >
                        <textarea
                          id={`${formId}-unit-comments`}
                          className="ui-textarea"
                          rows={3}
                          value={draft.comments}
                          disabled={submitting}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, comments: event.target.value }))
                          }
                        />
                      </FormField>
                    ) : null}
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
                disabled={submitting || selectableTypes.length === 0}
              >
                {submitting
                  ? "Saving…"
                  : mode === "edit"
                    ? "Save"
                    : descriptor.kind === "result-rows"
                      ? "Add"
                      : "Save"}
              </UiButton>
            </div>
          </form>
        </div>
      </div>
    </ProjectModalPortal>

      <ManageInsituTestTypesModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        optionsReady={!testingTypesApi.loading}
        companyOptions={companyTestingTypes}
        sampleTypeOptions={sampleTypeOptions}
        onClose={() => setManageTypesOpen(false)}
        onSave={(options) => {
          void handleSaveTestingTypes(options);
        }}
      />
    </>
  );
}
