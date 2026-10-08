// Storefront filters live in the URL (?size=M,L&color=Black) so filtered pages
// can be shared and cached. This module turns the query string into a
// validated filter object and builds links that toggle one value.

export const FILTER_KEYS = ["size", "color", "material", "shape", "finish"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export type CatalogFilters = Record<FilterKey, string[]>;

const MAX_VALUES_PER_FILTER = 10;
const MAX_VALUE_LENGTH = 40;

type RawParams = { [key: string]: string | string[] | undefined };

export function emptyFilters(): CatalogFilters {
  return { size: [], color: [], material: [], shape: [], finish: [] };
}

export function parseFilters(params: RawParams): CatalogFilters {
  const filters = emptyFilters();
  for (const key of FILTER_KEYS) {
    const raw = params[key];
    const joined = Array.isArray(raw) ? raw.join(",") : raw ?? "";
    const values = joined
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0 && v.length <= MAX_VALUE_LENGTH);
    // Sorted + de-duplicated so the same selection always produces the same cache key.
    filters[key] = [...new Set(values)].sort().slice(0, MAX_VALUES_PER_FILTER);
  }
  return filters;
}

export function activeFilterCount(filters: CatalogFilters): number {
  return FILTER_KEYS.reduce((sum, key) => sum + filters[key].length, 0);
}

/** Link to the same page with `value` switched on or off for `key`; page resets to 1. */
export function toggleFilterHref(basePath: string, filters: CatalogFilters, key: FilterKey, value: string): string {
  const next = { ...filters, [key]: filters[key].includes(value) ? filters[key].filter((v) => v !== value) : [...filters[key], value] };
  return filtersHref(basePath, next);
}

export function filtersHref(basePath: string, filters: CatalogFilters): string {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    if (filters[key].length > 0) params.set(key, filters[key].join(","));
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
