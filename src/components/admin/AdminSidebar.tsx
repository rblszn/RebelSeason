"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, FolderTree, ShoppingBag, Users, Store, ShieldCheck, X, ExternalLink, Tag } from "lucide-react";

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "Products",
    href: "/admin/products",
    icon: Package,
    exact: false,
  },
  {
    name: "Categories",
    href: "/admin/categories",
    icon: FolderTree,
    exact: false,
  },
  {
    name: "Orders",
    href: "/admin/orders",
    icon: ShoppingBag,
    exact: false,
  },
  {
    name: "Customers",
    href: "/admin/customers",
    icon: Users,
    exact: false,
  },
  {
    name: "Coupons",
    href: "/admin/coupons",
    icon: Tag,
    exact: false,
  },
  {
    name: "Storefront",
    href: "/admin/storefront",
    icon: Store,
    exact: false,
  },
];

export function AdminSidebar({ mobileOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isItemActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white">
      {/* Brand / Logo */}
      <div>
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 font-sans"
            onClick={onClose}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white shadow-xs">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-sm font-bold tracking-wider text-gray-900 uppercase">
                Rebel Season
              </span>
              <span className="block text-[10px] font-medium tracking-widest text-gray-600 uppercase">
                Admin Shell
              </span>
            </div>
          </Link>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div className="px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
            Main Menu
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isItemActive(item.href, item.exact);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-gray-900 text-white shadow-xs"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-white" : "text-gray-600"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom secondary links */}
      <div className="border-t border-gray-200 p-3">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 text-gray-600" />
            View Live Store
          </span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
            Storefront
          </span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {/* Mobile drawer backdrop and overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transition-transform duration-200 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
