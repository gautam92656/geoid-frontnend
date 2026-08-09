import type { ConfigModuleDefinition } from "../data/configModules";

type FilterableModule = Pick<
  ConfigModuleDefinition,
  "title" | "description" | "tags" | "filterCategories" | "scope"
>;

type ModuleLibraryFilterOptions = {
  query?: string;
  category?: string;
  scope?: "all" | "common" | "user";
};

/**
 * Shared client-side filter for module library cards (category, scope, search).
 */
export function filterModuleLibrary<T extends FilterableModule>(
  modules: readonly T[],
  options: ModuleLibraryFilterOptions
): T[] {
  const query = options.query?.trim().toLowerCase() ?? "";
  const category = options.category && options.category !== "all" ? options.category : null;
  const scope = options.scope && options.scope !== "all" ? options.scope : null;

  return modules.filter((module) => {
    if (category && !module.filterCategories.includes(category)) return false;
    if (scope && module.scope !== scope) return false;
    if (!query) return true;

    const haystack = [
      module.title,
      module.description,
      module.scope,
      ...module.tags.map((tag) => tag.label),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}
