import Link from "next/link";

export function Footer({ categories }: { categories: { name: string; slug: string }[] }) {
  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          
          {/* Brand Info */}
          <div className="space-y-5 lg:col-span-1">
            <div className="flex flex-col leading-none">
              <span className="font-heading italic text-xs text-background/50">The</span>
              <span className="font-heading text-xl font-semibold tracking-tight text-background uppercase">Rebel Season</span>
            </div>
            <p className="text-background/60 text-[13px] leading-relaxed max-w-xs">
              Premium fashion designed for the modern woman. Effortless elegance, everyday comfort.
            </p>
            <div className="flex space-x-5 pt-1">
              <a href="https://www.instagram.com/rebel_seasonn/" target="_blank" rel="noreferrer" className="text-background/60 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                <span className="sr-only">Instagram</span>
              </a>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-6 text-white/80">Shop</h4>
            <ul className="space-y-3 text-[13px] text-background/60">
              <li><Link href="/products" className="hover:text-white transition-colors">All Products</Link></li>
              {categories.map((c) => (
                <li key={c.slug}><Link href={`/categories/${c.slug}`} className="hover:text-white transition-colors">{c.name}</Link></li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-6 text-white/80">Support</h4>
            <ul className="space-y-3 text-[13px] text-background/60">
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link href="/shipping" className="hover:text-white transition-colors">Shipping &amp; Delivery</Link></li>
              <li><Link href="/returns" className="hover:text-white transition-colors">Cancellation &amp; Refunds</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

        </div>

        <div className="mt-16 pt-6 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-background/40">
          <p>&copy; {new Date().getFullYear()} The Rebel Season. All rights reserved.</p>
          <div className="flex space-x-6">
            <Link href="/privacy" className="hover:text-background/70 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-background/70 transition-colors">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
