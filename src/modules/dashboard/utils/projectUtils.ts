import type { Project } from "../types/project";

export function getProjectTitle(project: Pick<Project, "projectNo" | "name">) {
  return `${project.projectNo} - ${project.name}`;
}

export function getProjectDisplayLabel(project: Pick<Project, "projectNo">) {
  return project.projectNo;
}

export function getLotNumber(location: string) {
  const match = location.match(/^Lot\s+\S+/i);
  return match ? match[0] : location;
}
