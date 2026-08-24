"use client";

import { useEffect, useId, useState } from "react";
import { FormField, Input, Select, Toggle, UiButton, type SelectOption } from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { showApiError } from "@/shared/utils/apiToast";
import { listHeaderFooterTemplates } from "../../services/headerFooterTemplateApi";
import { listLogTemplates } from "../../services/logTemplateApi";
import { useOwnerUserId } from "../../context/LogConfigurationOwnerContext";
import {
  LOG_REPORT_WATERMARK_STATUSES,
  MODULE_DISPLAY_NAME_MAX_LENGTH,
  createDefaultLogReportConfig,
  type LogReportModuleConfig,
  type LogReportWatermarkStatusId,
  type StoredModuleSettings,
} from "../../utils/configModules";
import { toTemplateOptions } from "../../utils/logReportPreviewUtils";
import { ManageLogReportTemplatesModal } from "../ManageLogReportTemplatesModal";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

type LogReportModuleSettingsPanelProps = Readonly<{
  settings: StoredModuleSettings;
  disabled?: boolean;
  onChange: (patch: Partial<StoredModuleSettings>) => void;
  onRemove: () => void;
}>;

function getReportConfig(settings: StoredModuleSettings): LogReportModuleConfig {
  return settings.report ?? createDefaultLogReportConfig();
}

export function LogReportModuleSettingsPanel({
  settings,
  disabled,
  onChange,
  onRemove,
}: LogReportModuleSettingsPanelProps) {
  const formId = useId();
  const ownerUserId = useOwnerUserId();
  const report = getReportConfig(settings);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [headerOptions, setHeaderOptions] = useState<SelectOption[]>([]);
  const [footerOptions, setFooterOptions] = useState<SelectOption[]>([]);
  const [borelogTemplateOptions, setBorelogTemplateOptions] = useState<SelectOption[]>([]);
  const [corelogTemplateOptions, setCorelogTemplateOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      listHeaderFooterTemplates(1, MAX_TABLE_PAGE_SIZE, {
        kind: "header",
        sortBy: "name",
        sortOrder: "asc",
        ownerUserId,
      }),
      listHeaderFooterTemplates(1, MAX_TABLE_PAGE_SIZE, {
        kind: "footer",
        sortBy: "name",
        sortOrder: "asc",
        ownerUserId,
      }),
      listLogTemplates(ownerUserId),
    ])
      .then(([headers, footers, logTemplates]) => {
        if (cancelled) return;
        setHeaderOptions(toTemplateOptions(headers.data));
        setFooterOptions(toTemplateOptions(footers.data));
        setBorelogTemplateOptions(toTemplateOptions(logTemplates.borelog));
        setCorelogTemplateOptions(toTemplateOptions(logTemplates.corelog));
      })
      .catch((error) => {
        if (cancelled) return;
        showApiError(error, "Failed to load templates");
      });

    return () => {
      cancelled = true;
    };
  }, [ownerUserId]);

  const updateReport = (patch: Partial<LogReportModuleConfig>) => {
    onChange({
      report: {
        ...report,
        ...patch,
      },
    });
  };

  const updateWatermarkText = (statusId: LogReportWatermarkStatusId, text: string) => {
    updateReport({
      watermarkTexts: {
        ...report.watermarkTexts,
        [statusId]: text,
      },
    });
  };

  return (
    <>
      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header log-config-detail__panel-header--row">
          <div>
            <h3 className="log-config-detail__section-title">Edit Log Report</h3>
            <p className="log-config-detail__section-description">
               
            </p>
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
        <div className="log-config-detail__panel-header log-config-detail__panel-header--row">
          <div>
            <h3 className="log-config-detail__section-title">Log Templates</h3>
            <p className="log-config-detail__section-description">
              Select the default Log Templates for Borelogs and Corelogs that will be applied to
              logs using this Log Configuration
            </p>
          </div>
          <UiButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => setTemplatesOpen(true)}
          >
            Manage Templates
          </UiButton>
        </div>

        <div className="log-config-modules-editor__fields">
          <div className="log-config-modules-editor__fields-row log-config-modules-editor__fields-row--2">
            <FormField label="Borelog Template" htmlFor={`${formId}-borelog-template`}>
              <Select
                id={`${formId}-borelog-template`}
                value={report.borelogTemplate}
                disabled={disabled}
                options={borelogTemplateOptions}
                onChange={(value) => updateReport({ borelogTemplate: value })}
              />
            </FormField>

            <FormField label="Corelog Template" htmlFor={`${formId}-corelog-template`}>
              <Select
                id={`${formId}-corelog-template`}
                value={report.corelogTemplate}
                disabled={disabled}
                options={corelogTemplateOptions}
                onChange={(value) => updateReport({ corelogTemplate: value })}
              />
            </FormField>
          </div>

          <div className="log-config-modules-editor__toggle-row">
            <label
              className="log-config-modules-editor__toggle-label"
              htmlFor={`${formId}-adjust-charts`}
            >
              Adjust Charts Focused View
            </label>
            <Toggle
              id={`${formId}-adjust-charts`}
              checked={report.adjustChartsFocusedView}
              disabled={disabled}
              onChange={(checked) => updateReport({ adjustChartsFocusedView: checked })}
            />
          </div>
        </div>
      </section>

      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header">
          <h3 className="log-config-detail__section-title">Log Header</h3>
          <p className="log-config-detail__section-description">
            Select the default Log Header for Borelogs and Corelogs that will be applied to logs
            using this Log Configuration
          </p>
        </div>
        <FormField label="Log Header" htmlFor={`${formId}-header`}>
          <Select
            id={`${formId}-header`}
            value={report.logHeader}
            disabled={disabled}
            placeholder="Select Log Header"
            options={headerOptions}
            onChange={(value) => updateReport({ logHeader: value })}
          />
        </FormField>
      </section>

      <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header">
          <h3 className="log-config-detail__section-title">Log Footer</h3>
          <p className="log-config-detail__section-description">
            Select the default Log Footer for Borelogs and Corelogs that will be applied to logs
            using this Log Configuration
          </p>
        </div>
        <FormField label="Log Footer" htmlFor={`${formId}-footer`}>
          <Select
            id={`${formId}-footer`}
            value={report.logFooter}
            disabled={disabled}
            placeholder="Select Log Footer"
            options={footerOptions}
            onChange={(value) => updateReport({ logFooter: value })}
          />
        </FormField>
      </section>

      {/* <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header">
          <h3 className="log-config-detail__section-title">Log Watermarks</h3>
          <p className="log-config-detail__section-description">
            Apply watermarks to log PDF&apos;s for different log statuses
          </p>
        </div>

        <div className="log-config-modules-editor__fields">
          <div className="log-config-modules-editor__toggle-row">
            <label
              className="log-config-modules-editor__toggle-label"
              htmlFor={`${formId}-watermarks`}
            >
              Turn Watermarks off/on
            </label>
            <Toggle
              id={`${formId}-watermarks`}
              checked={report.watermarksEnabled}
              disabled={disabled}
              onChange={(checked) => updateReport({ watermarksEnabled: checked })}
            />
          </div>

          <p className="log-config-modules-editor__hint">
            Watermarks will only display if text is entered in the table below.
          </p>

          <FormField label="Font Size" htmlFor={`${formId}-font-size`}>
            <Input
              id={`${formId}-font-size`}
              variant="ui"
              type="number"
              min={1}
              max={200}
              value={String(report.watermarkFontSize)}
              disabled={disabled || !report.watermarksEnabled}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                updateReport({ watermarkFontSize: Math.max(1, Math.min(200, Math.round(next))) });
              }}
            />
          </FormField>

          <div className="log-report-watermarks-table-wrap">
            <table className="log-report-watermarks-table">
              <thead>
                <tr>
                  <th scope="col">Log Status</th>
                  <th scope="col">Watermark Content</th>
                </tr>
              </thead>
              <tbody>
                {LOG_REPORT_WATERMARK_STATUSES.map((status) => (
                  <tr key={status.id}>
                    <td>{status.label}</td>
                    <td>
                      <Input
                        variant="ui"
                        value={report.watermarkTexts[status.id] ?? ""}
                        disabled={disabled || !report.watermarksEnabled}
                        onChange={(event) => updateWatermarkText(status.id, event.target.value)}
                        aria-label={`Watermark for ${status.label}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section> */}

      {/* <section className="log-config-detail__panel">
        <div className="log-config-detail__panel-header log-config-detail__panel-header--row">
          <div>
            <h3 className="log-config-detail__section-title">Log Appendices Library</h3>
            <p className="log-config-detail__section-description">
              Manage your Log Appendices Library dynamically. Upload, delete, and auto-name your
              files, configure their availability, or use the &quot;Select All&quot; option to apply
              across all configurations.
            </p>
          </div>
          <UiButton type="button" variant="primary" size="sm" disabled={disabled}>
            Manage Appendices
          </UiButton>
        </div>
      </section> */}

      <ManageLogReportTemplatesModal
        open={templatesOpen}
        disabled={disabled}
        onClose={() => setTemplatesOpen(false)}
      />
    </>
  );
}
