export { DEFAULT_TABLE_PAGE_SIZE, MAX_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "./pagination";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  items: "/items",
  dashboard: "/dashboard",
} as const;
