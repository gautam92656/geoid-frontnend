export function trimFields<T extends Record<string, string>>(obj: T): T {
  const out = { ...obj } as T;
  for (const k of Object.keys(out) as (keyof T)[]) {
    const v = out[k];
    if (typeof v === "string") {
      (out as Record<string, string>)[k as string] = v.trim();
    }
  }
  return out;
}
