import type { AuthUser } from "@/modules/auth/types";

const AUTH_STORAGE_KEY = "geoid_auth";

export type PersistedAuthState = {
  token: string;
  user: AuthUser;
};

export function loadPersistedAuth(): PersistedAuthState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedAuthState;
    if (!parsed?.token || !parsed?.user?.email) return null;

    return {
      ...parsed,
      user: {
        ...parsed.user,
        role: parsed.user.role === "super_admin" ? "super_admin" : "user",
        companyName: parsed.user.companyName ?? null,
        companyLogoUrl: parsed.user.companyLogoUrl ?? null,
      },
    };
  } catch {
    return null;
  }
}

export function savePersistedAuth(auth: PersistedAuthState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  } catch {
    // Ignore quota or privacy mode errors.
  }
}

export function clearPersistedAuth(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}
