import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartProvider } from "@/lib/cart-context";
import { getCatalogCategories } from "@/lib/dal/catalog";

// No session read here: keeping the shared layout free of cookies lets the
// catalog pages be served from cache. Pages that need the session read it
// themselves, and the header gets the signed-in name from a display cookie.
// Categories come from the shared catalog cache, not a per-request query.
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = (await getCatalogCategories()).map(({ name, slug }) => ({ name, slug }));

  return (
    <CartProvider>
      <Header categories={categories} />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer categories={categories} />
    </CartProvider>
  );
}
