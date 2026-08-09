"use client";

import { useId, useMemo, useState } from "react";
import { FormField, Input, Select, UiButton } from "@/shared/components/ui";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import {
  DEFAULT_REMARK_TYPE_OPTIONS,
  LOG_REMARKS_MODULE_ID,
  MODULE_DATA_TYPES,
  MODULE_DISPLAY_NAME_MAX_LENGTH,
  createDefaultLogRemarksConfig,
  getModuleDataTypeOptions,
  type LogRemarksModuleConfig,
  type StoredModuleSettings,
} from "../../utils/configModules";
import {
  REMARKS_QUICK_NOTES_DATA_TYPE_ID,
  REMARK_TYPES_DATA_TYPE_ID,
  parseRemarksQuickNoteOptions,
  toRemarksQuickNoteModuleNamedOption,
  type RemarksQuickNoteOption,
} from "../../utils/configModules/remarksQuickNote";
import {
  parseRemarkTypeOptions,
  toRemarkTypeModuleNamedOption,
  type RemarkTypeOption,
} from "../../utils/configModules/remarkType";
import { useUserRemarkTypes } from "../../hooks/useUserRemarkTypes";
import { useUserRemarksQuickNotes } from "../../hooks/useUserRemarksQuickNotes";
import { ManageRemarkTypesModal } from "./ManageRemarkTypesModal";
import { ManageRemarksQuickNotesModal } from "./ManageRemarksQuickNotesModal";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

type LogRemarksModuleSettingsPanelProps = Readonly<{
  logConfigurationId: string;
  settings: StoredModuleSettings;
  disabled?: boolean;
  /** Optional company-wide remark types for the "Select Existing" copy control. */
  companyRemarkTypes?: RemarkTypeOption[];
  /** Optional company-wide quick notes for the "Select Existing" copy control. */
  companyQuickNotes?: RemarksQuickNoteOption[];
  onChange: (patch: Partial<StoredModuleSettings>) => void;
  onRemove: () => void;
}>;

function getRemarksConfig(settings: StoredModuleSettings): LogRemarksModuleConfig {
  return settings.remarks ?? createDefaultLogRemarksConfig();
}

export function LogRemarksModuleSettingsPanel({
  logConfigurationId,
  settings,
  disabled,
  companyRemarkTypes = [],
  companyQuickNotes = [],
  onChange,
  onRemove,
}: LogRemarksModuleSettingsPanelProps) {
  const formId = useId();
  const remarks = getRemarksConfig(settings);
  const dataTypes = MODULE_DATA_TYPES[LOG_REMARKS_MODULE_ID] ?? [];
  const [managingRemarkTypes, setManagingRemarkTypes] = useState(false);
  const [managingQuickNotes, setManagingQuickNotes] = useState(false);

  const remarkTypesApi = useUserRemarkTypes(LOG_REMARKS_MODULE_ID, {
    enabled: managingRemarkTypes,
    logConfigurationId,
  });
  const quickNotesApi = useUserRemarksQuickNotes(LOG_REMARKS_MODULE_ID, {
    enabled: managingQuickNotes,
    logConfigurationId,
  });

  const settingsRemarkTypes = useMemo(
    () =>
      parseRemarkTypeOptions(
        getModuleDataTypeOptions(settings, REMARK_TYPES_DATA_TYPE_ID),
        DEFAULT_REMARK_TYPE_OPTIONS
      ),
    [settings]
  );

  const settingsQuickNotes = useMemo(
    () =>
      parseRemarksQuickNoteOptions(
        getModuleDataTypeOptions(settings, REMARKS_QUICK_NOTES_DATA_TYPE_ID),
        []
      ),
    [settings]
  );

  /** Prefer dedicated collection data over module-settings JSON when managing. */
  const remarkTypes: RemarkTypeOption[] = managingRemarkTypes
    ? remarkTypesApi.loading && remarkTypesApi.items.length === 0
      ? settingsRemarkTypes
      : remarkTypesApi.items
    : settingsRemarkTypes;

  const quickNotes: RemarksQuickNoteOption[] = managingQuickNotes
    ? quickNotesApi.loading && quickNotesApi.items.length === 0
      ? settingsQuickNotes
      : quickNotesApi.items
    : settingsQuickNotes;

  const resolvedCompanyRemarkTypes = useMemo(() => {
    if (companyRemarkTypes.length > 0) {
      return parseRemarkTypeOptions(companyRemarkTypes, []);
    }
    return DEFAULT_REMARK_TYPE_OPTIONS.map((entry) => ({ ...entry }));
  }, [companyRemarkTypes]);

  const updateRemarks = (patch: Partial<LogRemarksModuleConfig>) => {
    onChange({
      remarks: {
        ...remarks,
        ...patch,
      },
    });
  };

  const handleSaveRemarkTypes = async (options: RemarkTypeOption[]) => {
    try {
      const saved = await remarkTypesApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [REMARK_TYPES_DATA_TYPE_ID]: saved.map((entry) => toRemarkTypeModuleNamedOption(entry)),
        },
      });
      setManagingRemarkTypes(false);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleSaveQuickNotes = async (options: RemarksQuickNoteOption[]) => {
    try {
      const saved = await quickNotesApi.save(options);
      onChange({
        dataTypeOptions: {
          ...settings.dataTypeOptions,
          [REMARKS_QUICK_NOTES_DATA_TYPE_ID]: saved.map((entry) =>
            toRemarksQuickNoteModuleNamedOption(entry)
          ),
        },
      });
      setManagingQuickNotes(false);
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.UPDATE_LOG_CONFIGURATION);
    }
  };

  const handleManageClick = (dataTypeId: string) => {
    if (dataTypeId === REMARKS_QUICK_NOTES_DATA_TYPE_ID) {
      setManagingQuickNotes(true);
      return;
    }
    if (dataTypeId === REMARK_TYPES_DATA_TYPE_ID) {
      setManagingRemarkTypes(true);
    }
  };

  return (
    <>
      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header log-config-detail__panel-header--row">
          <div>
            <h3 className="log-config-detail__section-title">Edit Remarks</h3>
            {/* <p className="log-config-detail__section-description">
              Configure Log Remarks for this log configuration. Remark types and quick notes are
              stored separately and apply only to this configuration.
            </p> */}
          </div>
          <UiButton
            type="button"
            variant="danger"
            size="sm"
            disabled={disabled}
            onClick={onRemove}
          >
            Delete
          </UiButton>
        </div>

        <div className="log-config-modules-editor__fields">
          <FormField label="Module Name" htmlFor={`${formId}-name`}>
            <Input
              id={`${formId}-name`}
              variant="ui"
              value={settings.moduleName}
              disabled={disabled}
              maxLength={MODULE_DISPLAY_NAME_MAX_LENGTH}
              onChange={(event) => onChange({ moduleName: event.target.value })}
            />
          </FormField>

          <div className="log-config-modules-editor__fields-row">
            <FormField label="Module Status" htmlFor={`${formId}-status`}>
              <Select
                id={`${formId}-status`}
                value={settings.status}
                disabled={disabled}
                options={STATUS_OPTIONS}
                onChange={(value) =>
                  onChange({ status: value === "inactive" ? "inactive" : "active" })
                }
              />
            </FormField>
          </div>
        </div>
      </section>

      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header">
          <h3 className="log-config-detail__section-title">Manage Remarks Data Types</h3>
          <p className="log-config-detail__section-description">
            Set general data collection settings for your log configuration. These settings will be
            applied to a log when this configuration is applied.
          </p>
        </div>

        <div className="log-config-modules-datatypes-table-wrap">
          <table className="log-config-modules-datatypes-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col" className="log-config-modules-datatypes-table__center">
                  Allow Users to Manage in Logs
                </th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dataTypes.map((dataType) => {
                const allow =
                  remarks.allowUsersToManage[dataType.id] ?? dataType.id === "remark-types";

                return (
                  <tr key={dataType.id}>
                    <td>{dataType.name}</td>
                    <td className="log-config-modules-datatypes-table__center">
                      <Select
                        id={`${formId}-allow-${dataType.id}`}
                        value={allow ? "yes" : "no"}
                        disabled={disabled}
                        options={YES_NO_OPTIONS}
                        onChange={(value) =>
                          updateRemarks({
                            allowUsersToManage: {
                              ...remarks.allowUsersToManage,
                              [dataType.id]: value === "yes",
                            },
                          })
                        }
                      />
                    </td>
                    <td>
                      {dataType.editable ? (
                        <UiButton
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={disabled}
                          onClick={() => handleManageClick(dataType.id)}
                        >
                          Manage
                        </UiButton>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ManageRemarkTypesModal
        open={managingRemarkTypes}
        options={remarkTypes}
        companyOptions={resolvedCompanyRemarkTypes}
        onClose={() => setManagingRemarkTypes(false)}
        onSave={handleSaveRemarkTypes}
      />

      <ManageRemarksQuickNotesModal
        open={managingQuickNotes}
        remarkTypes={remarkTypes}
        options={quickNotes}
        companyOptions={companyQuickNotes}
        onClose={() => setManagingQuickNotes(false)}
        onSave={handleSaveQuickNotes}
      />
    </>
  );
}
