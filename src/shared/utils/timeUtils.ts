const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

export function parseTimeValue(value: string): { hours: number; minutes: number } | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
}

export function toTimeValue(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatTimeDisplay(value: string): string {
  const parsed = parseTimeValue(value);
  if (!parsed) return "";

  const date = new Date();
  date.setHours(parsed.hours, parsed.minutes, 0, 0);

  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function buildHourOptions(): number[] {
  return Array.from({ length: 24 }, (_, index) => index);
}

export function buildMinuteOptions(step = 15): number[] {
  const options: number[] = [];

  for (let minute = 0; minute < 60; minute += step) {
    options.push(minute);
  }

  return options;
}

export function snapMinute(minute: number, step = 15): number {
  const snapped = Math.round(minute / step) * step;
  return snapped === 60 ? 0 : snapped;
}

export function getCurrentTimeValue(): string {
  const now = new Date();
  return toTimeValue(now.getHours(), now.getMinutes());
}
