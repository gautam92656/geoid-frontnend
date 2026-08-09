export function isEmptyTrimmed(value: string): boolean {
  return value.trim().length === 0;
}

export function requiredFieldMessage(label: string): string {
  return `${label} is required.`;
}
