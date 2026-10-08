import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { CatalogFacets } from "@/lib/dal/catalog";
import { PRODUCT_TYPE_CONFIG, type ProductType } from "@/lib/catalog-config";
import {
  FILTER_KEYS,
  activeFilterCount,
  filtersHref,
  toggleFilterHref,
  emptyFilters,
  type CatalogFilters as Filters,
  type FilterKey,
} from "@/lib/catalog-filters";

const DEFAULT_LABELS: Record<FilterKey, string> = {
  size: "Size",
  color: "Color",
  material: "Material",
  shape: "Shape",
  finish: "Finish",
};

/** Uses the department's own wording (Fabric for clothing, Color / Finish for jewellery) when known. */
function groupLabel(key: FilterKey, type?: ProductType): string {
  if (!type) return DEFAULT_LABELS[key];
  const config = PRODUCT_TYPE_CONFIG[type];
  if (key === "size") return config.size.label;
  return config.fields.find((f) => f.key === key)?.label ?? DEFAULT_LABELS[key];
}

interface CatalogFiltersProps {
  basePath: string;
  facets: CatalogFacets;
  filters: Filters;
  /** Department of the page being browsed, if any. */
  type?: ProductType;
}

function FilterGroups({ basePath, facets, filters, type }: CatalogFiltersProps) {
  const groups = FILTER_KEYS.filter((key) => facets[key].length > 0);

  return (
    <div className="divide-y divide-border">
      {groups.map((key) => (
        <details key={key} open={filters[key].length > 0 || key === "size" || key === "color"} className="group py-4 first:pt-0">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-[0.15em]">
            {groupLabel(key, type)}
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {facets[key].map((value) => {
              const active = filters[key].includes(value);
              return (
                <Link
                  key={value}
                  href={toggleFilterHref(basePath, filters, key, value)}
                  scroll={false}
                  aria-pressed={active}
                  className={`border px-3 py-1.5 text-[12px] transition-colors ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:border-foreground"
                  }`}
                >
                  {value}
                </Link>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}

/**
 * Filter links for a catalog page. Everything lives in the URL, so it works
 * without client-side JavaScript. Sidebar on large screens, a collapsible
 * panel on small ones. Renders nothing when there is nothing to filter by.
 */
export function CatalogFilters({ basePath, facets, filters, type }: CatalogFiltersProps) {
  const hasFacets = FILTER_KEYS.some((key) => facets[key].length > 0);
  if (!hasFacets) return null;

  const count = activeFilterCount(filters);
  const clear = count > 0 && (
    <Link href={filtersHref(basePath, emptyFilters())} scroll={false} className="text-[11px] font-medium uppercase tracking-[0.1em] underline underline-offset-4 text-muted-foreground hover:text-foreground">
      Clear all
    </Link>
  );

  return (
    <aside className="w-full lg:w-56 lg:shrink-0">
      <details className="lg:hidden border border-border px-4 py-3" open={count > 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-[0.15em]">
          Filters{count > 0 ? ` (${count})` : ""}
          <ChevronDown className="h-4 w-4" />
        </summary>
        <div className="mt-4">
          <FilterGroups basePath={basePath} facets={facets} filters={filters} type={type} />
          {clear && <div className="mt-4">{clear}</div>}
        </div>
      </details>

      <div className="hidden lg:block">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em]">Filter</h2>
          {clear}
        </div>
        <FilterGroups basePath={basePath} facets={facets} filters={filters} type={type} />
      </div>
    </aside>
  );
}
