"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Search, User, ShoppingBag, Menu, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export function Header({ user }: { user?: { name: string } | null }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  return (
    <div className="w-full flex flex-col relative z-50">
      {/* Pink Announcement Bar (Always in normal document flow) */}
      <div className="w-full bg-primary py-2.5 px-4 text-center text-[11px] sm:text-xs tracking-wide font-medium text-primary-foreground relative z-[60]">
        ✦ Free Shipping on Orders Over ₹2,000 &bull; Easy Returns ✦
      </div>

      {/* Main Navbar (Overlays hero on homepage) */}
      <header className={`w-full transition-colors duration-300 ${isHome ? "absolute top-full left-0 right-0 bg-transparent border-none" : "sticky top-0 bg-background border-b border-border"}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Nav Links */}
            <nav className="hidden md:flex items-center gap-6 text-[12px] font-medium text-foreground flex-1">
              <Link href="/categories/dresses" className="hover:text-muted-foreground transition-colors uppercase tracking-wide">Dresses</Link>
              <Link href="/categories/co-ords" className="hover:text-muted-foreground transition-colors uppercase tracking-wide">Co-ords</Link>
              <Link href="/categories/bottoms" className="hover:text-muted-foreground transition-colors uppercase tracking-wide">Bottoms</Link>
              <Link href="/categories/bags" className="hover:text-muted-foreground transition-colors uppercase tracking-wide">Bags</Link>
              <Link href="/categories/jeans" className="hover:text-muted-foreground transition-colors uppercase tracking-wide">Jeans</Link>
              <Link href="/categories/winterwear" className="hover:text-muted-foreground transition-colors uppercase tracking-wide">Winterwear</Link>
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden flex-1">
              <button 
                className="p-2 -ml-2 text-foreground"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 stroke-[1.5]" />
                ) : (
                  <Menu className="w-6 h-6 stroke-[1.5]" />
                )}
                <span className="sr-only">Menu</span>
              </button>
            </div>

            {/* Center: Brand Logo */}
            <div className="flex items-center justify-center flex-shrink-0 mx-4">
              <Link href="/" className="flex flex-col items-center leading-none">
                <span className="font-heading text-[10px] tracking-[0.15em] text-foreground/60 uppercase">The</span>
                <span className="font-heading text-xl sm:text-2xl font-semibold tracking-tight text-foreground uppercase leading-tight">
                  Rebel Season
                </span>
              </Link>
            </div>

            {/* Right: Icons & Auth */}
            <div className="flex items-center justify-end gap-5 flex-1">
                            <button className="text-foreground hover:text-muted-foreground transition-colors">
                <Search className="w-5 h-5 stroke-[1.5]" />
                <span className="sr-only">Search</span>
              </button>
                            <Link href="/account" className="text-foreground hover:text-muted-foreground transition-colors">
                {user ? (
                  <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-medium tracking-wide">
                    {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                ) : (
                  <>
                    <User className="w-5 h-5 stroke-[1.5]" />
                    <span className="sr-only">Account</span>
                  </>
                )}
              </Link>
              <Link href="/cart" className="text-foreground hover:text-muted-foreground transition-colors relative">
                <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
                <span className="sr-only">Cart</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-40 flex flex-col pt-24 px-6 md:hidden">
          <nav className="flex flex-col space-y-8 text-xl font-medium items-center text-center mt-12">
            <Link href="/categories/dresses" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-muted-foreground transition-colors uppercase tracking-wide">Dresses</Link>
            <Link href="/categories/co-ords" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-muted-foreground transition-colors uppercase tracking-wide">Co-ords</Link>
            <Link href="/categories/bottoms" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-muted-foreground transition-colors uppercase tracking-wide">Bottoms</Link>
            <Link href="/categories/bags" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-muted-foreground transition-colors uppercase tracking-wide">Bags</Link>
            <Link href="/categories/jeans" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-muted-foreground transition-colors uppercase tracking-wide">Jeans</Link>
            <Link href="/categories/winterwear" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-muted-foreground transition-colors uppercase tracking-wide">Winterwear</Link>
            
            
          </nav>
        </div>
      )}

    </div>
  );
}

