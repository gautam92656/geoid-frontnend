"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/shared/components/ui";
import { showApiError, showApiSuccess } from "@/shared/utils/apiToast";
import {
  createLogTemplate,
  getBuilderSelectionGroups,
  getDefaultCopyColumns,
  loadBuilderBootstrap,
  updateLogTemplate,
  type LogTemplateBuilderConfiguration,
} from "../../services/logTemplateApi";
import { getRemarkTypeTemplates } from "../../services/configModulesApi";
import type {
  LogTemplateColumn,
  LogTemplateConfig,
  LogTemplateLogType,
  LogTemplateRecord,
  LogTemplateSelectionGroup,
} from "../../types/logTemplate";
import {
  DEFAULT_REMARK_TYPE_OPTIONS,
  LOG_REMARKS_MODULE_ID,
  parseRemarkTypeOptions,
} from "../../utils/configModules";
import {
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type HistoryState,
} from "../headerFooterBuilder/builderHistory";
import {
  addColumn,
  deleteColumn,
  getUsedWidthPercent,
  reorderColumns,
  setColumnVisibility,
  updateColumn,
  updateTemplateMeta,
} from "./builderState";
import { cloneConfig, normalizeLogTemplateConfig } from "./contentSchema";
import { LtBuilderHeader, type LtBuilderTab } from "./LtBuilderHeader";
import { LtColumnConfigPanel, type CopyPresetOption } from "./LtColumnConfigPanel";
import { LtColumnList } from "./LtColumnList";
import { LtJsonEditor } from "./LtJsonEditor";
import { LtReportSettings } from "./LtReportSettings";
import { dedupeSelectionGroups, type BoundSelectDataKind } from "./selectDataBinding";

const TEMPLATES_RETURN_PATH = "/dashboard/settings/log-configurations";
const BUILDER_BASE_PATH = "/dashboard/settings/log-report-templates";
const LIST_MIN_WIDTH = 240;
const LIST_MAX_WIDTH = 560;

type LogTemplateBuilderPageProps = Readonly<{
  templateId: string;
}>;

export function LogTemplateBuilderPage(props: LogTemplateBuilderPageProps) {
  return (
    <Suspense fallback={<PageLoader label="Loading template builder…" />}>
      <LogTemplateBuilder {...props} />
    </Suspense>
  );
}

function LogTemplateBuilder({ templateId }: LogTemplateBuilderPageProps) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const resizingRef = useRef(false);

  const [template, setTemplate] = useState<LogTemplateRecord | null>(null);
  const [name, setName] = useState("");
  const [logType, setLogType] = useState<LogTemplateLogType>("borelog");
  const [history, setHistory] = useState<HistoryState<LogTemplateConfig> | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectionGroups, setSelectionGroups] = useState<LogTemplateSelectionGroup[]>([]);
  const [builderConfiguration, setBuilderConfiguration] =
    useState<LogTemplateBuilderConfiguration | null>(null);
  const [selectDataOverrides, setSelectDataOverrides] = useState<
    Partial<Record<BoundSelectDataKind, Array<{ value: string; label: string }>>>
  >({});
  const [activeTab, setActiveTab] = useState<LtBuilderTab>("columns");
  const [jsonOpen, setJsonOpen] = useState(false);
  const [listWidth, setListWidth] = useState(320);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Tablogs open-builder: list + builder-configuration + edit/:id (parallel).
        const bootstrap = await loadBuilderBootstrap(templateId);
        if (cancelled) return;
        const { template: data, builderConfiguration: catalog } = bootstrap;
        const config = normalizeLogTemplateConfig(data.config);
        setTemplate(data);
        setName(data.name);
        setLogType(data.logType);
        setBuilderConfiguration(catalog);
        setHistory(createHistory(config));
        setSelectedCode(config.columnData.find((column) => !column.hidden)?.code ?? null);
        setSelectionGroups(dedupeSelectionGroups(getBuilderSelectionGroups()));
        setSelectDataOverrides({
          remarks: DEFAULT_REMARK_TYPE_OPTIONS.map((entry) => ({
            value: entry.name,
            label: entry.name,
          })),
        });
        setDirty(false);

        // Remark types from Remarks module (company catalog / user-added defaults).
        void getRemarkTypeTemplates(LOG_REMARKS_MODULE_ID)
          .then(({ data: remarkData }) => {
            if (cancelled) return;
            const parsed = parseRemarkTypeOptions(remarkData, DEFAULT_REMARK_TYPE_OPTIONS);
            const options = parsed.map((entry) => ({
              value: entry.name,
              label: entry.name,
            }));
            if (options.length === 0) return;
            setSelectDataOverrides((current) => ({ ...current, remarks: options }));
            setSelectionGroups((groups) =>
              groups.map((group) =>
                group.code === "all_remarks"
                  ? {
                      ...group,
                      data: parsed.map((entry) => ({
                        name: entry.name,
                        code: entry.name,
                        group_code: "all_remarks",
                      })),
                    }
                  : group
              )
            );
          })
          .catch(() => {
            /* Keep DEFAULT_REMARK_TYPE_OPTIONS already set. */
          });
      } catch (error) {
        showApiError(error, "Failed to load template");
        router.push(TEMPLATES_RETURN_PATH);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router, templateId]);

  const config = history?.present ?? null;

  const commit = useCallback((next: LogTemplateConfig) => {
    setHistory((current) => (current ? pushHistory(current, next) : createHistory(next)));
    setDirty(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      setHistory((current) => {
        if (!current) return current;
        return event.shiftKey ? redoHistory(current) : undoHistory(current);
      });
      setDirty(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const selectedColumn = useMemo(() => {
    if (!config || !selectedCode) return null;
    return config.columnData.find((column) => column.code === selectedCode) ?? null;
  }, [config, selectedCode]);

  const remainingWidth = useMemo(
    () => (config ? Math.round((100 - getUsedWidthPercent(config)) * 10) / 10 : 0),
    [config]
  );

  const copyPresets = useMemo<CopyPresetOption[]>(() => {
    const raw = getDefaultCopyColumns(logType, builderConfiguration) as Array<
      Record<string, unknown>
    >;
    return raw
      .map((entry) => ({
        code: String(entry.code ?? ""),
        text: String(entry.text ?? entry.code ?? ""),
        column_type: (entry.column_type as CopyPresetOption["column_type"]) ?? "text",
        column_data_source: entry.column_data_source as CopyPresetOption["column_data_source"],
        show_arrows: entry.show_arrows === true,
        vertical_text: typeof entry.vertical_text === "boolean" ? entry.vertical_text : undefined,
        name_vertical: typeof entry.name_vertical === "boolean" ? entry.name_vertical : undefined,
        width: entry.width as number | string | undefined,
        text_graphic_layout_type:
          typeof entry.text_graphic_layout_type === "string"
            ? entry.text_graphic_layout_type
            : undefined,
      }))
      .filter((entry) => entry.code);
  }, [logType, builderConfiguration]);

  const handleSave = async () => {
    if (!template || !config) return;
    setSaving(true);
    try {
      const { data, message } = await updateLogTemplate(template.id, {
        name: name.trim() || template.name,
        logType,
        config: cloneConfig(config),
      });
      setTemplate(data);
      setName(data.name);
      setLogType(data.logType);
      setHistory(createHistory(normalizeLogTemplateConfig(data.config)));
      setDirty(false);
      showApiSuccess(message, "Log template updated");
    } catch (error) {
      showApiError(error, "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsNew = async (payload: {
    config: LogTemplateConfig;
    name: string;
    logType: LogTemplateLogType;
  }) => {
    setSaving(true);
    try {
      const { data, message } = await createLogTemplate({
        name: payload.name,
        logType: payload.logType,
        config: cloneConfig(payload.config),
      });
      showApiSuccess(message, "Log template created");
      setDirty(false);
      router.replace(`${BUILDER_BASE_PATH}/${data.id}/builder`);
    } catch (error) {
      showApiError(error, "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) return;
    router.back();
  };

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    resizingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizingRef.current || !contentRef.current) return;
    const bounds = contentRef.current.getBoundingClientRect();
    const next = event.clientX - bounds.left;
    setListWidth(Math.min(Math.max(next, LIST_MIN_WIDTH), LIST_MAX_WIDTH));
  };

  const stopResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    resizingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (loading || !config || !history) {
    return <PageLoader label="Loading template builder…" />;
  }

  return (
    <div className="lt-fmt">
      <LtBuilderHeader
        templateName={name}
        logType={logType}
        dirty={dirty}
        jsonOpen={jsonOpen}
        activeTab={activeTab}
        onToggleJson={() => setJsonOpen((current) => !current)}
        onTabChange={setActiveTab}
        onClose={handleClose}
      />

      {jsonOpen ? (
        <LtJsonEditor
          config={config}
          templateName={name}
          logType={logType}
          saving={saving}
          onApply={({ config: nextConfig, name: nextName, logType: nextLogType }) => {
            commit(nextConfig);
            if (typeof nextName === "string") setName(nextName);
            if (nextLogType) setLogType(nextLogType);
            const nextSelected =
              nextConfig.columnData.find((column) => column.code === selectedCode)?.code ??
              nextConfig.columnData.find((column) => !column.hidden)?.code ??
              null;
            setSelectedCode(nextSelected);
            showApiSuccess("JSON applied to builder", "Template JSON");
          }}
          onSave={() => {
            void handleSave();
          }}
          onSaveAsNew={(payload) => {
            void handleSaveAsNew(payload);
          }}
        />
      ) : (
        <div className="lt-fmt__content" ref={contentRef}>
          <LtColumnList
            width={listWidth}
            templateName={name}
            columns={config.columnData}
            selectedCode={selectedCode}
            saving={saving}
            onTemplateNameChange={(value) => {
              setName(value);
              setDirty(true);
            }}
            onSelect={setSelectedCode}
            onToggleVisibility={(code, visible) =>
              commit(setColumnVisibility(config, code, visible))
            }
            onReorder={(source, target) => commit(reorderColumns(config, source, target))}
            onAddColumn={(columnName) => {
              const next = addColumn(config, { text: columnName });
              commit(next);
              setSelectedCode(next.columnData[next.columnData.length - 1].code);
              setActiveTab("columns");
            }}
            onSave={() => {
              void handleSave();
            }}
          />

          <button
            type="button"
            className="lt-fmt__resizer"
            aria-label="Resize column list"
            onPointerDown={startResize}
            onPointerMove={handleResize}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
          />

          {activeTab === "columns" ? (
            <LtColumnConfigPanel
              column={selectedColumn}
              remainingWidth={remainingWidth}
              selectionGroups={selectionGroups}
              copyPresets={copyPresets}
              selectDataOverrides={selectDataOverrides}
              onColumnChange={(patch: Partial<LogTemplateColumn>) => {
                if (!selectedCode) return;
                commit(updateColumn(config, selectedCode, patch));
              }}
              onDelete={() => {
                if (!selectedCode) return;
                const next = deleteColumn(config, selectedCode);
                commit(next);
                setSelectedCode(next.columnData.find((column) => !column.hidden)?.code ?? null);
              }}
            />
          ) : (
            <LtReportSettings
              config={config}
              columns={config.columnData}
              onChange={(patch) => commit(updateTemplateMeta(config, patch))}
            />
          )}
        </div>
      )}
    </div>
  );
}
