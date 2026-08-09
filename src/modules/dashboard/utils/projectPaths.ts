export function projectDetailPath(projectId: string | number): string {
  return `/dashboard/projects/${encodeURIComponent(String(projectId).trim())}`;
}

export function projectLogPath(projectId: string | number, logId: string | number): string {
  return `${projectDetailPath(projectId)}/logs/${encodeURIComponent(String(logId).trim())}`;
}
