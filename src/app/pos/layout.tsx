import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: { default: "POS", template: "%s | Rebel Season POS" },
  robots: { index: false, follow: false },
  manifest: "/api/pos/manifest",
  appleWebApp: { capable: true, title: "Rebel Season POS", statusBarStyle: "black-translucent" },
  icons: { apple: "/api/pos/icon?size=180" },
};

export const viewport: Viewport = {
  themeColor: "#1A1A1A",
  width: "device-width",
  initialScale: 1,
};

/** The in-store billing counter. Separate from the storefront (no header/footer, no cart). */
export default function PosRootLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
