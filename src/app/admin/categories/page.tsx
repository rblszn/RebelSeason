import { getAllCategories } from "@/lib/dal/categories";
import CategoriesClient from "./CategoriesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Categories | Admin",
};

export default async function CategoriesPage() {
  const categories = await getAllCategories();

  return <CategoriesClient initialCategories={categories} />;
}
