import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProductById } from "@/lib/dal/products";
import { revalidateCatalog } from "@/lib/cache";
import { checkProductCategory, productData, productInputSchema, prismaErrorResponse, syncVariants } from "@/lib/admin-products";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = productInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid product data" }, { status: 400 });
    }
    const input = parsed.data;

    const check = await checkProductCategory(input);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: productData(input, check.type) });
      await syncVariants(tx, id, input.hasVariants, input.variants);
      return tx.product.findUnique({ where: { id }, include: { category: true, variants: true } });
    });

    revalidateCatalog();
    return NextResponse.json(product);
  } catch (error) {
    const known = prismaErrorResponse(error);
    if (known) return NextResponse.json({ error: known.error }, { status: known.status });
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.product.delete({
      where: { id }
    });
    revalidateCatalog();
    return NextResponse.json({ success: true });
  } catch (error) {
    const known = prismaErrorResponse(error);
    if (known) return NextResponse.json({ error: known.error }, { status: known.status });
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
