import { Hero } from "@/components/home/Hero";
import { DailyDrop } from "@/components/home/DailyDrop";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import { ShopByCategory } from "@/components/home/ShopByCategory";
import { TrendingProducts } from "@/components/home/TrendingProducts";
import { NewArrivalsProducts } from "@/components/home/NewArrivalsProducts";
import { OurProducts } from "@/components/home/OurProducts";
import { ReelsCarousel } from "@/components/home/ReelsCarousel";
import { Testimonials } from "@/components/home/Testimonials";
import { getHomePageData } from "@/lib/dal/catalog";

// Served from cache and refreshed at most once a minute, so the Daily Drop section
// appears (and rolls over into New Arrivals) right on schedule.
export const revalidate = 60;

export default async function HomePage() {
  const { drop, newArrivals, trending, categories, settings } = await getHomePageData();

  return (
    <>
      <Hero />
      <DailyDrop drop={drop} />
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
