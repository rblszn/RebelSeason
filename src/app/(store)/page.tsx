import { Hero } from "@/components/home/Hero";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import { ShopByCategory } from "@/components/home/ShopByCategory";
import { TrendingProducts } from "@/components/home/TrendingProducts";
import { NewArrivalsProducts } from "@/components/home/NewArrivalsProducts";
import { OurProducts } from "@/components/home/OurProducts";
import { ReelsCarousel } from "@/components/home/ReelsCarousel";
import { Testimonials } from "@/components/home/Testimonials";
import { getHomePageData } from "@/lib/dal/catalog";

// Served from cache; refreshed when the catalog changes or at most hourly.
export const revalidate = 3600;

export default async function HomePage() {
  const { newArrivals, trending, categories, settings } = await getHomePageData();

  return (
    <>
      <Hero />
      <NewArrivalsProducts products={newArrivals} />
      <ShopByCategory categories={categories} />
      <TrendingProducts products={trending} />
      <OurProducts products={newArrivals} />
      <HomeCarousel />
      <ReelsCarousel settings={settings} />
      <Testimonials settings={settings} />
    </>
  );
}
