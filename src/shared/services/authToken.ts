import { loadPersistedAuth } from "./authStorage";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;

  const persisted = loadPersistedAuth();
  if (persisted?.token) {
    accessToken = persisted.token;
    return accessToken;
  }

  return null;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
