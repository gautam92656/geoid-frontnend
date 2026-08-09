import axios, { type AxiosError, type AxiosResponse } from "axios";
import { getAppStore } from "@/store/storeRef";
import { logout } from "@/store/slices/authSlice";
import { sanitizeApiMessage } from "@/shared/utils/apiMessage";
import { API_MESSAGES } from "@/shared/constants/apiMessages";
import { getAccessToken } from "./authToken";

const apiBaseUrl =
    typeof window !== "undefined"
        ? "/api/v1"
        : `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002").trim()}/api/v1`;

const apiClient = axios.create({
    baseURL: apiBaseUrl,
    headers: { "Content-Type": "application/json" },
    timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const PUBLIC_AUTH_PATHS = [
    "/auth/login",
    "/auth/signup",
    "/auth/verify-otp",
    "/auth/resend-otp",
    "/auth/forgot-password",
    "/auth/reset-password",
];

function isPublicAuthRequest(url?: string): boolean {
    if (!url) return false;
    return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError<{ error?: string; message?: string }>) => {
        const status = error.response?.status ?? 0;
        const requestUrl = error.config?.url;
        const rawMessage =
            status === 0
                ? "Cannot reach the API server. Make sure the backend is running on port 3002."
                : error.response?.data?.error ??
                  error.response?.data?.message ??
                  error.message;
        const fallback =
            status === 0
                ? rawMessage
                : status >= 500
                  ? API_MESSAGES.GENERIC_ERROR
                  : "An unexpected error occurred.";
        const message = sanitizeApiMessage(rawMessage, fallback);

        if (
            status === 401 &&
            typeof window !== "undefined" &&
            !isPublicAuthRequest(requestUrl)
        ) {
            getAppStore()?.dispatch(logout());
            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }

        return Promise.reject(new ApiError(message, status, error));
    }
);

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly cause?: AxiosError
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export default apiClient;
