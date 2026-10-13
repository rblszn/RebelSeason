// Storefront filters and sorting live in the URL (?size=M,L&color=Black&sort=price-asc)
// so filtered pages can be shared and cached. This module turns the query
// string into validated values and builds links that toggle one choice.

export const FILTER_KEYS = ["size", "color", "material", "shape", "finish", "price", "instock"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export type CatalogFilters = Record<FilterKey, string[]>;

export const SORT_OPTIONS = [
  { id: "newest", label: "Newest" },
  { id: "best-sellers", label: "Best sellers" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["id"];
export const DEFAULT_SORT: SortKey = "newest";

export interface PriceRange {
  id: string;
  label: string;
  /** Inclusive lower bound in rupees. */
  min: number;
  /** Exclusive upper bound; omitted for "and above". */
  max?: number;
}

export const PRICE_RANGES: PriceRange[] = [
  { id: "0-500", label: "Under ₹500", min: 0, max: 500 },
  { id: "500-1000", label: "₹500 – ₹999", min: 500, max: 1000 },
  { id: "1000-2000", label: "₹1,000 – ₹1,999", min: 1000, max: 2000 },
  { id: "2000-5000", label: "₹2,000 – ₹4,999", min: 2000, max: 5000 },
  { id: "5000-", label: "₹5,000 & above", min: 5000 },
];

/** Filters whose chips show a friendly label instead of the stored value. */
const CHIP_LABELS: Partial<Record<FilterKey, (value: string) => string>> = {
  price: (value) => PRICE_RANGES.find((r) => r.id === value)?.label ?? value,
  instock: () => "In stock only",
};

export function chipLabel(key: FilterKey, value: string): string {
  return CHIP_LABELS[key]?.(value) ?? value;
}

const MAX_VALUES_PER_FILTER = 10;
const MAX_VALUE_LENGTH = 40;

type RawParams = { [key: string]: string | string[] | undefined };

export function emptyFilters(): CatalogFilters {
  return { size: [], color: [], material: [], shape: [], finish: [], price: [], instock: [] };
}

export function parseFilters(params: RawParams): CatalogFilters {
  const filters = emptyFilters();
  for (const key of FILTER_KEYS) {
    const raw = params[key];
    const joined = Array.isArray(raw) ? raw.join(",") : raw ?? "";
    let values = joined
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0 && v.length <= MAX_VALUE_LENGTH);
    // Only known price ranges and the "1" switch are accepted for these two.
    if (key === "price") values = values.filter((v) => PRICE_RANGES.some((r) => r.id === v));
    if (key === "instock") values = values.includes("1") ? ["1"] : [];
    // Sorted + de-duplicated so the same selection always produces the same cache key.
    filters[key] = [...new Set(values)].sort().slice(0, MAX_VALUES_PER_FILTER);
  }
  return filters;
}

export function parseSort(params: RawParams): SortKey {
  const raw = params.sort;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return SORT_OPTIONS.find((o) => o.id === value)?.id ?? DEFAULT_SORT;
}

export function activeFilterCount(filters: CatalogFilters): number {
  return FILTER_KEYS.reduce((sum, key) => sum + filters[key].length, 0);
}

/** Link to the same page with `value` switched on or off for `key`; page resets to 1. */
export function toggleFilterHref(
  basePath: string,
  filters: CatalogFilters,
  sort: SortKey,
  key: FilterKey,
  value: string
): string {
  const next = {
    ...filters,
    [key]: filters[key].includes(value) ? filters[key].filter((v) => v !== value) : [...filters[key], value],
  };
  return filtersHref(basePath, next, sort);
}

/** Link with the given filters and sort (the default sort is left out of the address). */
export function filtersHref(basePath: string, filters: CatalogFilters, sort: SortKey = DEFAULT_SORT): string {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    if (filters[key].length > 0) params.set(key, filters[key].join(","));
  }
  if (sort !== DEFAULT_SORT) params.set("sort", sort);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
