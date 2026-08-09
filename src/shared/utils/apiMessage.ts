import type { ApiEnvelope } from "@/shared/types/api";

const TECHNICAL_MESSAGE_PATTERNS = [
  /\bprisma\b/i,
  /\binvocation in\b/i,
  /\bat async\b/i,
  /Invalid `[^`]+`/,
  /Unique constraint failed/i,
  /Foreign key constraint/i,
  /ECONNREFUSED/,
  /Network Error/i,
  /AxiosError/,
  /\n/,
  /\r/,
];

const MAX_USER_MESSAGE_LENGTH = 240;

export function isTechnicalApiMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (trimmed.length > MAX_USER_MESSAGE_LENGTH) return true;
  return TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function sanitizeApiMessage(
  message: string | undefined | null,
  fallback: string
): string {
  const trimmed = message?.trim();
  if (!trimmed || isTechnicalApiMessage(trimmed)) {
    return fallback;
  }
  return trimmed;
}

export function extractApiMessage<T>(envelope: ApiEnvelope<T>): string | undefined {
  const topLevel = envelope.message?.trim();
  if (topLevel) return topLevel;

  const data = envelope.data;
  if (!data || typeof data !== "object") return undefined;

  if ("message" in data) {
    const nested = (data as { message?: unknown }).message;
    if (typeof nested === "string" && nested.trim()) {
      return nested.trim();
    }
  }

  return undefined;
}

export function resolveApiMessage<T>(
  envelope: ApiEnvelope<T>,
  fallback: string
): string {
  return sanitizeApiMessage(extractApiMessage(envelope), fallback);
}
