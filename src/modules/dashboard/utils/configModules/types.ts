export const MODULE_DISPLAY_NAME_MAX_LENGTH = 100;
export const MODULE_OPTION_NAME_MAX_LENGTH = 200;
export const MODULE_OPTIONS_MAX_COUNT = 100;
export const WORKFLOW_NAME_MAX_LENGTH = 200;
export const WORKFLOW_STEPS_MAX_COUNT = 200;

export const MODULE_STATUSES = ["active", "inactive"] as const;
export type ModuleStatus = (typeof MODULE_STATUSES)[number];

export const WORKFLOW_STEP_TYPES = ["element", "variation"] as const;
export type WorkflowStepType = (typeof WORKFLOW_STEP_TYPES)[number];

export const WORKFLOW_FIELD_INPUT_TYPES = [
  "number",
  "checkbox",
  "options",
  "note",
  "color",
  "text",
] as const;
export type WorkflowFieldInputType = (typeof WORKFLOW_FIELD_INPUT_TYPES)[number];

export const WORKFLOW_STEP_CONDITION_TYPES = ["enable", "disable", "show", "hide"] as const;
export type WorkflowStepConditionType = (typeof WORKFLOW_STEP_CONDITION_TYPES)[number];

export type ModuleNamedOption = {
  id: string;
  name: string;
  /** Origin: name shown in generated descriptions */
  nameInDescription?: string;
  /** Origin: short code shown in descriptions */
  codeInDescription?: string | null;
  /** Rock type / non-soil type short code */
  code?: string | null;
  /** Finishing reason abbreviation */
  abbreviation?: string | null;
  /** Finishing reason: show auto-scale option */
  showAutoScale?: boolean;
  /** Origin: when true, code overrides classification abbreviation */
  classificationCodeOverride?: boolean;
  /** Origin type group (Soil / Rock / Non-Soil) */
  type?: string;
  /** Rock group classification (Sedimentary / Igneous / Metamorphic) */
  rockGroup?: string | null;
  /** Origin classification / graphic fill color */
  color?: string | null;
  /** Geomodal layer graphic overlay color */
  overlayColor?: string | null;
  /** Color option label text color (White / Black hex) */
  textColor?: string | null;
  applyColorToPdf?: boolean;
  overrideGraphic?: boolean;
  splitGraphic?: boolean;
  /** Filename under /classification-graphics, insitu-test-type-pngs, water-obs, casing-type-graphics, well-casing, or well-backfill */
  graphic?: string | null;
  /** Well type / well casing: allow negative depths above ground */
  allowNegativeDepth?: boolean;
  /** Well cover: graphic alignment within the log column */
  graphicAlignment?: "top" | "bottom";
  /** Insitu test type: active in left menu (false = inactive list) */
  active?: boolean;
  /** Insitu test type: use segregated top/bottom graphics */
  enableSegregatedGraphic?: boolean;
  /** Insitu test type: top graphic filename (SVG) */
  topGraphic?: string | null;
  /** Insitu test type: bottom graphic filename (SVG) */
  bottomGraphic?: string | null;
  /** Drilling casing: optional start graphic filename */
  startGraphic?: string | null;
  /** Drilling casing: optional end graphic filename */
  endGraphic?: string | null;
  depthFrequencyEnabled?: boolean;
  depthFrequency?: string | null;
  enableSampleLogging?: boolean;
  enableSubsurfaceLogging?: boolean;
  defaultSampleTypeId?: string | null;
  enableAutoSampleDescription?: boolean;
  /** Insitu test type: intervals / other settings / unit fields */
  settings?: unknown;
  /** Drilling type / resistance: optional Tablogs alias */
  tablogsAlias?: string | null;
  /** Drilling type: bore log vs core log */
  logKind?: "bore" | "core";
  /** Drilling type: enable recovery field on logs */
  enableRecoveryField?: boolean;
  /** Drilling type: enable windowed / windowless */
  enableWindowedWindowless?: boolean;
  /** Drilling type: water added flag */
  waterAdded?: boolean;
  /** Drilling observation: require depth when logging */
  depthRequired?: boolean;
  /** Well probe type: record depth-to when logging */
  recordDepthTo?: boolean;
  /** Drilling observation: require date/time when logging */
  observationDateTimeRequired?: boolean;
  /** Drilling observation: depth of casing marker */
  isDepthOfCasing?: boolean;
  /** Drilling observation: depth to water marker */
  isDepthToWater?: boolean;
  /** Sample type: abbreviation shown on logs */
  sampleAbbreviation?: string | null;
  /** Sample type: note recovery when logging */
  noteRecovery?: boolean;
  /** Sample type: display QC ID field */
  displayQcId?: boolean;
  /** Sample type: enable assign lab test */
  enableAssignLabTest?: boolean;
  /** Sample type: enable creating insitu tests from samples */
  enableInsituTestLogging?: boolean;
  /** Sample type: default insitu-test type created from samples */
  defaultInsituTestTypeId?: string | null;
  /** Lab test preset: selected lab test type ids */
  labTestTypeIds?: string[];
  /** Lab test type: optional external alias */
  externalAlias?: string | null;
  /** Lab test type: selected alias table name */
  aliasTable?: string | null;
  /** Lab test type: include in selected data-plot borelogs */
  addAsSelectedDataPlot?: boolean;
  /** Lab test type: result table design columns */
  labTestResultFields?: Array<{
    id: string;
    name: string;
    externalAlias?: string | null;
    tablogsAlias?: string | null;
  }>;
  /** Remarks quick note: parent remark type id */
  remarkTypeId?: string | null;
};

export type ModuleGeneralSettings = {
  moduleName: string;
  status: ModuleStatus;
  showOnWeb: boolean;
  showOnMobile: boolean;
};

export type ModuleDataTypeDefinition = {
  id: string;
  name: string;
  editable: boolean;
};

export type WorkflowStepOption = {
  id: string;
  name: string;
  value: string;
  visible?: boolean;
  /** Origin/rock group used by step enable conditions (e.g. Soil, Rock, Non-Soil). */
  group?: string;
  /** Rock group classification (e.g. Metamorphic) for rock-type option conditions. */
  rockGroup?: string;
  abbreviation?: string;
  isDefault?: boolean;
  /** Fill color for color-input chips (from linked colors option set). */
  color?: string | null;
  conditions?: WorkflowStepCondition[];
};

export type WorkflowStepCondition = {
  type: WorkflowStepConditionType;
  field: string;
  value: string | boolean | number;
  searchTerm?: string;
  isOriginType?: boolean;
  isRockGroup?: boolean;
};

export type WorkflowStep = {
  id: string;
  /** Display name shown in Manage Workflow list */
  name: string;
  type: WorkflowStepType;
  /** Canonical field label (e.g. Depth, Origin) */
  fieldName?: string;
  inputType?: WorkflowFieldInputType;
  databaseField?: string;
  required?: boolean;
  unit?: string;
  optionSet?: string | null;
  options?: WorkflowStepOption[];
  conditions?: WorkflowStepCondition[];
  multipleOptions?: boolean;
  maxOptionsSelected?: number;
  allowFreeText?: boolean;
  conditionsOperator?: "AND" | "OR";
  /** Rich-text or plain instructions shown when logging this step. */
  instructions?: string;
};

export type ClassificationRuleCondition =
  | "equal_one"
  | "equal_all"
  | "equal_null"
  | "not_equal"
  | "not_contains_any"
  | "contains_one_or_more";

export type ClassificationRuleLeaf = {
  id: string;
  kind: "condition";
  field: string;
  condition: ClassificationRuleCondition;
  value: string[];
  searchTerm?: string;
};

export type ClassificationRuleGroup = {
  id: string;
  kind: "group";
  operator: "AND" | "OR";
  rules: ClassificationRuleNode[];
};

export type ClassificationRuleNode = ClassificationRuleLeaf | ClassificationRuleGroup;

export type ClassificationCode = {
  id: string;
  name: string;
  abbreviation: string;
  graphic: string;
  graphicColorOverlay?: string | null;
  fillOverrideColor?: string | null;
  /** Apply chosen graphic/colors to these other classification code ids on save. */
  applyGraphicToIds?: string[];
  rules?: ClassificationRuleGroup;
};

export type WorkflowSettings = {
  enabled: boolean;
  name: string;
  /** When true, configuration ignores inherited parent legacy workflow settings. */
  ignoreParentLegacySettings: boolean;
  steps: WorkflowStep[];
  /** When true, apply classification code matching rules in the workflow preview. */
  applyClassificationRules: boolean;
  classificationCodes: ClassificationCode[];
};

export const LOG_REPORT_WATERMARK_STATUSES = [
  { id: "todo", label: "To do (Default)" },
  { id: "field", label: "Field (Once either refusal or termination is clicked)" },
  { id: "preliminary", label: "Preliminary" },
  { id: "draft", label: "Draft" },
  { id: "final", label: "Final" },
  { id: "inactive", label: "In Active" },
] as const;

export type LogReportWatermarkStatusId =
  (typeof LOG_REPORT_WATERMARK_STATUSES)[number]["id"];

export type LogReportModuleConfig = {
  borelogTemplate: string;
  corelogTemplate: string;
  adjustChartsFocusedView: boolean;
  logHeader: string;
  logFooter: string;
  watermarksEnabled: boolean;
  watermarkFontSize: number;
  watermarkTexts: Record<LogReportWatermarkStatusId, string>;
};

export type SubsurfacesModuleConfig = {
  munsellColorPicker: boolean;
  applyColourAsOverlay: boolean;
  switchImperialMetric: boolean;
  switchFtInches: boolean;
  /** Whether users can manage each data type's options in logs */
  allowUsersToManage: Record<string, boolean>;
  finishTexts: ModuleNamedOption[];
};

export type InsituTestsModuleConfig = {
  enableAutoAddResult: boolean;
  /** Whether users can manage each data type's options in logs */
  allowUsersToManage: Record<string, boolean>;
  unitSettings: ModuleNamedOption[];
};

export type LogRemarksModuleConfig = {
  /** Whether users can manage each data type's options in logs */
  allowUsersToManage: Record<string, boolean>;
};

export type DrillingObservationsModuleConfig = {
  /** Whether users can manage each data type's options in logs */
  allowUsersToManage: Record<string, boolean>;
};

export type WaterObservationsModuleConfig = {
  allowLinkingToWellId: boolean;
  /** Whether users can manage each data type's options in logs */
  allowUsersToManage: Record<string, boolean>;
};

export type WellLogsModuleConfig = {
  setDefaultWellId: boolean;
  defaultWellIds: ModuleNamedOption[];
  /** Whether users can manage each data type's options in logs */
  allowUsersToManage: Record<string, boolean>;
};

export type SamplesModuleConfig = {
  includeUniqueSampleCode: boolean;
  autoSampleIdFormat: boolean;
  /** Template used when auto sample ID format is enabled (e.g. `{{project_number}}_{{log_name}}_…`). */
  autoSampleIdFormatString: string;
  projectLevelSampleId: boolean;
  noDuplicateSampleId: boolean;
  /** Whether users can manage each data type's options in logs */
  allowUsersToManage: Record<string, boolean>;
};

export type LabTestsModuleConfig = {
  /** Whether users can manage each data type's options in logs */
  allowUsersToManage: Record<string, boolean>;
};

export type CoreLoggingModuleConfig = {
  sampleOrientedCoreDefects: boolean;
  sampleOrientedRqdTcr: boolean;
  defaultSampleTypes: ModuleNamedOption[];
  showDefectOrientation: boolean;
  showBetaAngle: boolean;
  showSurfaceShape: boolean;
  showSurfaceRoughness: boolean;
  showDefectCoatings: boolean;
  showDefectOpenness: boolean;
  showDefectSpacingOverride: boolean;
  showJointRoughnessCoefficient: boolean;
  showBoundsOnDefectMax: boolean;
  showBoundsOnDefectMin: boolean;
  showMajorInfillMaterial: boolean;
  showMinorInfillMaterial: boolean;
  showApertureSpacing: boolean;
  showApertureColor: boolean;
  showApertureMineral: boolean;
  showJointCondition: boolean;
  showRqdRecRunType: boolean;
  autoCalculationCoreRecoveryLength: boolean;
  showScr: boolean;
  showFractureIndex: boolean;
  showRmr: boolean;
  showStrengthInCoreLogging: boolean;
  showWeatheringInCoreLogging: boolean;
  showIndependentFractureIndex: boolean;
  /** Whether users can manage each data type's options in logs */
  allowUsersToManage: Record<string, boolean>;
};

export type ModuleExtraSettings = {
  report?: LogReportModuleConfig;
  subsurface?: SubsurfacesModuleConfig;
  insitu?: InsituTestsModuleConfig;
  remarks?: LogRemarksModuleConfig;
  drillingObservations?: DrillingObservationsModuleConfig;
  waterObservations?: WaterObservationsModuleConfig;
  wellLogs?: WellLogsModuleConfig;
  samples?: SamplesModuleConfig;
  labTests?: LabTestsModuleConfig;
  coreLogging?: CoreLoggingModuleConfig;
};

export type StoredModuleSettings = ModuleGeneralSettings &
  ModuleExtraSettings & {
    /** Options keyed by data-type id from MODULE_DATA_TYPES */
    dataTypeOptions: Record<string, ModuleNamedOption[]>;
  };

export type ConfigModuleSettings = {
  order: string[];
  modules: Record<string, StoredModuleSettings>;
  workflow: WorkflowSettings;
};

export type ModuleSettingsSpec = {
  id: string;
  displayName: string;
  dataTypes: readonly ModuleDataTypeDefinition[];
  defaultOptions: Record<string, ModuleNamedOption[]>;
  defaultShowOnMobile?: boolean;
  enrichDefaults?: (settings: StoredModuleSettings) => StoredModuleSettings;
  enrichParsed?: (value: unknown, settings: StoredModuleSettings) => StoredModuleSettings;
  cloneExtra?: (entry: StoredModuleSettings) => ModuleExtraSettings;
};
