"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import type { ReportPreviewTypeId } from "../data/logReportOptions";
import { DEFAULT_LOG_BUILDER_VERSION } from "../data/logReportOptions";
import { listHeaderFooterTemplates } from "../services/headerFooterTemplateApi";
import { listLogTemplates } from "../services/logTemplateApi";
import type { HeaderFooterTemplate } from "../types/headerFooterTemplate";
import type { LogTemplateRecord } from "../types/logTemplate";
import {
  EMPTY_LOG_REPORT_SELECTION,
  filterHfForReportType,
  pickDefaultFooter,
  pickDefaultHeader,
  pickDefaultLogTemplate,
  selectionFromLogTemplate,
  toTemplateOptions,
  type LogReportSelection,
} from "../utils/logReportPreviewUtils";

export type UseLogReportPreviewStateOptions = {
  /** Fetch when Log Report tab is open or sidebar preview is shown. */
  enabled: boolean;
};

export type LogReportPreviewState = {
  previewType: ReportPreviewTypeId;
  setPreviewType: (type: ReportPreviewTypeId) => void;
  selection: LogReportSelection;
  updateSelection: <K extends keyof LogReportSelection>(
    key: K,
    value: LogReportSelection[K]
  ) => void;
  templateOptions: ReturnType<typeof toTemplateOptions>;
  headerOptions: ReturnType<typeof toTemplateOptions>;
  footerOptions: ReturnType<typeof toTemplateOptions>;
  selectedLogTemplate: LogTemplateRecord | null;
  selectedHeaderTemplate: HeaderFooterTemplate | null;
  selectedFooterTemplate: HeaderFooterTemplate | null;
  loadingLists: boolean;
  loadingDetails: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

type ListsByType = {
  logTemplates: LogTemplateRecord[];
  headers: HeaderFooterTemplate[];
  footers: HeaderFooterTemplate[];
};

function applyDefaults(
  lists: ListsByType,
  previewType: ReportPreviewTypeId,
  previous: LogReportSelection
): LogReportSelection {
  const logStillValid =
    Boolean(previous.templateId) &&
    lists.logTemplates.some((template) => String(template.id) === previous.templateId);
  const headerStillValid =
    Boolean(previous.headerId) &&
    lists.headers.some((template) => String(template.id) === previous.headerId);
  const footerStillValid =
    Boolean(previous.footerId) &&
    lists.footers.some((template) => String(template.id) === previous.footerId);

  const defaultLog = pickDefaultLogTemplate(lists.logTemplates);
  const defaultHeader = pickDefaultHeader(lists.headers, previewType);
  const defaultFooter = pickDefaultFooter(lists.footers, previewType);

  const templateId = logStillValid ? previous.templateId : String(defaultLog?.id ?? "");
  const headerId = headerStillValid ? previous.headerId : String(defaultHeader?.id ?? "");
  const footerId = footerStillValid ? previous.footerId : String(defaultFooter?.id ?? "");

  const template =
    lists.logTemplates.find((item) => String(item.id) === templateId) ?? defaultLog;

  const pageDefaults = selectionFromLogTemplate(template, previous);

  return {
    templateId,
    headerId,
    footerId,
    orientation: logStillValid ? previous.orientation : pageDefaults.orientation,
    pageSize: logStillValid ? previous.pageSize : pageDefaults.pageSize,
    metresPerPage: logStillValid ? previous.metresPerPage : pageDefaults.metresPerPage,
    builderVersion: previous.builderVersion || DEFAULT_LOG_BUILDER_VERSION,
  };
}

export function useLogReportPreviewState({
  enabled,
}: UseLogReportPreviewStateOptions): LogReportPreviewState {
  const [previewType, setPreviewTypeState] = useState<ReportPreviewTypeId>("borelog");
  const [selection, setSelection] = useState<LogReportSelection>(EMPTY_LOG_REPORT_SELECTION);
  const [logTemplates, setLogTemplates] = useState<LogTemplateRecord[]>([]);
  const [headers, setHeaders] = useState<HeaderFooterTemplate[]>([]);
  const [footers, setFooters] = useState<HeaderFooterTemplate[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewTypeRef = useRef(previewType);
  previewTypeRef.current = previewType;
  const requestIdRef = useRef(0);

  const loadLists = useCallback(async () => {
    if (!enabled) return;

    const requestId = ++requestIdRef.current;
    setLoadingLists(true);
    setError(null);

    try {
      const [logList, headerList, footerList] = await Promise.all([
        listLogTemplates(),
        listHeaderFooterTemplates(1, MAX_TABLE_PAGE_SIZE, {
          kind: "header",
          sortBy: "name",
          sortOrder: "asc",
        }),
        listHeaderFooterTemplates(1, MAX_TABLE_PAGE_SIZE, {
          kind: "footer",
          sortBy: "name",
          sortOrder: "asc",
        }),
      ]);

      if (requestId !== requestIdRef.current) return;

      const type = previewTypeRef.current;
      const nextLogs = type === "corelog" ? logList.corelog : logList.borelog;
      const nextHeaders = filterHfForReportType(headerList.data, type);
      const nextFooters = filterHfForReportType(footerList.data, type);

      setLogTemplates(nextLogs);
      setHeaders(nextHeaders);
      setFooters(nextFooters);

      setSelection((previous) =>
        applyDefaults(
          { logTemplates: nextLogs, headers: nextHeaders, footers: nextFooters },
          type,
          previous
        )
      );
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(API_ERROR_MESSAGES.LOAD_HEADER_FOOTER_TEMPLATES);
      showApiError(err, API_ERROR_MESSAGES.LOAD_HEADER_FOOTER_TEMPLATES);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingLists(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    void loadLists();
  }, [loadLists, previewType]);

  const setPreviewType = useCallback((type: ReportPreviewTypeId) => {
    setPreviewTypeState(type);
    setSelection((previous) => ({
      ...previous,
      templateId: "",
      headerId: "",
      footerId: "",
    }));
  }, []);

  const updateSelection = useCallback(
    <K extends keyof LogReportSelection>(key: K, value: LogReportSelection[K]) => {
      setSelection((previous) => {
        const next = { ...previous, [key]: value };
        if (key === "templateId") {
          const template = logTemplates.find((item) => String(item.id) === String(value));
          if (template) {
            const pageDefaults = selectionFromLogTemplate(template, previous);
            next.orientation = pageDefaults.orientation;
            next.pageSize = pageDefaults.pageSize;
            next.metresPerPage = pageDefaults.metresPerPage;
          }
        }
        return next;
      });
    },
    [logTemplates]
  );

  const selectedLogTemplate = useMemo(
    () =>
      logTemplates.find((template) => String(template.id) === selection.templateId) ?? null,
    [logTemplates, selection.templateId]
  );

  const selectedHeaderTemplate = useMemo(
    () => headers.find((template) => String(template.id) === selection.headerId) ?? null,
    [headers, selection.headerId]
  );

  const selectedFooterTemplate = useMemo(
    () => footers.find((template) => String(template.id) === selection.footerId) ?? null,
    [footers, selection.footerId]
  );

  const templateOptions = useMemo(() => toTemplateOptions(logTemplates), [logTemplates]);
  const headerOptions = useMemo(() => toTemplateOptions(headers), [headers]);
  const footerOptions = useMemo(() => toTemplateOptions(footers), [footers]);

  return {
    previewType,
    setPreviewType,
    selection,
    updateSelection,
    templateOptions,
    headerOptions,
    footerOptions,
    selectedLogTemplate,
    selectedHeaderTemplate,
    selectedFooterTemplate,
    loadingLists,
    loadingDetails: false,
    error,
    reload: loadLists,
  };
}
