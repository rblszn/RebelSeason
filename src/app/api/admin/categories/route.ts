import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidateCatalog } from "@/lib/cache";
import { getAllCategories } from "@/lib/dal/categories";
import { categoryInputSchema, resolveCategoryWrite } from "@/lib/admin-categories";

export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = categoryInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid category data" }, { status: 400 });
    }

    const write = await resolveCategoryWrite(parsed.data);
    if (!write.ok) return NextResponse.json({ error: write.error }, { status: write.status });

    const newCategory = await prisma.category.create({ data: write.data });

    revalidateCatalog();
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A category with this slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
