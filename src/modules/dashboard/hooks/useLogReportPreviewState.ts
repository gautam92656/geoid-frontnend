"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { showApiError } from "@/shared/utils/apiToast";
import type { ReportPreviewTypeId } from "../data/logReportOptions";
import { DEFAULT_LOG_BUILDER_VERSION } from "../data/logReportOptions";
import {
  getHeaderFooterTemplate,
  listHeaderFooterTemplates,
} from "../services/headerFooterTemplateApi";
import { getLogTemplate, listLogTemplates } from "../services/logTemplateApi";
import { ensureLogReportFieldCodeCatalog } from "../utils/logReportFieldCodes";
import type { HeaderFooterTemplate } from "../types/headerFooterTemplate";
import type { LogTemplateRecord } from "../types/logTemplate";
import {
  EMPTY_LOG_REPORT_SELECTION,
  filterHfForReportType,
  pickPreferredFooter,
  pickPreferredHeader,
  pickPreferredLogTemplate,
  selectionFromLogTemplate,
  toTemplateOptions,
  type LogReportSelection,
} from "../utils/logReportPreviewUtils";

export type UseLogReportPreviewStateOptions = {
  /** Fetch when Log Report tab is open or sidebar preview is shown. */
  enabled: boolean;
  /**
   * Log Config → Log Report module template ids (user's builder templates).
   * Preview defaults to these so the sheet matches the managed borelog/corelog template.
   */
  preferredBorelogTemplateId?: string | null;
  preferredCorelogTemplateId?: string | null;
  preferredHeaderId?: string | null;
  preferredFooterId?: string | null;
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

type PreferredIds = {
  logTemplateId?: string | null;
  headerId?: string | null;
  footerId?: string | null;
};

function applyDefaults(
  lists: ListsByType,
  previewType: ReportPreviewTypeId,
  previous: LogReportSelection,
  preferred: PreferredIds,
  forcePreferred: boolean
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

  const preferredLog = pickPreferredLogTemplate(lists.logTemplates, preferred.logTemplateId);
  const preferredHeader = pickPreferredHeader(
    lists.headers,
    previewType,
    preferred.headerId
  );
  const preferredFooter = pickPreferredFooter(
    lists.footers,
    previewType,
    preferred.footerId
  );

  const usePreferredLog = forcePreferred || !logStillValid || !previous.templateId;
  const usePreferredHeader = forcePreferred || !headerStillValid || !previous.headerId;
  const usePreferredFooter = forcePreferred || !footerStillValid || !previous.footerId;

  const templateId = usePreferredLog
    ? String(preferredLog?.id ?? "")
    : previous.templateId;
  const headerId = usePreferredHeader
    ? String(preferredHeader?.id ?? "")
    : previous.headerId;
  const footerId = usePreferredFooter
    ? String(preferredFooter?.id ?? "")
    : previous.footerId;

  const template =
    lists.logTemplates.find((item) => String(item.id) === templateId) ?? preferredLog;

  const pageDefaults = selectionFromLogTemplate(template, previous);
  const adoptPageFromTemplate = usePreferredLog || !logStillValid;

  return {
    templateId,
    headerId,
    footerId,
    orientation: adoptPageFromTemplate ? pageDefaults.orientation : previous.orientation,
    pageSize: adoptPageFromTemplate ? pageDefaults.pageSize : previous.pageSize,
    metresPerPage: adoptPageFromTemplate
      ? pageDefaults.metresPerPage
      : previous.metresPerPage,
    builderVersion: previous.builderVersion || DEFAULT_LOG_BUILDER_VERSION,
  };
}

export function useLogReportPreviewState({
  enabled,
  preferredBorelogTemplateId = null,
  preferredCorelogTemplateId = null,
  preferredHeaderId = null,
  preferredFooterId = null,
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

  const preferredLogTemplateId =
    previewType === "corelog" ? preferredCorelogTemplateId : preferredBorelogTemplateId;

  const preferenceKey = [
    previewType,
    preferredLogTemplateId ?? "",
    preferredHeaderId ?? "",
    preferredFooterId ?? "",
  ].join("|");
  const preferenceKeyRef = useRef(preferenceKey);

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
        ensureLogReportFieldCodeCatalog(),
      ]);

      if (requestId !== requestIdRef.current) return;

      const type = previewTypeRef.current;
      const nextLogs = type === "corelog" ? logList.corelog : logList.borelog;
      const nextHeaders = filterHfForReportType(headerList.data, type);
      const nextFooters = filterHfForReportType(footerList.data, type);

      setLogTemplates(nextLogs);
      setHeaders(nextHeaders);
      setFooters(nextFooters);

      const forcePreferred = preferenceKeyRef.current !== preferenceKey;
      preferenceKeyRef.current = preferenceKey;

      setSelection((previous) =>
        applyDefaults(
          { logTemplates: nextLogs, headers: nextHeaders, footers: nextFooters },
          type,
          previous,
          {
            logTemplateId: type === "corelog" ? preferredCorelogTemplateId : preferredBorelogTemplateId,
            headerId: preferredHeaderId,
            footerId: preferredFooterId,
          },
          forcePreferred
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
  }, [
    enabled,
    preferenceKey,
    preferredBorelogTemplateId,
    preferredCorelogTemplateId,
    preferredFooterId,
    preferredHeaderId,
  ]);

  useEffect(() => {
    void loadLists();
  }, [loadLists, previewType]);

  // Re-fetch when returning to the tab so builder saves show up in preview.
  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void loadLists();
      }, 250);
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [enabled, loadLists]);

  // Always load the selected log / header / footer by id so builder saves show in preview.
  // Wait until the list request finishes so we merge into the latest list payload.
  useEffect(() => {
    if (!enabled || loadingLists) return;

    const templateId = selection.templateId.trim();
    const headerId = Number(selection.headerId);
    const footerId = Number(selection.footerId);
    let cancelled = false;

    void (async () => {
      try {
        const [freshLog, freshHeader, freshFooter] = await Promise.all([
          templateId
            ? getLogTemplate(templateId).catch(() => null)
            : Promise.resolve(null),
          Number.isFinite(headerId) && headerId > 0
            ? getHeaderFooterTemplate(headerId).catch(() => null)
            : Promise.resolve(null),
          Number.isFinite(footerId) && footerId > 0
            ? getHeaderFooterTemplate(footerId).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;

        if (freshLog) {
          // Always prefer the by-id payload so builder column edits are never kept stale
          // behind a list snapshot with the same updatedAt.
          setLogTemplates((previous) => {
            const index = previous.findIndex((item) => String(item.id) === String(freshLog.id));
            if (index < 0) return [...previous, freshLog];
            const next = previous.slice();
            next[index] = freshLog;
            return next;
          });
        }

        if (freshHeader) {
          setHeaders((previous) => {
            const index = previous.findIndex((item) => String(item.id) === String(freshHeader.id));
            if (index < 0) return [...previous, freshHeader];
            if (previous[index]?.updatedAt === freshHeader.updatedAt) return previous;
            const next = previous.slice();
            next[index] = freshHeader;
            return next;
          });
        }

        if (freshFooter) {
          setFooters((previous) => {
            const index = previous.findIndex((item) => String(item.id) === String(freshFooter.id));
            if (index < 0) return [...previous, freshFooter];
            if (previous[index]?.updatedAt === freshFooter.updatedAt) return previous;
            const next = previous.slice();
            next[index] = freshFooter;
            return next;
          });
        }
      } catch {
        // List data remains as fallback.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, loadingLists, selection.footerId, selection.headerId, selection.templateId]);

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
