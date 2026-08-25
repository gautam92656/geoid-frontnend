export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmptyTrimmed(value: string): boolean {
  return value.trim().length === 0;
}

export function requiredFieldMessage(label: string): string {
  return `${label} is required.`;
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function maxLengthMessage(label: string, max: number): string {
  return `${label} must be ${max} characters or fewer.`;
}
