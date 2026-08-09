import type { LogConfiguration } from "../types/logConfiguration";
import { DEFAULT_LOG_CONFIGURATION_SETTINGS } from "../types/logConfiguration";

export const INITIAL_LOG_CONFIGURATIONS: LogConfiguration[] = [
  {
    id: "as1726-2017-rev2",
    name: "AS1726-2017 - Australian Standard for Geotechnical Investigations - Revision 2",
    status: "active",
    templateSlug: "as1726-rev2",
    ...DEFAULT_LOG_CONFIGURATION_SETTINGS,
  },
];
