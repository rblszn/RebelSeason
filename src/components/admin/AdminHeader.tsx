"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, Loader2, UserCheck } from "lucide-react";

interface AdminHeaderProps {
  onMenuClick?: () => void;
  title?: string;
}

export function AdminHeader({
  onMenuClick,
  title = "Dashboard",
}: AdminHeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });
      // Force reload to clear client router cache and redirect to login
      window.location.href = "/admin/login";
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6">
      {/* Left side: Hamburger (mobile) + Page Title */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-semibold text-gray-900 sm:text-xl font-sans">
            {title}
          </h1>
        </div>
      </div>

      {/* Right side: Admin profile + Logout button */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 sm:flex">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white">
            A
          </div>
          <span className="text-xs font-medium text-gray-700">Admin</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" title="Active" />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-2xs hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          title="Sign out of Admin Panel"
        >
          {isLoggingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
        </button>
      </div>
    </header>
  );
}
