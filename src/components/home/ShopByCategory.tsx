import Link from "next/link";
import { cldImage } from "@/lib/images";

type CategoryTile = { id: string; name: string; slug: string; image: string | null };

interface ShopByCategoryProps {
  categories: CategoryTile[];
}

export function ShopByCategory({ categories }: ShopByCategoryProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-20 lg:py-24 bg-secondary/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-normal text-foreground">
            Shop by Category
          </h2>
          <p className="mt-4 text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            Clothing, bags, jewellery and nail extensions, curated for the modern wardrobe.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {categories.map((category) => (
            <Link 
              key={category.id} 
              href={`/categories/${category.slug}`}
              className="group relative block w-full overflow-hidden aspect-[4/5] bg-secondary"
            >
              {category.image && (
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{ backgroundImage: `url('${cldImage(category.image, 800)}')` }}
                />
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <h3 className="font-heading text-xl sm:text-2xl font-semibold text-white tracking-wide mb-2 drop-shadow-md">
                  {category.name}
                </h3>
                <span className="inline-block border-b border-white text-white text-[10px] font-medium tracking-[0.15em] uppercase opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 pb-1">
                  Explore
                </span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
