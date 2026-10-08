"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { User, ShoppingBag, Menu, X, ChevronDown } from "lucide-react";
import { useCart } from "@/lib/cart-context";

const DISPLAY_NAME_COOKIE = "rs_display_name";

const subscribeNoop = () => () => {};

function readDisplayName(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${DISPLAY_NAME_COOKIE}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(DISPLAY_NAME_COOKIE.length + 1)) || null;
  } catch {
    return null;
  }
}

export type NavCategory = { name: string; slug: string; children: { name: string; slug: string }[] };

export function Header({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname();
  // Read on every render (each navigation re-renders the header), so login and
  // logout show up without a reload. The server snapshot is always signed-out.
  const userName = useSyncExternalStore(subscribeNoop, readDisplayName, () => null);

  const isHome = pathname === "/";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDepartment, setOpenDepartment] = useState<string | null>(null);
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  return (
    <div className="w-full flex flex-col relative z-50">
      {/* Pink Announcement Bar (Always in normal document flow) */}
      <div className="w-full bg-primary py-2.5 px-4 text-center text-[11px] sm:text-xs tracking-wide font-medium text-primary-foreground relative z-[60]">
        ✦ Free Shipping on Orders Over ₹2,000 ✦
      </div>

      {/* Main Navbar (Overlays hero on homepage) */}
      <header className={`w-full transition-colors duration-300 ${isHome ? "absolute top-full left-0 right-0 bg-transparent border-none" : "sticky top-0 bg-background border-b border-border"}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Nav Links */}
            <nav className="hidden md:flex items-center gap-6 text-[12px] font-medium text-foreground flex-1">
              {categories.map((c) => (
                <div key={c.slug} className="group relative flex h-16 items-center">
                  <Link href={`/categories/${c.slug}`} className="hover:text-muted-foreground transition-colors uppercase tracking-wide">{c.name}</Link>
                  {c.children.length > 0 && (
                    <div className="invisible absolute left-0 top-full z-50 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                      <ul className="min-w-[220px] border border-border bg-background py-3 shadow-lg">
                        {c.children.map((child) => (
                          <li key={child.slug}>
                            <Link href={`/categories/${child.slug}`} className="block px-5 py-2 text-[12px] font-normal normal-case tracking-normal text-foreground hover:bg-secondary">{child.name}</Link>
                          </li>
                        ))}
                        <li className="mt-1 border-t border-border pt-1">
                          <Link href={`/categories/${c.slug}`} className="block px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground hover:bg-secondary">Shop all {c.name}</Link>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              ))}
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
              <Link href="/account" className="text-foreground hover:text-muted-foreground transition-colors">
                {userName ? (
                  <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-medium tracking-wide">
                    {userName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    <span className="sr-only">Account</span>
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
          <nav className="flex flex-col space-y-6 text-xl font-medium items-center text-center mt-8 overflow-y-auto pb-10">
            {categories.map((c) => {
              const isOpen = openDepartment === c.slug;
              return (
                <div key={c.slug} className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <Link href={`/categories/${c.slug}`} onClick={() => setIsMobileMenuOpen(false)} className="hover:text-muted-foreground transition-colors uppercase tracking-wide">{c.name}</Link>
                    {c.children.length > 0 && (
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-label={`Show ${c.name} categories`}
                        onClick={() => setOpenDepartment(isOpen ? null : c.slug)}
                        className="p-1 text-muted-foreground"
                      >
                        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <ul className="mt-4 flex flex-col space-y-3 text-base font-normal text-muted-foreground">
                      {c.children.map((child) => (
                        <li key={child.slug}>
                          <Link href={`/categories/${child.slug}`} onClick={() => setIsMobileMenuOpen(false)} className="hover:text-foreground transition-colors">{child.name}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      )}

    </div>
  );
}

