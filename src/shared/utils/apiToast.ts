import toast from "react-hot-toast";
import { ApiError } from "@/shared/services/apiClient";
import { sanitizeApiMessage } from "@/shared/utils/apiMessage";

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) {
    return fallback;
  }

  return sanitizeApiMessage(err.message, fallback);
}

export function getApiSuccessMessage(
  message: string | undefined,
  fallback: string
): string {
  return sanitizeApiMessage(message, fallback);
}

export function showApiSuccess(message: string | undefined, fallback: string): void {
  toast.success(getApiSuccessMessage(message, fallback));
}

export function showApiError(err: unknown, fallback: string): void {
  toast.error(getApiErrorMessage(err, fallback));
}
