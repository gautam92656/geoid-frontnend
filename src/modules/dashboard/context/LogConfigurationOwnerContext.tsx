"use client";

import { createContext, useContext } from "react";

/** When set, log-configuration API calls target this user's configs via admin routes. */
const LogConfigurationOwnerContext = createContext<number | undefined>(undefined);

export const LogConfigurationOwnerProvider = LogConfigurationOwnerContext.Provider;

export function useLogConfigurationOwnerUserId(): number | undefined {
  return useContext(LogConfigurationOwnerContext);
}
