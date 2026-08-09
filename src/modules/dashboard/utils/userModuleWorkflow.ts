import type { ConfigModuleSettings, WorkflowSettings } from "./configModules/types";
import { normalizeWorkflowSettings, parseWorkflowSettings } from "./configModules/workflow";
import { SUBSURFACES_MODULE_ID } from "./configModules/modules/subsurfaces";
import {
  getUserModuleWorkflow,
  saveUserModuleWorkflow,
} from "../services/configModulesApi";

/** Module slugs whose workflow + classification codes live in `log_configuration_user_workflows`. */
export const USER_WORKFLOW_MODULE_SLUGS = [SUBSURFACES_MODULE_ID] as const;

export type UserWorkflowModuleSlug = (typeof USER_WORKFLOW_MODULE_SLUGS)[number];

export function moduleUsesUserWorkflow(moduleSlug: string): moduleSlug is UserWorkflowModuleSlug {
  return (USER_WORKFLOW_MODULE_SLUGS as readonly string[]).includes(moduleSlug);
}

export function mergeUserWorkflowIntoModuleSettings(
  moduleSettings: ConfigModuleSettings,
  moduleSlug: string,
  workflow: WorkflowSettings
): ConfigModuleSettings {
  if (!moduleUsesUserWorkflow(moduleSlug)) return moduleSettings;

  const normalized = normalizeWorkflowSettings(parseWorkflowSettings(workflow));
  return {
    ...moduleSettings,
    workflow: normalized,
  };
}

export async function loadUserWorkflowsForEnabledModules(
  enabledModuleIds: readonly string[],
  logConfigurationId: string | number
): Promise<Partial<Record<UserWorkflowModuleSlug, WorkflowSettings>>> {
  const workflows: Partial<Record<UserWorkflowModuleSlug, WorkflowSettings>> = {};

  await Promise.all(
    USER_WORKFLOW_MODULE_SLUGS.map(async (moduleSlug) => {
      if (!enabledModuleIds.includes(moduleSlug)) return;
      const { data } = await getUserModuleWorkflow(moduleSlug, logConfigurationId);
      workflows[moduleSlug] = normalizeWorkflowSettings(parseWorkflowSettings(data));
    })
  );

  return workflows;
}

export function applyUserWorkflowsToModuleSettings(
  moduleSettings: ConfigModuleSettings,
  workflows: Partial<Record<UserWorkflowModuleSlug, WorkflowSettings>>
): ConfigModuleSettings {
  let next = moduleSettings;
  for (const moduleSlug of USER_WORKFLOW_MODULE_SLUGS) {
    const workflow = workflows[moduleSlug];
    if (!workflow) continue;
    next = mergeUserWorkflowIntoModuleSettings(next, moduleSlug, workflow);
  }
  return next;
}

export async function persistUserWorkflowsForEnabledModules(
  enabledModuleIds: readonly string[],
  moduleSettings: ConfigModuleSettings,
  logConfigurationId: string | number
): Promise<void> {
  await Promise.all(
    USER_WORKFLOW_MODULE_SLUGS.map(async (moduleSlug) => {
      if (!enabledModuleIds.includes(moduleSlug)) return;
      await saveUserModuleWorkflow(moduleSlug, moduleSettings.workflow, logConfigurationId);
    })
  );
}
