import type { AppStore } from "./index";

let store: AppStore | null = null;

export function setAppStore(nextStore: AppStore): void {
  store = nextStore;
}

export function getAppStore(): AppStore | null {
  return store;
}
