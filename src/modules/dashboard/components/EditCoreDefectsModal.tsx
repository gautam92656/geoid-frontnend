"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  FormField,
  Input,
  MultiSelect,
  Select,
  UiButton,
  ProjectModalPortal,
} from "@/shared/components/ui";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { getLogConfiguration } from "../services/logConfigurationApi";
import { getUserCoreDefectTypes } from "../services/configModulesApi";
import {
  CORE_LOGGING_MODULE_ID,
  DEFAULT_CORE_DEFECT_TYPE_OPTIONS,
  createDefaultCoreLoggingConfig,
  parseCoreDefectTypeOptions,
  parseCoreLoggingConfig,
  type CoreDefectTypeOption,
  type CoreLoggingModuleConfig,
  type SurfaceShapeOption,
  type SurfaceRoughnessOption,
  type DefectOpennessOption,
  type DefectCoatingOption,
} from "../utils/configModules";
import { useUserCoreDefectTypes } from "../hooks/useUserCoreDefectTypes";
import { useUserSurfaceShapes } from "../hooks/useUserSurfaceShapes";
import { useUserSurfaceRoughnesses } from "../hooks/useUserSurfaceRoughnesses";
import { useUserDefectOpennesses } from "../hooks/useUserDefectOpennesses";
import { useUserDefectCoatings } from "../hooks/useUserDefectCoatings";
import { ManageCoreDefectTypesModal } from "./configModules/ManageCoreDefectTypesModal";
import { ManageSurfaceShapesModal } from "./configModules/ManageSurfaceShapesModal";
import { ManageSurfaceRoughnessModal } from "./configModules/ManageSurfaceRoughnessModal";
import { ManageDefectOpennessModal } from "./configModules/ManageDefectOpennessModal";
import { ManageDefectCoatingsModal } from "./configModules/ManageDefectCoatingsModal";

export type LogCoreDefectFormPayload = {
  defectTypeId: string;
  defectTypeName: string;
  depthFrom: string;
  depthTo: string;
  defectOrientation: string;
  surfaceShapeIds: string[];
  surfaceRoughnessIds: string[];
  defectCoatingIds: string[];
  defectOpennessIds: string[];
  defectSpacingOverride: string;
  boundsOnDefectMin: string;
  boundsOnDefectMax: string;
  comments: string;
  photoFile: File | null;
  photoName: string;
};

type EditCoreDefectsModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  logConfigurationId: string;
  defectTypes?: CoreDefectTypeOption[];
  initialValues?: Partial<LogCoreDefectFormPayload> | null;
  onSubmit?: (payload: LogCoreDefectFormPayload) => void | Promise<void>;
  onDefectTypesChange?: (options: CoreDefectTypeOption[]) => void;
}>;

type DraftState = {
  defectTypeId: string;
  depthFrom: string;
  depthTo: string;
  defectOrientation: string;
  surfaceShapeIds: string[];
  surfaceRoughnessIds: string[];
  defectCoatingIds: string[];
  defectOpennessIds: string[];
  defectSpacingOverride: string;
  boundsOnDefectMin: string;
  boundsOnDefectMax: string;
  comments: string;
  photoFile: File | null;
  photoName: string;
};

type DraftErrors = {
  defectTypeId?: string;
  depthFrom?: string;
  depthTo?: string;
};

function createEmptyDraft(defectTypes: CoreDefectTypeOption[]): DraftState {
  const firstType = defectTypes.find((entry) => entry.id.trim());
  return {
    defectTypeId: firstType?.id ?? "",
    depthFrom: "",
    depthTo: "",
    defectOrientation: "",
    surfaceShapeIds: [],
    surfaceRoughnessIds: [],
    defectCoatingIds: [],
    defectOpennessIds: [],
    defectSpacingOverride: "",
    boundsOnDefectMin: "",
    boundsOnDefectMax: "",
    comments: "",
    photoFile: null,
    photoName: "",
  };
}

function createDraft(
  defectTypes: CoreDefectTypeOption[],
  initial: Partial<LogCoreDefectFormPayload> | null | undefined
): DraftState {
  const empty = createEmptyDraft(defectTypes);
  if (!initial) return empty;

  return {
    ...empty,
    defectTypeId: initial.defectTypeId?.trim() || empty.defectTypeId,
    depthFrom: initial.depthFrom ?? "",
    depthTo: initial.depthTo ?? "",
    defectOrientation: initial.defectOrientation ?? "",
    surfaceShapeIds: initial.surfaceShapeIds ?? [],
    surfaceRoughnessIds: initial.surfaceRoughnessIds ?? [],
    defectCoatingIds: initial.defectCoatingIds ?? [],
    defectOpennessIds: initial.defectOpennessIds ?? [],
    defectSpacingOverride: initial.defectSpacingOverride ?? "",
    boundsOnDefectMin: initial.boundsOnDefectMin ?? "",
    boundsOnDefectMax: initial.boundsOnDefectMax ?? "",
    comments: initial.comments ?? "",
    photoFile: initial.photoFile ?? null,
    photoName: initial.photoFile?.name ?? initial.photoName ?? "",
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

function ManageableSelectField({
  label,
  htmlFor,
  manageLabel,
  canManage,
  onManage,
  disabled,
  children,
}: Readonly<{
  label: string;
  htmlFor: string;
  manageLabel: string;
  canManage: boolean;
  onManage?: () => void;
  disabled?: boolean;
  children: ReactNode;
}>) {
  return (
    <div className="ui-field project-modal__field--full">
      <div className="edit-core-defects-modal__type-field-head">
        <label className="ui-field__label" htmlFor={htmlFor}>
          {label}
        </label>
        {canManage ? (
          <UiButton
            type="button"
            variant="primary"
            size="sm"
            className="edit-core-defects-modal__manage-btn"
            onClick={onManage}
            disabled={disabled || !onManage}
            aria-label={manageLabel}
          >
            Manage
          </UiButton>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function EditCoreDefectsModal({
  open,
  onClose,
  mode = "add",
  logConfigurationId,
  defectTypes = [],
  initialValues = null,
  onSubmit,
  onDefectTypesChange,
}: EditCoreDefectsModalProps) {
  const formId = useId();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [workingTypes, setWorkingTypes] = useState<CoreDefectTypeOption[]>(defectTypes);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(defectTypes, initialValues));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);
  const [manageSurfaceShapesOpen, setManageSurfaceShapesOpen] = useState(false);
  const [manageSurfaceRoughnessOpen, setManageSurfaceRoughnessOpen] = useState(false);
  const [manageDefectOpennessOpen, setManageDefectOpennessOpen] = useState(false);
  const [manageDefectCoatingsOpen, setManageDefectCoatingsOpen] = useState(false);
  const [surfaceShapes, setSurfaceShapes] = useState<SurfaceShapeOption[]>([]);
  const [surfaceRoughnesses, setSurfaceRoughnesses] = useState<SurfaceRoughnessOption[]>([]);
  const [defectOpennesses, setDefectOpennesses] = useState<DefectOpennessOption[]>([]);
  const [defectCoatings, setDefectCoatings] = useState<DefectCoatingOption[]>([]);
  const [coreLogging, setCoreLogging] = useState<CoreLoggingModuleConfig>(
    createDefaultCoreLoggingConfig()
  );

  const canManageTypes = Boolean(logConfigurationId.trim());

  const defectTypesApi = useUserCoreDefectTypes(CORE_LOGGING_MODULE_ID, {
    enabled: manageTypesOpen && canManageTypes,
    logConfigurationId,
  });

  const surfaceShapesApi = useUserSurfaceShapes(CORE_LOGGING_MODULE_ID, {
    enabled: (open || manageSurfaceShapesOpen) && canManageTypes,
    logConfigurationId,
  });

  const surfaceRoughnessesApi = useUserSurfaceRoughnesses(CORE_LOGGING_MODULE_ID, {
    enabled: (open || manageSurfaceRoughnessOpen) && canManageTypes,
    logConfigurationId,
  });

  const defectOpennessesApi = useUserDefectOpennesses(CORE_LOGGING_MODULE_ID, {
    enabled: (open || manageDefectOpennessOpen) && canManageTypes,
    logConfigurationId,
  });

  const defectCoatingsApi = useUserDefectCoatings(CORE_LOGGING_MODULE_ID, {
    enabled: (open || manageDefectCoatingsOpen) && canManageTypes,
    logConfigurationId,
  });

  const manageTypeOptions =
    manageTypesOpen && defectTypesApi.items.length > 0
      ? defectTypesApi.items
      : workingTypes;

  const manageSurfaceShapeOptions =
    manageSurfaceShapesOpen && surfaceShapesApi.items.length > 0
      ? surfaceShapesApi.items
      : surfaceShapes;

  const manageSurfaceRoughnessOptions =
    manageSurfaceRoughnessOpen && surfaceRoughnessesApi.items.length > 0
      ? surfaceRoughnessesApi.items
      : surfaceRoughnesses;

  const manageDefectOpennessOptions =
    manageDefectOpennessOpen && defectOpennessesApi.items.length > 0
      ? defectOpennessesApi.items
      : defectOpennesses;

  const manageDefectCoatingOptions =
    manageDefectCoatingsOpen && defectCoatingsApi.items.length > 0
      ? defectCoatingsApi.items
      : defectCoatings;

  const selectableTypes = useMemo(
    () => workingTypes.filter((entry) => entry.id.trim() && entry.name.trim()),
    [workingTypes]
  );

  const selectedType = useMemo(
    () =>
      selectableTypes.find((entry) => entry.id === draft.defectTypeId) ??
      workingTypes.find((entry) => entry.id === draft.defectTypeId) ??
      null,
    [draft.defectTypeId, selectableTypes, workingTypes]
  );

  useEffect(() => {
    if (!open) return;
    setWorkingTypes(defectTypes);
    setDraft(createDraft(defectTypes, mode === "edit" ? initialValues : null));
    setErrors({});
    setSubmitting(false);
    setManageTypesOpen(false);
    setManageSurfaceShapesOpen(false);
    setManageSurfaceRoughnessOpen(false);
    setManageDefectOpennessOpen(false);
    setManageDefectCoatingsOpen(false);
    // Reseed only when the dialog opens or the edit target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, mode, initialValues]);

  useEffect(() => {
    if (!open || surfaceShapesApi.loading) return;
    setSurfaceShapes(surfaceShapesApi.items);
  }, [open, surfaceShapesApi.items, surfaceShapesApi.loading]);

  useEffect(() => {
    if (!open || surfaceRoughnessesApi.loading) return;
    setSurfaceRoughnesses(surfaceRoughnessesApi.items);
  }, [open, surfaceRoughnessesApi.items, surfaceRoughnessesApi.loading]);

  useEffect(() => {
    if (!open || defectOpennessesApi.loading) return;
    setDefectOpennesses(defectOpennessesApi.items);
  }, [open, defectOpennessesApi.items, defectOpennessesApi.loading]);

  useEffect(() => {
    if (!open || defectCoatingsApi.loading) return;
    setDefectCoatings(defectCoatingsApi.items);
  }, [open, defectCoatingsApi.items, defectCoatingsApi.loading]);

  useEffect(() => {
    if (!open || workingTypes.length > 0 || defectTypes.length === 0) return;
    setWorkingTypes(defectTypes);
    setDraft(createDraft(defectTypes, mode === "edit" ? initialValues : null));
  }, [open, defectTypes, workingTypes.length, mode, initialValues]);

  useEffect(() => {
    if (!open || !logConfigurationId.trim()) {
      setCoreLogging(createDefaultCoreLoggingConfig());
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const configuration = await getLogConfiguration(logConfigurationId);
        const settings = configuration.moduleSettings.modules[CORE_LOGGING_MODULE_ID];
        if (cancelled) return;
        setCoreLogging(
          settings?.coreLogging
            ? parseCoreLoggingConfig(settings.coreLogging)
            : createDefaultCoreLoggingConfig()
        );
      } catch {
        if (!cancelled) setCoreLogging(createDefaultCoreLoggingConfig());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, logConfigurationId]);

  useEffect(() => {
    if (!open || defectTypes.length > 0 || !logConfigurationId.trim()) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await getUserCoreDefectTypes(
          CORE_LOGGING_MODULE_ID,
          logConfigurationId
        );
        if (cancelled) return;
        const parsed = parseCoreDefectTypeOptions(response.data, []);
        setWorkingTypes(parsed);
        setDraft((current) =>
          current.defectTypeId
            ? current
            : createDraft(parsed, mode === "edit" ? initialValues : null)
        );
        onDefectTypesChange?.(parsed);
      } catch (err) {
        if (!cancelled) showApiError(err, API_ERROR_MESSAGES.LOAD_CONFIG_MODULES);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, defectTypes.length, logConfigurationId, mode, initialValues, onDefectTypesChange]);

  useEffect(() => {
    if (
      !open ||
      manageTypesOpen ||
      manageSurfaceShapesOpen ||
      manageSurfaceRoughnessOpen ||
      manageDefectOpennessOpen ||
      manageDefectCoatingsOpen
    ) {
      return;
    }
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
  }, [
    open,
    manageTypesOpen,
    manageSurfaceShapesOpen,
    manageSurfaceRoughnessOpen,
    manageDefectOpennessOpen,
    manageDefectCoatingsOpen,
    onClose,
  ]);

  const handleSaveDefectTypes = async (options: CoreDefectTypeOption[]) => {
    try {
      const saved = await defectTypesApi.save(options);
      setWorkingTypes(saved);
      onDefectTypesChange?.(saved);
      setManageTypesOpen(false);
      showApiSuccess(undefined, "Core defect types saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveSurfaceShapes = async (options: SurfaceShapeOption[]) => {
    try {
      const saved = await surfaceShapesApi.save(options);
      setSurfaceShapes(saved);
      setManageSurfaceShapesOpen(false);
      showApiSuccess(undefined, "Surface shapes saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveSurfaceRoughnesses = async (options: SurfaceRoughnessOption[]) => {
    try {
      const saved = await surfaceRoughnessesApi.save(options);
      setSurfaceRoughnesses(saved);
      setManageSurfaceRoughnessOpen(false);
      showApiSuccess(undefined, "Surface roughness saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveDefectOpennesses = async (options: DefectOpennessOption[]) => {
    try {
      const saved = await defectOpennessesApi.save(options);
      setDefectOpennesses(saved);
      setManageDefectOpennessOpen(false);
      showApiSuccess(undefined, "Defect openness saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveDefectCoatings = async (options: DefectCoatingOption[]) => {
    try {
      const saved = await defectCoatingsApi.save(options);
      setDefectCoatings(saved);
      setManageDefectCoatingsOpen(false);
      showApiSuccess(undefined, "Defect coatings saved.");
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const defectTypeSelectOptions = useMemo(
    () => selectableTypes.map((entry) => ({ value: entry.id, label: entry.name })),
    [selectableTypes]
  );

  const validateDepth = (value: string, label: string, required: boolean): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return required ? `${label} is required.` : undefined;
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return `${label} must be a valid number.`;
    return undefined;
  };

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    if (!draft.defectTypeId.trim() || !selectedType) {
      next.defectTypeId = "Core defect type is required.";
    }
    const depthFromError = validateDepth(draft.depthFrom, "Depth From", true);
    if (depthFromError) next.depthFrom = depthFromError;
    const depthToError = validateDepth(draft.depthTo, "Depth To", false);
    if (depthToError) next.depthTo = depthToError;
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedType) return;

    const payload: LogCoreDefectFormPayload = {
      defectTypeId: selectedType.id,
      defectTypeName: selectedType.name,
      depthFrom: draft.depthFrom.trim(),
      depthTo: draft.depthTo.trim(),
      defectOrientation: draft.defectOrientation.trim(),
      surfaceShapeIds: [...draft.surfaceShapeIds],
      surfaceRoughnessIds: [...draft.surfaceRoughnessIds],
      defectCoatingIds: [...draft.defectCoatingIds],
      defectOpennessIds: [...draft.defectOpennessIds],
      defectSpacingOverride: draft.defectSpacingOverride.trim(),
      boundsOnDefectMin: draft.boundsOnDefectMin.trim(),
      boundsOnDefectMax: draft.boundsOnDefectMax.trim(),
      comments: draft.comments.trim(),
      photoFile: draft.photoFile,
      photoName: draft.photoName.trim() || draft.photoFile?.name?.trim() || "",
    };

    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(payload);
      }
      showApiSuccess(
        undefined,
        mode === "edit" ? "Core defect updated." : "Core defect added."
      );
      onClose();
    } catch (err) {
      showApiError(err, "Failed to save core defect.");
    } finally {
      setSubmitting(false);
    }
  };

  const surfaceShapeSelectOptions = useMemo(
    () => surfaceShapes.map((entry) => ({ value: entry.id, label: entry.name })),
    [surfaceShapes]
  );

  const surfaceRoughnessSelectOptions = useMemo(
    () => surfaceRoughnesses.map((entry) => ({ value: entry.id, label: entry.name })),
    [surfaceRoughnesses]
  );

  const defectOpennessSelectOptions = useMemo(
    () => defectOpennesses.map((entry) => ({ value: entry.id, label: entry.name })),
    [defectOpennesses]
  );

  const defectCoatingSelectOptions = useMemo(
    () => defectCoatings.map((entry) => ({ value: entry.id, label: entry.name })),
    [defectCoatings]
  );

  const allowManageField = (dataTypeId: string) =>
    canManageTypes && (coreLogging.allowUsersToManage[dataTypeId] ?? true);

  if (!open) return null;

  const title = mode === "edit" ? "Edit Core Defects" : "Add Core Defects";

  return (
    <>
      <ProjectModalPortal open={open}>
        <div className="project-modal project-modal--stacked" role="presentation">
          <button
            type="button"
            className="project-modal__backdrop"
            aria-label="Close Core Defects dialog"
            onClick={onClose}
          />
          <div
            className="project-modal__dialog project-modal__dialog--scroll project-modal__dialog--fields edit-core-defects-modal"
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
                <div className="project-modal__fields project-modal__fields--stack edit-core-defects-modal__fields">
                  <div
                    className={[
                      "ui-field",
                      "project-modal__field--full",
                      errors.defectTypeId ? "ui-field--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="edit-core-defects-modal__type-field-head">
                      <label className="ui-field__label" htmlFor={`${formId}-defect-type`}>
                        Select Core Defect Type
                        <span className="ui-field__required"> *</span>
                      </label>
                      {allowManageField("core-defect-types") ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          className="edit-core-defects-modal__manage-btn"
                          onClick={() => setManageTypesOpen(true)}
                          disabled={submitting}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </div>
                    <Select
                      id={`${formId}-defect-type`}
                      value={draft.defectTypeId}
                      disabled={submitting || selectableTypes.length === 0}
                      options={defectTypeSelectOptions}
                      placeholder="Select Core Defect Type"
                      onChange={(value) => {
                        setDraft((current) => ({ ...current, defectTypeId: value }));
                        setErrors((current) => ({ ...current, defectTypeId: undefined }));
                      }}
                    />
                    {errors.defectTypeId ? (
                      <p className="ui-field__error">{errors.defectTypeId}</p>
                    ) : null}
                  </div>

                  {selectableTypes.length === 0 ? (
                    <p className="edit-core-defects-modal__hint">
                      No core defect types are configured for this log configuration. Use Manage to
                      add defect types.
                    </p>
                  ) : null}

                  <FormField
                    label="Depth From (m)"
                    required
                    error={errors.depthFrom}
                    htmlFor={`${formId}-depth-from`}
                    className="project-modal__field--full"
                  >
                    <Input
                      id={`${formId}-depth-from`}
                      variant="ui"
                      type="text"
                      inputMode="decimal"
                      value={draft.depthFrom}
                      placeholder="Depth"
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

                  <FormField
                    label="Depth To (m)"
                    error={errors.depthTo}
                    htmlFor={`${formId}-depth-to`}
                    className="project-modal__field--full"
                  >
                    <Input
                      id={`${formId}-depth-to`}
                      variant="ui"
                      type="text"
                      inputMode="decimal"
                      value={draft.depthTo}
                      placeholder="Depth"
                      disabled={submitting}
                      onChange={(event) => {
                        setDraft((current) => ({
                          ...current,
                          depthTo: event.target.value,
                        }));
                        setErrors((current) => ({ ...current, depthTo: undefined }));
                      }}
                    />
                  </FormField>

                  {coreLogging.showDefectOrientation ? (
                    <FormField
                      label="Defect Orientation(Degrees)"
                      htmlFor={`${formId}-orientation`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-orientation`}
                        variant="ui"
                        type="text"
                        inputMode="decimal"
                        value={draft.defectOrientation}
                        placeholder="Defect Orientation"
                        disabled={submitting}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            defectOrientation: event.target.value,
                          }))
                        }
                      />
                    </FormField>
                  ) : null}

                  {coreLogging.showSurfaceShape ? (
                    <ManageableSelectField
                      label="Select Surface Shape"
                      htmlFor={`${formId}-surface-shape`}
                      manageLabel="Manage surface shapes"
                      canManage={allowManageField("surface-shapes")}
                      onManage={() => setManageSurfaceShapesOpen(true)}
                      disabled={submitting}
                    >
                      <MultiSelect
                        id={`${formId}-surface-shape`}
                        value={draft.surfaceShapeIds}
                        options={surfaceShapeSelectOptions}
                        placeholder="Select Surface Shape"
                        disabled={submitting}
                        onChange={(value) =>
                          setDraft((current) => ({ ...current, surfaceShapeIds: value }))
                        }
                      />
                    </ManageableSelectField>
                  ) : null}

                  {coreLogging.showSurfaceRoughness ? (
                    <ManageableSelectField
                      label="Surface Roughness"
                      htmlFor={`${formId}-surface-roughness`}
                      manageLabel="Manage surface roughness"
                      canManage={allowManageField("surface-roughnesses")}
                      onManage={() => setManageSurfaceRoughnessOpen(true)}
                      disabled={submitting}
                    >
                      <MultiSelect
                        id={`${formId}-surface-roughness`}
                        value={draft.surfaceRoughnessIds}
                        options={surfaceRoughnessSelectOptions}
                        placeholder="Surface Roughness"
                        disabled={submitting}
                        onChange={(value) =>
                          setDraft((current) => ({ ...current, surfaceRoughnessIds: value }))
                        }
                      />
                    </ManageableSelectField>
                  ) : null}

                  {coreLogging.showDefectCoatings ? (
                    <ManageableSelectField
                      label="Defect Coatings"
                      htmlFor={`${formId}-defect-coatings`}
                      manageLabel="Manage defect coatings"
                      canManage={allowManageField("defect-coatings")}
                      onManage={() => setManageDefectCoatingsOpen(true)}
                      disabled={submitting}
                    >
                      <MultiSelect
                        id={`${formId}-defect-coatings`}
                        value={draft.defectCoatingIds}
                        options={defectCoatingSelectOptions}
                        placeholder="Defect Coatings"
                        disabled={submitting}
                        onChange={(value) =>
                          setDraft((current) => ({ ...current, defectCoatingIds: value }))
                        }
                      />
                    </ManageableSelectField>
                  ) : null}

                  {coreLogging.showDefectOpenness ? (
                    <ManageableSelectField
                      label="Defect Openess"
                      htmlFor={`${formId}-defect-openness`}
                      manageLabel="Manage defect openness"
                      canManage={allowManageField("defect-opennesses")}
                      onManage={() => setManageDefectOpennessOpen(true)}
                      disabled={submitting}
                    >
                      <MultiSelect
                        id={`${formId}-defect-openness`}
                        value={draft.defectOpennessIds}
                        options={defectOpennessSelectOptions}
                        placeholder="Defect Openess"
                        disabled={submitting}
                        onChange={(value) =>
                          setDraft((current) => ({ ...current, defectOpennessIds: value }))
                        }
                      />
                    </ManageableSelectField>
                  ) : null}

                  {coreLogging.showDefectSpacingOverride ? (
                    <FormField
                      label="Defect Spacing Override"
                      htmlFor={`${formId}-spacing-override`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-spacing-override`}
                        variant="ui"
                        type="number"
                        step="any"
                        value={draft.defectSpacingOverride}
                        placeholder="Add defect spacing override"
                        disabled={submitting}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            defectSpacingOverride: event.target.value,
                          }))
                        }
                      />
                    </FormField>
                  ) : null}

                  {coreLogging.showBoundsOnDefectMin ? (
                    <FormField
                      label="Bounds On Defect (min)"
                      htmlFor={`${formId}-bounds-min`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-bounds-min`}
                        variant="ui"
                        type="text"
                        inputMode="decimal"
                        value={draft.boundsOnDefectMin}
                        placeholder="Min"
                        disabled={submitting}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            boundsOnDefectMin: event.target.value,
                          }))
                        }
                      />
                    </FormField>
                  ) : null}

                  {coreLogging.showBoundsOnDefectMax ? (
                    <FormField
                      label="Bounds On Defect (max)"
                      htmlFor={`${formId}-bounds-max`}
                      className="project-modal__field--full"
                    >
                      <Input
                        id={`${formId}-bounds-max`}
                        variant="ui"
                        type="text"
                        inputMode="decimal"
                        value={draft.boundsOnDefectMax}
                        placeholder="Max"
                        disabled={submitting}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            boundsOnDefectMax: event.target.value,
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
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          comments: event.target.value,
                        }))
                      }
                    />
                  </FormField>

                  <div className="ui-field project-modal__field--full edit-core-defects-modal__photo">
                    <span className="ui-field__label">Add Photo</span>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="edit-core-defects-modal__photo-input"
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
                      className="edit-core-defects-modal__photo-trigger"
                      disabled={submitting}
                      aria-label="Add photo"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <CameraIcon />
                    </button>
                    {draft.photoName ? (
                      <p className="edit-core-defects-modal__photo-name">{draft.photoName}</p>
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

      <ManageCoreDefectTypesModal
        open={manageTypesOpen}
        options={manageTypeOptions}
        companyOptions={DEFAULT_CORE_DEFECT_TYPE_OPTIONS}
        onClose={() => setManageTypesOpen(false)}
        onSave={(options) => {
          void handleSaveDefectTypes(options);
        }}
      />

      <ManageSurfaceShapesModal
        open={manageSurfaceShapesOpen}
        options={manageSurfaceShapeOptions}
        onClose={() => setManageSurfaceShapesOpen(false)}
        onSave={(options) => {
          void handleSaveSurfaceShapes(options);
        }}
      />

      <ManageSurfaceRoughnessModal
        open={manageSurfaceRoughnessOpen}
        options={manageSurfaceRoughnessOptions}
        onClose={() => setManageSurfaceRoughnessOpen(false)}
        onSave={(options) => {
          void handleSaveSurfaceRoughnesses(options);
        }}
      />

      <ManageDefectOpennessModal
        open={manageDefectOpennessOpen}
        options={manageDefectOpennessOptions}
        onClose={() => setManageDefectOpennessOpen(false)}
        onSave={(options) => {
          void handleSaveDefectOpennesses(options);
        }}
      />

      <ManageDefectCoatingsModal
        open={manageDefectCoatingsOpen}
        options={manageDefectCoatingOptions}
        onClose={() => setManageDefectCoatingsOpen(false)}
        onSave={(options) => {
          void handleSaveDefectCoatings(options);
        }}
      />
    </>
  );
}
