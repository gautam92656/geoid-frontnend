"use client";

import { createContext, useContext } from "react";

/**
 * When set, user-scoped dashboard APIs (log configurations, log report templates,
 * header/footer templates) target this user via `/admin/users/:userId/...` routes.
 */
const OwnerUserIdContext = createContext<number | undefined>(undefined);

export const OwnerUserIdProvider = OwnerUserIdContext.Provider;

/** @deprecated Prefer OwnerUserIdProvider — kept for existing log-config admin UI. */
export const LogConfigurationOwnerProvider = OwnerUserIdProvider;

export function useOwnerUserId(): number | undefined {
  return useContext(OwnerUserIdContext);
}

/** @deprecated Prefer useOwnerUserId */
export function useLogConfigurationOwnerUserId(): number | undefined {
  return useOwnerUserId();
}
