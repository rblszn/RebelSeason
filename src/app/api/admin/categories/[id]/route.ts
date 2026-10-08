import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidateCatalog } from "@/lib/cache";
import { getCategoryById } from "@/lib/dal/categories";
import { categoryInputSchema, resolveCategoryWrite } from "@/lib/admin-categories";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = categoryInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid category data" }, { status: 400 });
    }

    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const write = await resolveCategoryWrite(parsed.data, id);
    if (!write.ok) return NextResponse.json({ error: write.error }, { status: write.status });

    const updatedCategory = await prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({ where: { id }, data: write.data });
      // Categories always share their department's type.
      if (updated.type !== existingCategory.type) {
        await tx.category.updateMany({ where: { parentId: id }, data: { type: updated.type } });
      }
      return updated;
    });

    revalidateCatalog();
    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A category with this slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (existingCategory._count.children > 0) {
      return NextResponse.json(
        { error: "Cannot delete a department that still has categories. Move or delete them first." },
        { status: 400 }
      );
    }

    if (existingCategory._count.products > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with associated products" },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });
    revalidateCatalog();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
