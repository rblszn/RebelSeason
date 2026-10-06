import Link from "next/link";
import { getCatalogCategories } from "@/lib/dal/catalog";
import { cldImage } from "@/lib/images";

export const revalidate = 3600;

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await getCatalogCategories();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="text-center mb-12">
        <h1 className="font-heading text-4xl sm:text-5xl font-medium mb-4">Categories</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Link key={category.id} href={`/categories/${category.slug}`} className="group relative block overflow-hidden aspect-square bg-secondary">
            {category.image && (
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('${cldImage(category.image, 800)}')` }}
              />
            )}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <h3 className="font-heading text-3xl text-white font-medium tracking-wide mb-3">
                {category.name}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
