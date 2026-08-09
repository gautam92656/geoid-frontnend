import type { Project } from "../types/project";
import { projectDetailPath } from "./projectPaths";

export type ProjectScheduleEvent = {
  id: string;
  title: string;
  projectNo: string;
  href: string;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  if (!ISO_DATE_PATTERN.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { year, month: month - 1, day };
}

export function getProjectScheduleDates(project: Project): string[] {
  const start = project.startDate.trim();
  const end = project.endDate.trim();

  if (start) return [start];
  if (end) return [end];

  return [];
}

export function buildProjectScheduleEvents(
  projects: readonly Project[],
  year: number,
  month: number
): Record<string, ProjectScheduleEvent[]> {
  const events: Record<string, ProjectScheduleEvent[]> = {};

  for (const project of projects) {
    for (const dateKey of getProjectScheduleDates(project)) {
      const parts = parseIsoDate(dateKey);
      if (!parts || parts.year !== year || parts.month !== month) continue;

      const event: ProjectScheduleEvent = {
        id: `${project.id}-${dateKey}`,
        title: project.name,
        projectNo: project.projectNo,
        href: projectDetailPath(project.id),
      };

      events[dateKey] = [...(events[dateKey] ?? []), event];
    }
  }

  for (const dateKey of Object.keys(events)) {
    events[dateKey].sort((left, right) => left.title.localeCompare(right.title));
  }

  return events;
}
