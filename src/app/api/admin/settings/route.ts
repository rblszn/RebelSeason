import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/dal/settings";
import { revalidateCatalog } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
    }

    const entries = Object.entries(body).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && /^[a-z0-9_]{1,64}$/i.test(entry[0]) && entry[1].length <= 100_000
    );
    if (entries.length > 50) {
      return NextResponse.json({ error: "Too many settings" }, { status: 400 });
    }

    // One round trip instead of one query per setting.
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
      )
    );

    revalidateCatalog();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
