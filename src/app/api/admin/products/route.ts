import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAllProducts } from "@/lib/dal/products";
import { revalidateCatalog } from "@/lib/cache";
import { checkProductCategory, productData, productInputSchema, prismaErrorResponse } from "@/lib/admin-products";

export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = productInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid product data" }, { status: 400 });
    }
    const input = parsed.data;

    const check = await checkProductCategory(input);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    const product = await prisma.product.create({
      data: {
        ...productData(input, check.type),
        variants: input.hasVariants && input.variants.length > 0 ? { create: input.variants } : undefined,
      },
      include: {
        category: true,
        variants: true,
      },
    });

    revalidateCatalog();
    return NextResponse.json(product);
  } catch (error) {
    const known = prismaErrorResponse(error);
    if (known) return NextResponse.json({ error: known.error }, { status: known.status });
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
