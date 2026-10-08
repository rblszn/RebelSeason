import Link from "next/link";
import { getCatalogCategories } from "@/lib/dal/catalog";
import { cldImage } from "@/lib/images";

export const revalidate = 3600;

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const departments = await getCatalogCategories();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="text-center mb-14">
        <h1 className="font-heading text-4xl sm:text-5xl font-medium mb-4">Categories</h1>
      </div>

      <div className="space-y-16">
        {departments.map((department) => (
          <section key={department.id} aria-labelledby={`dept-${department.slug}`}>
            <div className="flex items-end justify-between border-b border-border pb-4 mb-6">
              <h2 id={`dept-${department.slug}`} className="font-heading text-2xl sm:text-3xl font-medium">
                {department.name}
              </h2>
              <Link
                href={`/categories/${department.slug}`}
                className="text-[11px] font-semibold uppercase tracking-[0.15em] underline underline-offset-4 hover:text-muted-foreground"
              >
                Shop all
              </Link>
            </div>

            {department.children.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {department.children.map((category) => (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug}`}
                    className="group relative block overflow-hidden aspect-[4/5] bg-secondary"
                  >
                    {category.image && (
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                        style={{ backgroundImage: `url('${cldImage(category.image, 800)}')` }}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                      <h3 className="font-heading text-xl sm:text-2xl text-white font-medium tracking-wide drop-shadow-md">
                        {category.name}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Categories coming soon.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
