import { Hero } from "@/components/home/Hero";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import { ShopByCategory } from "@/components/home/ShopByCategory";
import { TrendingProducts } from "@/components/home/TrendingProducts";
import { NewArrivalsProducts } from "@/components/home/NewArrivalsProducts";
import { OurProducts } from "@/components/home/OurProducts";
import { ReelsCarousel } from "@/components/home/ReelsCarousel";
import { Testimonials } from "@/components/home/Testimonials";

import { getSettings } from "@/lib/dal/settings";
import { getTrendingProducts, getNewArrivals, getAllCategories, getAllProducts } from "@/lib/dal";

export const revalidate = 3600; // revalidate every hour

export default async function HomePage() {
  const [trendingProducts, newArrivals, categories, allProducts, settings] = await Promise.all([
    getTrendingProducts(8),
    getNewArrivals(8),
    getAllCategories(),
    getAllProducts({ limit: 8 }),
    getSettings(),
  ]);

  return (
    <>
      <Hero />
      <NewArrivalsProducts products={newArrivals} />
      <ShopByCategory categories={categories} />
      <TrendingProducts products={trendingProducts} />
      <OurProducts products={allProducts} />
      <HomeCarousel />
      <ReelsCarousel settings={settings} />
      <Testimonials settings={settings} />
    </>
  );
}


