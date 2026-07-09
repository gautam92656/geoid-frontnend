import axios, { type AxiosError, type AxiosResponse } from "axios";

const apiClient = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1`,
    headers: { "Content-Type": "application/json" },
    timeout: 15_000,
});

// ── Request interceptor ────────────────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// ── Response interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError<{ error?: string; message?: string }>) => {
        const status = error.response?.status ?? 0;
        const message =
            error.response?.data?.error ??
            error.response?.data?.message ??
            error.message ??
            "An unexpected error occurred.";

        if (status === 401 && typeof window !== "undefined") {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("authUser");
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
