import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

// Admin-only (enforced by the proxy). Signs a direct browser → Cloudinary upload
// so files never pass through our server functions.
const ALLOWED_FOLDERS = new Set([
  "rebel-season/products",
  "rebel-season/categories",
  "rebel-season/storefront",
]);

export async function GET(request: Request) {
  try {
    const folder = new URL(request.url).searchParams.get("folder") || "rebel-season/storefront";
    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET!
    );
    return NextResponse.json({
      timestamp,
      signature,
      folder,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 });
  }
}
