import { useMemo } from "react";
import {
  DEFAULT_FINISHING_REASON_OPTIONS,
  SUBSURFACES_MODULE_ID,
  parseFinishingReasonOptions,
  type FinishingReasonOption,
} from "../utils/configModules";
import { useUserDataTypeOptions } from "./useUserDataTypeOptions";

type UseUserFinishingReasonsOptions = {
  enabled?: boolean;
  logConfigurationId: string | number;
};

/**
 * Loads the user/log-configuration finishing-reason catalog for selects
 * (Add/Edit Log, Finish Log modal).
 */
export function useUserFinishingReasons(options: UseUserFinishingReasonsOptions) {
  const { enabled = true, logConfigurationId } = options;
  const api = useUserDataTypeOptions(SUBSURFACES_MODULE_ID, "finish-reasons", {
    enabled,
    logConfigurationId,
  });

  const finishingReasons: FinishingReasonOption[] = useMemo(() => {
    if (api.items.length > 0) {
      return parseFinishingReasonOptions(api.items, DEFAULT_FINISHING_REASON_OPTIONS);
    }
    return DEFAULT_FINISHING_REASON_OPTIONS.map((entry) => ({ ...entry }));
  }, [api.items]);

  const selectOptions = useMemo(
    () =>
      finishingReasons
        .filter((entry) => entry.active !== false && entry.name.trim())
        .map((entry) => ({
          value: entry.name,
          label: entry.abbreviation?.trim()
            ? `${entry.name} (${entry.abbreviation.trim()})`
            : entry.name,
        })),
    [finishingReasons]
  );

  return {
    finishingReasons,
    selectOptions,
    loading: api.loading,
    reload: api.reload,
  };
}
