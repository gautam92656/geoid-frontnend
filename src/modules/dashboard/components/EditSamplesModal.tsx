"use client";

import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from "react";
import {
  DatePicker,
  EditIcon,
  FormField,
  Input,
  MultiSelect,
  PlusIcon,
  Select,
  TimePicker,
  TrashIcon,
  UiButton,
  ProjectModalPortal,
  type SelectOption,
} from "@/shared/components/ui";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { LogSample } from "../types/logSample";
import type { LogInsituTest } from "../types/logInsituTest";
import {
  DEFAULT_SAMPLE_TYPE_OPTIONS,
  INSITU_TESTS_USA_MODULE_ID,
  LAB_TESTS_MODULE_ID,
  SAMPLES_MODULE_ID,
  parseInsituTestTypeOptions,
  parseLabTestPresetOptions,
  parseLabTestTypeOptions,
  type InsituTestTypeOption,
  type SampleTypeOption,
} from "../utils/configModules";
import { useUserSampleTypes } from "../hooks/useUserSampleTypes";
import { useUserInsituTestTypes } from "../hooks/useUserInsituTestTypes";
import {
  getUserInsituTestTypes,
  getUserLabTestPresets,
  getUserLabTestTypes,
} from "../services/configModulesApi";
import { listProjectLogs } from "../services/logApi";
import { listSuppliers } from "../services/supplierApi";
import {
  createLogInsituTest,
  deleteLogInsituTest,
  listLogInsituTests,
} from "../services/logInsituTestApi";
import { ManageSampleTypesModal } from "./configModules/ManageSampleTypesModal";
import {
  EditInsituTestModal,
  type InsituTestFormSubmitPayload,
} from "./EditInsituTestModal";
import {
  CreateLabTestRequestModal,
  type CreateLabTestRequestPayload,
  type LabTestRequestPresetOption,
} from "./CreateLabTestRequestModal";

export type LogSampleFormSubmitPayload = {
  depthFrom: string;
  depthTo: string;
  sampleTypeId: string;
  sampleTypeName: string;
  sampleNo: string;
  qcSampleId: string;
  sampleDate: string;
  sampleTime: string;
  recovery: string;
  comments: string;
  labTestRequestId: string;
  labTestRequestName: string;
  labTestTypeIds: string[];
  subsurfaceClassification: string;
  /** Pending insitu tests to create after a new sample is saved. */
  pendingInsituTests: InsituTestFormSubmitPayload[];
};

type EditSamplesModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  projectId: number;
  logId: number;
  logConfigurationId: string;
  sampleTypes: SampleTypeOption[];
  initialSample?: LogSample | null;
  onSubmit?: (payload: LogSampleFormSubmitPayload) => void | Promise<void>;
  onSampleTypesChange?: (options: SampleTypeOption[]) => void;
  /** Called when a linked insitu test is created/deleted so the Insitu Tests tab can refresh. */
  onLinkedInsituTestsChange?: () => void;
}>;

type DraftState = {
  sampleTypeId: string;
  depthFrom: string;
  depthTo: string;
  sampleNo: string;
  qcSampleId: string;
  sampleDate: string;
  sampleTime: string;
  recovery: string;
  comments: string;
  labTestRequestId: string;
  labTestTypeIds: string[];
  subsurfaceClassification: string;
};

type DraftErrors = {
  sampleTypeId?: string;
  depthFrom?: string;
};

type PendingInsituRow = InsituTestFormSubmitPayload & { localId: string };

type SessionLabRequest = {
  id: string;
  requestName: string;
  labTestTypeIds: string[];
};

function createDraft(
  sampleTypes: SampleTypeOption[],
  initial: LogSample | null | undefined
): DraftState {
  if (initial) {
    return {
      sampleTypeId: initial.sampleTypeId,
      depthFrom: initial.depthFrom,
      depthTo: initial.depthTo,
      sampleNo: initial.sampleNo,
      qcSampleId: initial.qcSampleId,
      sampleDate: initial.sampleDate,
      sampleTime: initial.sampleTime,
      recovery: initial.recovery,
      comments: initial.comments,
      labTestRequestId: initial.labTestRequestId ?? "",
      labTestTypeIds: Array.isArray(initial.labTestTypeIds) ? [...initial.labTestTypeIds] : [],
      subsurfaceClassification: initial.subsurfaceClassification ?? "",
    };
  }

  const firstActive = sampleTypes.find((entry) => entry.active !== false && entry.id.trim());
  return {
    sampleTypeId: firstActive?.id ?? "",
    depthFrom: "",
    depthTo: "",
    sampleNo: "",
    qcSampleId: "",
    sampleDate: "",
    sampleTime: "",
    recovery: "",
    comments: "",
    labTestRequestId: "",
    labTestTypeIds: [],
    subsurfaceClassification: "",
  };
}

function createLocalId(): string {
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function EditSamplesModal({
  open,
  onClose,
  mode = "add",
  projectId,
  logId,
  logConfigurationId,
  sampleTypes,
  initialSample = null,
  onSubmit,
  onSampleTypesChange,
  onLinkedInsituTestsChange,
}: EditSamplesModalProps) {
  const formId = useId();
  const [workingTypes, setWorkingTypes] = useState<SampleTypeOption[]>(sampleTypes);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(sampleTypes, initialSample));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);
  const [insituTypes, setInsituTypes] = useState<InsituTestTypeOption[]>([]);
  const [insituModalOpen, setInsituModalOpen] = useState(false);
  const [linkedTests, setLinkedTests] = useState<LogInsituTest[]>([]);
  const [pendingTests, setPendingTests] = useState<PendingInsituRow[]>([]);
  const [loadingLinked, setLoadingLinked] = useState(false);
  const [insituBusy, setInsituBusy] = useState(false);
  const [createLabRequestOpen, setCreateLabRequestOpen] = useState(false);
  const [loadingLabOptions, setLoadingLabOptions] = useState(false);
  const [labOptions, setLabOptions] = useState<SelectOption[]>([]);
  const [logOptions, setLogOptions] = useState<SelectOption[]>([]);
  const [presetOptions, setPresetOptions] = useState<LabTestRequestPresetOption[]>([]);
  const [labTestTypeOptions, setLabTestTypeOptions] = useState<SelectOption[]>([]);
  const [sessionLabRequests, setSessionLabRequests] = useState<SessionLabRequest[]>([]);
  const [editingSubsurface, setEditingSubsurface] = useState(false);

  const sampleId = mode === "edit" ? initialSample?.id ?? null : null;
  const canManageTypes = Boolean(logConfigurationId.trim());

  const sampleTypesApi = useUserSampleTypes(SAMPLES_MODULE_ID, {
    enabled: manageTypesOpen && canManageTypes,
    logConfigurationId,
  });

  const insituTypesApi = useUserInsituTestTypes(INSITU_TESTS_USA_MODULE_ID, {
    enabled: (manageTypesOpen || insituModalOpen) && canManageTypes,
    logConfigurationId,
  });

  const manageTypeOptions =
    manageTypesOpen && sampleTypesApi.items.length > 0
      ? sampleTypesApi.items
      : workingTypes;

  const manageInsituOptions = useMemo(
    () =>
      (manageTypesOpen && insituTypesApi.items.length > 0
        ? insituTypesApi.items
        : insituTypes
      ).map((entry) => ({ id: entry.id, name: entry.name })),
    [insituTypes, insituTypesApi.items, manageTypesOpen]
  );

  const activeTypes = useMemo(
    () => workingTypes.filter((entry) => entry.active !== false),
    [workingTypes]
  );

  const selectableTypes = useMemo(() => {
    if (mode !== "edit" || !initialSample?.sampleTypeId) return activeTypes;
    const existing = workingTypes.find((entry) => entry.id === initialSample.sampleTypeId);
    if (!existing || activeTypes.some((entry) => entry.id === existing.id)) {
      return activeTypes;
    }
    return [existing, ...activeTypes];
  }, [activeTypes, initialSample, mode, workingTypes]);

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.sampleTypeId) ??
      workingTypes.find((entry) => entry.id === draft.sampleTypeId) ??
      null,
    [draft.sampleTypeId, selectableTypes, workingTypes]
  );

  const showRecovery = Boolean(selectedType?.noteRecovery);
  const showQcSampleId = Boolean(selectedType?.displayQcId);
  const showInsituTests = Boolean(selectedType?.enableInsituTestLogging);
  const showLabTests = Boolean(selectedType?.enableAssignLabTest);
  const showSubsurface = Boolean(selectedType?.enableSubsurfaceLogging);

  const modalInsituTypes = useMemo(() => {
    if (insituTypesApi.items.length > 0) return insituTypesApi.items;
    return insituTypes;
  }, [insituTypes, insituTypesApi.items]);

  const loadLinkedTests = useCallback(async () => {
    if (!sampleId || !projectId || !logId) {
      setLinkedTests([]);
      return;
    }
    setLoadingLinked(true);
    try {
      const result = await listLogInsituTests(projectId, logId, 1, 200, {
        sampleId,
        sortBy: "sortOrder",
        sortOrder: "asc",
      });
      setLinkedTests(result.data);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_INSITU_TESTS);
      setLinkedTests([]);
    } finally {
      setLoadingLinked(false);
    }
  }, [sampleId, projectId, logId]);

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(sampleTypes);
    setDraft(createDraft(sampleTypes, mode === "edit" ? initialSample : null));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    setInsituModalOpen(false);
    setPendingTests([]);
    setCreateLabRequestOpen(false);
    setEditingSubsurface(false);
    setSessionLabRequests((current) => {
      if (mode !== "edit" || !initialSample?.labTestRequestId) return [];
      const existingId = initialSample.labTestRequestId.trim();
      if (!existingId) return [];
      if (current.some((entry) => entry.id === existingId)) return current;
      return [
        {
          id: existingId,
          requestName: initialSample.labTestRequestName?.trim() || existingId,
          labTestTypeIds: Array.isArray(initialSample.labTestTypeIds)
            ? [...initialSample.labTestTypeIds]
            : [],
        },
      ];
    });
    // Reseed only when the dialog opens or the edit target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, mode, initialSample]);

  useEffect(() => {
    if (!open || workingTypes.length > 0 || sampleTypes.length === 0) return;
    setWorkingTypes(sampleTypes);
    setDraft(createDraft(sampleTypes, mode === "edit" ? initialSample : null));
  }, [open, sampleTypes, workingTypes.length, mode, initialSample]);

  useEffect(() => {
    if (!open) return;
    void loadLinkedTests();
  }, [open, loadLinkedTests]);

  useEffect(() => {
    if (!open || !logConfigurationId.trim()) {
      setInsituTypes([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await getUserInsituTestTypes(
          INSITU_TESTS_USA_MODULE_ID,
          logConfigurationId
        );
        if (!cancelled) setInsituTypes(parseInsituTestTypeOptions(data, []));
      } catch {
        if (!cancelled) setInsituTypes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, logConfigurationId]);

  useEffect(() => {
    if (!open || manageTypesOpen || insituModalOpen || createLabRequestOpen) return;
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
  }, [open, manageTypesOpen, insituModalOpen, createLabRequestOpen, onClose]);

  const loadLabRequestOptions = useCallback(async () => {
    setLoadingLabOptions(true);
    try {
      const [suppliersResult, logsResult, typesResult, presetsResult] = await Promise.all([
        listSuppliers(1, MAX_TABLE_PAGE_SIZE, {
          supplierType: "Laboratory",
          status: "active",
        }),
        listProjectLogs(projectId, 1, MAX_TABLE_PAGE_SIZE),
        logConfigurationId.trim()
          ? getUserLabTestTypes(LAB_TESTS_MODULE_ID, logConfigurationId)
          : Promise.resolve({ data: [] }),
        logConfigurationId.trim()
          ? getUserLabTestPresets(LAB_TESTS_MODULE_ID, logConfigurationId)
          : Promise.resolve({ data: [] }),
      ]);

      setLabOptions(
        suppliersResult.data.map((supplier) => ({
          value: String(supplier.id),
          label: supplier.businessName,
        }))
      );
      setLogOptions(
        logsResult.data.map((log) => ({
          value: String(log.id),
          label: log.logNumber || `Log ${log.id}`,
        }))
      );
      const types = parseLabTestTypeOptions(typesResult.data, []);
      setLabTestTypeOptions(types.map((entry) => ({ value: entry.id, label: entry.name })));
      const presets = parseLabTestPresetOptions(presetsResult.data, []);
      setPresetOptions(
        presets.map((entry) => ({
          value: entry.id,
          label: entry.name,
          labTestTypeIds: [...entry.labTestTypeIds],
        }))
      );
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LABORATORIES);
      setLabOptions([]);
      setLogOptions([]);
      setPresetOptions([]);
      setLabTestTypeOptions([]);
    } finally {
      setLoadingLabOptions(false);
    }
  }, [logConfigurationId, projectId]);

  useEffect(() => {
    if (!open || !showLabTests || !logConfigurationId.trim()) {
      if (!showLabTests) setLabTestTypeOptions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await getUserLabTestTypes(LAB_TESTS_MODULE_ID, logConfigurationId);
        if (cancelled) return;
        const types = parseLabTestTypeOptions(data, []);
        setLabTestTypeOptions(types.map((entry) => ({ value: entry.id, label: entry.name })));
      } catch {
        if (!cancelled) setLabTestTypeOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, showLabTests, logConfigurationId]);

  useEffect(() => {
    if (!createLabRequestOpen) return;
    void loadLabRequestOptions();
  }, [createLabRequestOpen, loadLabRequestOptions]);

  const labRequestSelectOptions = useMemo(
    () =>
      sessionLabRequests.map((entry) => ({
        value: entry.id,
        label: entry.requestName,
      })),
    [sessionLabRequests]
  );

  const selectedLabRequestName = useMemo(() => {
    const match = sessionLabRequests.find((entry) => entry.id === draft.labTestRequestId);
    return match?.requestName ?? initialSample?.labTestRequestName ?? "";
  }, [draft.labTestRequestId, initialSample?.labTestRequestName, sessionLabRequests]);

  const handleSaveSampleTypes = async (options: SampleTypeOption[]) => {
    try {
      const saved = await sampleTypesApi.save(options);
      setWorkingTypes(saved);
      onSampleTypesChange?.(saved);
      setManageTypesOpen(false);
      showApiSuccess(undefined, "Sample types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const sampleTypeSelectOptions = useMemo(
    () => selectableTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [selectableTypes]
  );

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!draft.sampleTypeId.trim() || !selectedType) {
      next.sampleTypeId = "Sample type is required.";
    }
    if (!draft.depthFrom.trim()) {
      next.depthFrom = "Depth From is required.";
    }
    return next;
  };

  const handleInsituSubmit = async (payloads: InsituTestFormSubmitPayload[]) => {
    if (payloads.length === 0) return;

    if (sampleId) {
      setInsituBusy(true);
      try {
        for (const payload of payloads) {
          await createLogInsituTest(projectId, logId, {
            ...payload,
            sampleId,
          });
        }
        await loadLinkedTests();
        onLinkedInsituTestsChange?.();
      } catch (err) {
        showApiError(err, API_ERROR_MESSAGES.SAVE_INSITU_TEST);
        throw err;
      } finally {
        setInsituBusy(false);
      }
      return;
    }

    setPendingTests((current) => [
      ...current,
      ...payloads.map((payload) => ({ ...payload, localId: createLocalId() })),
    ]);
  };

  const handleRemoveLinked = async (test: LogInsituTest) => {
    setInsituBusy(true);
    try {
      await deleteLogInsituTest(projectId, logId, test.id);
      setLinkedTests((current) => current.filter((entry) => entry.id !== test.id));
      onLinkedInsituTestsChange?.();
      showApiSuccess(undefined, "Insitu test deleted.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.DELETE_INSITU_TEST);
    } finally {
      setInsituBusy(false);
    }
  };

  const handleRemovePending = (localId: string) => {
    setPendingTests((current) => current.filter((entry) => entry.localId !== localId));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSubmit || submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedType) return;

    const payload: LogSampleFormSubmitPayload = {
      depthFrom: draft.depthFrom.trim(),
      depthTo: draft.depthTo.trim(),
      sampleTypeId: selectedType.id,
      sampleTypeName: selectedType.name,
      sampleNo: draft.sampleNo.trim(),
      qcSampleId: showQcSampleId ? draft.qcSampleId.trim() : "",
      sampleDate: draft.sampleDate.trim(),
      sampleTime: draft.sampleTime.trim(),
      recovery: showRecovery ? draft.recovery.trim() : "",
      comments: draft.comments.trim(),
      labTestRequestId: showLabTests ? draft.labTestRequestId.trim() : "",
      labTestRequestName: showLabTests ? selectedLabRequestName.trim() : "",
      labTestTypeIds: showLabTests ? [...draft.labTestTypeIds] : [],
      subsurfaceClassification: showSubsurface
        ? draft.subsurfaceClassification.trim()
        : "",
      pendingInsituTests: showInsituTests
        ? pendingTests.map(({ localId: _localId, ...rest }) => rest)
        : [],
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      showApiSuccess(undefined, mode === "edit" ? "Sample updated." : "Sample added.");
      onClose();
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.SAVE_LOG_SAMPLE);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "edit" ? "Edit Sample" : "Add Sample";
  const tableRowsEmpty =
    linkedTests.length === 0 && pendingTests.length === 0 && !loadingLinked;

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close Sample dialog"
            onClick={onClose}
          />
          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields edit-samples-modal"
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
                <div className="project-modal__fields project-modal__fields--stack edit-samples-modal__fields">
                  <div
                    className={[
                      "ui-field",
                      "project-modal__field--full",
                      errors.sampleTypeId ? "ui-field--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="edit-samples-modal__type-field-head">
                      <label className="ui-field__label" htmlFor={`${formId}-type`}>
                        Select Sample Type
                        <span className="ui-field__required"> *</span>
                      </label>
                      {canManageTypes ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          className="edit-samples-modal__manage-btn"
                          onClick={() => setManageTypesOpen(true)}
                          disabled={submitting}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </div>
                    <Select
                      id={`${formId}-type`}
                      value={draft.sampleTypeId}
                      disabled={submitting || selectableTypes.length === 0 || mode === "edit"}
                      options={sampleTypeSelectOptions}
                      placeholder="Select sample type"
                      onChange={(value) => {
                        setDraft((current) => ({ ...current, sampleTypeId: value }));
                        setErrors((current) => ({ ...current, sampleTypeId: undefined }));
                      }}
                    />
                    {errors.sampleTypeId ? (
                      <p className="ui-field__error">{errors.sampleTypeId}</p>
                    ) : null}
                  </div>

                  {selectableTypes.length === 0 ? (
                    <p className="edit-samples-modal__hint">
                      No sample types are configured for this log configuration. Use Manage to add
                      sample types.
                    </p>
                  ) : null}

                  <div className="edit-samples-modal__row">
                    <FormField
                      label="Depth From (m)"
                      required
                      error={errors.depthFrom}
                      htmlFor={`${formId}-depth-from`}
                    >
                      <Input
                        id={`${formId}-depth-from`}
                        variant="ui"
                        type="number"
                        step="any"
                        value={draft.depthFrom}
                        placeholder="Depth From"
                        disabled={submitting}
                        onChange={(event) => {
                          setDraft((current) => ({
                            ...current,
                            depthFrom: event.target.value,
                          }));
                          setErrors((current) => ({ ...current, depthFrom: undefined }));
                        }}
                      />
                    </FormField>

                    <FormField label="Depth To (m)" htmlFor={`${formId}-depth-to`}>
                      <Input
                        id={`${formId}-depth-to`}
                        variant="ui"
                        type="number"
                        step="any"
                        value={draft.depthTo}
                        placeholder="Depth To"
                        disabled={submitting}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            depthTo: event.target.value,
                          }))
                        }
                      />
                    </FormField>
                  </div>

                  <FormField label="Sample ID" htmlFor={`${formId}-sample-no`}>
                    <Input
                      id={`${formId}-sample-no`}
                      variant="ui"
                      type="text"
                      value={draft.sampleNo}
                      placeholder="Sample ID"
                      disabled={submitting}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          sampleNo: event.target.value,
                        }))
                      }
                    />
                  </FormField>

                  {showQcSampleId ? (
                    <FormField label="QC ID" htmlFor={`${formId}-qc-sample-id`}>
                      <Input
                        id={`${formId}-qc-sample-id`}
                        variant="ui"
                        type="text"
                        value={draft.qcSampleId}
                        placeholder="QC ID"
                        disabled={submitting}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            qcSampleId: event.target.value,
                          }))
                        }
                      />
                    </FormField>
                  ) : null}

                  <div className="edit-samples-modal__row">
                    <FormField label="Date" htmlFor={`${formId}-date`}>
                      <DatePicker
                        id={`${formId}-date`}
                        value={draft.sampleDate}
                        placeholder="Date"
                        disabled={submitting}
                        onChange={(value) => {
                          setDraft((current) => ({ ...current, sampleDate: value }));
                        }}
                      />
                    </FormField>

                    <FormField label="Time" htmlFor={`${formId}-time`}>
                      <TimePicker
                        id={`${formId}-time`}
                        value={draft.sampleTime}
                        placeholder="HH:mm"
                        disabled={submitting}
                        onChange={(value) => {
                          setDraft((current) => ({ ...current, sampleTime: value }));
                        }}
                      />
                    </FormField>
                  </div>

                  {showRecovery ? (
                    <FormField label="Recovery" htmlFor={`${formId}-recovery`}>
                      <Input
                        id={`${formId}-recovery`}
                        variant="ui"
                        type="text"
                        value={draft.recovery}
                        placeholder="Recovery"
                        disabled={submitting}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            recovery: event.target.value,
                          }))
                        }
                      />
                    </FormField>
                  ) : null}

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
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraft((current) => ({ ...current, comments: value }));
                      }}
                    />
                  </FormField>

                  {showLabTests ? (
                    <div className="edit-samples-modal__lab">
                      <div className="edit-samples-modal__lab-head">
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={submitting}
                          onClick={() => setCreateLabRequestOpen(true)}
                        >
                          <PlusIcon />
                          Create Request
                        </UiButton>
                      </div>

                      <FormField label="Lab Test Request" htmlFor={`${formId}-lab-request`}>
                        <Select
                          id={`${formId}-lab-request`}
                          value={draft.labTestRequestId}
                          options={labRequestSelectOptions}
                          placeholder="Select request name"
                          disabled={submitting || labRequestSelectOptions.length === 0}
                          onChange={(value) => {
                            const match = sessionLabRequests.find((entry) => entry.id === value);
                            setDraft((current) => ({
                              ...current,
                              labTestRequestId: value,
                              labTestTypeIds:
                                match && match.labTestTypeIds.length > 0
                                  ? [...match.labTestTypeIds]
                                  : current.labTestTypeIds,
                            }));
                          }}
                        />
                      </FormField>

                      <FormField label="Lab Test Types" htmlFor={`${formId}-lab-types`}>
                        <MultiSelect
                          id={`${formId}-lab-types`}
                          value={draft.labTestTypeIds}
                          options={labTestTypeOptions}
                          placeholder="Select a lab test types"
                          disabled={submitting || labTestTypeOptions.length === 0}
                          onChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              labTestTypeIds: value,
                            }))
                          }
                        />
                      </FormField>
                    </div>
                  ) : null}

                  {showInsituTests ? (
                    <div className="edit-samples-modal__insitu">
                      <div className="edit-samples-modal__insitu-head">
                        <h3 className="edit-samples-modal__insitu-title">Insitu Tests</h3>
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={submitting || insituBusy}
                          onClick={() => setInsituModalOpen(true)}
                        >
                          Add Insitu Testing
                        </UiButton>
                      </div>

                      <div className="edit-samples-modal__insitu-table-wrap">
                        <table className="edit-samples-modal__insitu-table">
                          <thead>
                            <tr>
                              <th>Depth From</th>
                              <th>Depth To</th>
                              <th>Test Type</th>
                              <th>Results</th>
                              <th aria-label="Actions" />
                            </tr>
                          </thead>
                          <tbody>
                            {tableRowsEmpty ? (
                              <tr>
                                <td colSpan={5} className="edit-samples-modal__insitu-empty">
                                  {loadingLinked
                                    ? "Loading insitu tests…"
                                    : "No insitu tests for this sample yet."}
                                </td>
                              </tr>
                            ) : (
                              <>
                                {linkedTests.map((entry) => (
                                  <tr key={entry.id}>
                                    <td>{entry.depthFrom || "—"}</td>
                                    <td>{entry.depthTo || "—"}</td>
                                    <td>{entry.testTypeName || "—"}</td>
                                    <td>{entry.results || "—"}</td>
                                    <td>
                                      <UiButton
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Remove ${entry.testTypeName || "insitu test"}`}
                                        disabled={submitting || insituBusy}
                                        onClick={() => {
                                          void handleRemoveLinked(entry);
                                        }}
                                      >
                                        <TrashIcon />
                                      </UiButton>
                                    </td>
                                  </tr>
                                ))}
                                {pendingTests.map((entry) => (
                                  <tr key={entry.localId}>
                                    <td>{entry.depthFrom || "—"}</td>
                                    <td>{entry.depthTo || "—"}</td>
                                    <td>{entry.testTypeName || "—"}</td>
                                    <td>{entry.results || "—"}</td>
                                    <td>
                                      <UiButton
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Remove pending ${entry.testTypeName || "insitu test"}`}
                                        disabled={submitting || insituBusy}
                                        onClick={() => handleRemovePending(entry.localId)}
                                      >
                                        <TrashIcon />
                                      </UiButton>
                                    </td>
                                  </tr>
                                ))}
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {!sampleId && pendingTests.length > 0 ? (
                        <p className="edit-samples-modal__hint">
                          Pending tests will be saved to the Insitu Tests tab when you submit this
                          sample.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {showSubsurface ? (
                    <div className="edit-samples-modal__subsurface">
                      <div className="edit-samples-modal__subsurface-head">
                        <h3 className="edit-samples-modal__insitu-title">Subsurface Profile</h3>
                      </div>
                      <div className="edit-samples-modal__insitu-table-wrap">
                        <table className="edit-samples-modal__insitu-table">
                          <thead>
                            <tr>
                              <th>Depth From</th>
                              <th>Depth To</th>
                              <th>Sample ID</th>
                              <th>Classification</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>{draft.depthFrom.trim() || "—"}</td>
                              <td>{draft.depthTo.trim() || "—"}</td>
                              <td>{draft.sampleNo.trim() || "—"}</td>
                              <td>
                                {editingSubsurface ? (
                                  <Input
                                    id={`${formId}-subsurface-classification`}
                                    variant="ui"
                                    type="text"
                                    value={draft.subsurfaceClassification}
                                    placeholder="Classification"
                                    disabled={submitting}
                                    onChange={(event) =>
                                      setDraft((current) => ({
                                        ...current,
                                        subsurfaceClassification: event.target.value,
                                      }))
                                    }
                                  />
                                ) : (
                                  draft.subsurfaceClassification.trim() || "—"
                                )}
                              </td>
                              <td>
                                <UiButton
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  aria-label={
                                    editingSubsurface
                                      ? "Done editing classification"
                                      : "Edit classification"
                                  }
                                  disabled={submitting || !draft.depthFrom.trim()}
                                  onClick={() => setEditingSubsurface((current) => !current)}
                                >
                                  <EditIcon />
                                </UiButton>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      {!draft.depthFrom.trim() ? (
                        <p className="edit-samples-modal__hint">
                          Enter Depth From to enable editing the subsurface classification.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
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

      <EditInsituTestModal
        open={insituModalOpen}
        mode="add"
        logConfigurationId={logConfigurationId}
        testTypes={modalInsituTypes}
        onClose={() => setInsituModalOpen(false)}
        onSubmit={handleInsituSubmit}
        onTestTypesChange={setInsituTypes}
      />

      <CreateLabTestRequestModal
        open={createLabRequestOpen}
        onClose={() => setCreateLabRequestOpen(false)}
        logConfigurationId={logConfigurationId}
        labOptions={labOptions}
        logOptions={logOptions}
        presetOptions={presetOptions}
        labTestTypeOptions={labTestTypeOptions}
        loadingOptions={loadingLabOptions}
        initialValues={{
          logIds: [String(logId)],
          includesAllLogs: false,
        }}
        onSubmit={async (payload: CreateLabTestRequestPayload) => {
          const id = createLocalId();
          const nextRequest: SessionLabRequest = {
            id,
            requestName: payload.requestName.trim(),
            labTestTypeIds: [...payload.labTestTypeIds],
          };
          setSessionLabRequests((current) => [...current, nextRequest]);
          setDraft((current) => ({
            ...current,
            labTestRequestId: id,
            labTestTypeIds:
              payload.labTestTypeIds.length > 0
                ? [...payload.labTestTypeIds]
                : current.labTestTypeIds,
          }));
        }}
      />

      <ManageSampleTypesModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        companyOptions={DEFAULT_SAMPLE_TYPE_OPTIONS}
        insituTestTypeOptions={manageInsituOptions}
        onClose={() => setManageTypesOpen(false)}
        onSave={(options) => {
          void handleSaveSampleTypes(options);
        }}
      />
    </>
  );
}
