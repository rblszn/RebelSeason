import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { Pagination } from "@/components/ui/Pagination";
import { CatalogFilters } from "@/components/store/CatalogFilters";
import type { CatalogFacets, ProductCardData } from "@/lib/dal/catalog";
import type { ProductType } from "@/lib/catalog-config";
import { activeFilterCount, type CatalogFilters as Filters } from "@/lib/catalog-filters";

export type CatalogCrumb = { label: string; href?: string };
export type CatalogPill = { label: string; href: string; active?: boolean };

interface CatalogViewProps {
  title: string;
  description?: string | null;
  breadcrumb?: CatalogCrumb[];
  /** Quick links to the categories of a department. */
  pills?: CatalogPill[];
  basePath: string;
  type?: ProductType;
  products: ProductCardData[];
  total: number;
  totalPages: number;
  page: number;
  facets: CatalogFacets;
  filters: Filters;
}

/** Shared layout for the Shop page and department / category pages: heading, category pills, filters, grid. */
export function CatalogView({
  title,
  description,
  breadcrumb,
  pills,
  basePath,
  type,
  products,
  total,
  totalPages,
  page,
  facets,
  filters,
}: CatalogViewProps) {
  const filtered = activeFilterCount(filters) > 0;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center text-[11px] font-medium tracking-[0.1em] uppercase text-muted-foreground mb-8">
          {breadcrumb.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center">
              {i > 0 && <ChevronRight className="w-3 h-3 mx-3" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground transition-colors">{crumb.label}</Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col items-center text-center mb-10">
        <h1 className="font-heading text-4xl sm:text-5xl font-medium mb-4">{title}</h1>
        {description && <p className="text-muted-foreground text-[15px] font-light max-w-2xl">{description}</p>}
      </div>

      {pills && pills.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {pills.map((pill) => (
            <Link
              key={pill.href}
              href={pill.href}
              className={`border px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] transition-colors ${
                pill.active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground hover:border-foreground"
              }`}
            >
              {pill.label}
            </Link>
          ))}
        </div>
      )}

      <div className="flex justify-center items-center py-4 border-y border-border mb-10">
        <div className="text-[12px] uppercase tracking-[0.1em] text-muted-foreground font-medium">
          {total} {total === 1 ? "Result" : "Results"}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <CatalogFilters basePath={basePath} facets={facets} filters={filters} type={type} />

        <div className="flex-1 min-w-0">
          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-12">
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} priority={i < 4} />
                ))}
              </div>
              <Pagination totalPages={totalPages} currentPage={page} />
            </>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              {filtered ? "No products match these filters." : "No products found here yet."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
