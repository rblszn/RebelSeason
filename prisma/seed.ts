import { PrismaClient, ProductType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Clean existing data ───
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.user.deleteMany();

  // ─── Create Admin User ───
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@rebelseason.com",
      password: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log("Created admin:", admin.email);

  // ─── Create Sample Customers ───
  const customerPassword = await bcrypt.hash("customer123", 12);
  const customer1 = await prisma.user.create({
    data: {
      name: "Priya Sharma",
      email: "priya@example.com",
      phone: "9876543210",
      password: customerPassword,
      role: Role.CUSTOMER,
    },
  });
  const customer2 = await prisma.user.create({
    data: {
      name: "Ananya Gupta",
      email: "ananya@example.com",
      phone: "9876543211",
      password: customerPassword,
      role: Role.CUSTOMER,
    },
  });
  const customer3 = await prisma.user.create({
    data: {
      name: "Riya Patel",
      email: "riya@example.com",
      phone: "9876543212",
      password: customerPassword,
      role: Role.CUSTOMER,
    },
  });
  console.log("Created 3 customers");

  // ─── Create Addresses ───
  await prisma.address.create({
    data: {
      userId: customer1.id,
      name: "Priya Sharma",
      phone: "9876543210",
      street: "42 MG Road, Sector 17",
      city: "Gurgaon",
      state: "Haryana",
      pincode: "122001",
      isDefault: true,
    },
  });

  // ─── Create Departments & Categories ───
  const departmentDefs = [
    { name: "Clothing", slug: "clothing", type: ProductType.CLOTHING, description: "Tops, bottoms, dresses, co-ord sets, bikinis and winterwear", image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&q=80&w=800",
      children: [["Tops", "tops"], ["Bottoms & Jeans", "bottoms-jeans"], ["Dresses", "dresses"], ["Co-ord Sets", "co-ord-sets"], ["Bikinis", "bikinis"], ["Winterwear", "winterwear"]] },
    { name: "Bags", slug: "bags", type: ProductType.BAGS, description: "Handbags, totes, crossbody bags, backpacks and wallets", image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=800",
      children: [["Handbags", "handbags"], ["Totes", "totes"], ["Crossbody", "crossbody"], ["Backpacks", "backpacks"], ["Wallets", "wallets"]] },
    { name: "Jewellery", slug: "jewellery", type: ProductType.JEWELLERY, description: "Necklaces, earrings, rings and bracelets & bangles", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=800",
      children: [["Necklaces", "necklaces"], ["Earrings", "earrings"], ["Rings", "rings"], ["Bracelets & Bangles", "bracelets-bangles"]] },
    { name: "Nail Extensions", slug: "nail-extensions", type: ProductType.NAIL_EXTENSIONS, description: "Press-on sets and custom kits", image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=800",
      children: [["Press-on Sets", "press-on-sets"], ["Custom Kits", "custom-kits"]] },
  ];

  const categoryBySlug: Record<string, { id: string }> = {};
  for (const [i, dept] of departmentDefs.entries()) {
    const department = await prisma.category.create({
      data: { name: dept.name, slug: dept.slug, type: dept.type, description: dept.description, image: dept.image, sortOrder: (i + 1) * 10 },
    });
    categoryBySlug[dept.slug] = department;
    for (const [j, [name, slug]] of dept.children.entries()) {
      categoryBySlug[slug] = await prisma.category.create({
        data: { name, slug, type: dept.type, parentId: department.id, sortOrder: (j + 1) * 10 },
      });
    }
  }
  console.log("Created 4 departments with their categories");

  // ─── Create Products ───
  const LETTERS = ["S", "M", "L", "XL", "XXL"];
  const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=800`;
  type SeedProduct = {
    name: string; slug: string; category: string; price: number; originalPrice?: number; image: string; description: string;
    color?: string; material?: string; shape?: string; finish?: string; dimensions?: string;
    sizes?: string[]; stock?: number; isNew?: boolean; isBestSeller?: boolean; isFeatured?: boolean;
  };
  const productData: SeedProduct[] = [
    { name: "Floral Maxi Dress", slug: "floral-maxi-dress", category: "dresses", price: 4999, originalPrice: 5999, image: img("photo-1572804013309-59a88b7e92f1"), description: "A beautiful floral maxi dress perfect for summer occasions.", color: "Pink", material: "Cotton", sizes: LETTERS, isNew: true, isFeatured: true },
    { name: "Evening Silk Gown", slug: "evening-silk-gown", category: "dresses", price: 7499, originalPrice: 8999, image: img("photo-1566160980074-ce96bd9584c6"), description: "Luxurious silk gown for special evenings.", color: "Black", material: "Silk", sizes: LETTERS, isBestSeller: true },
    { name: "Ribbed Co-ord Set", slug: "ribbed-co-ord-set", category: "co-ord-sets", price: 2499, image: img("photo-1550639525-c97d455acf70"), description: "Comfortable ribbed co-ord set for casual outings.", color: "Beige", material: "Knit", sizes: LETTERS, isNew: true },
    { name: "Printed Co-ord Set", slug: "printed-co-ord-set", category: "co-ord-sets", price: 2999, image: img("photo-1596783049098-b80c5417b1bf"), description: "Trendy printed co-ord set.", color: "Multi", material: "Polyester", sizes: LETTERS, isFeatured: true },
    { name: "Satin Slip Skirt", slug: "satin-slip-skirt", category: "bottoms-jeans", price: 1999, originalPrice: 2499, image: img("photo-1583391733958-d2597285ea93"), description: "Elegant satin slip skirt.", color: "Olive", material: "Satin", sizes: LETTERS },
    { name: "High Rise Skinny Jeans", slug: "high-rise-skinny-jeans", category: "bottoms-jeans", price: 2799, image: img("photo-1541099649105-f69ad21f3246"), description: "Classic high rise skinny jeans.", color: "Blue", material: "Denim", sizes: ["28", "30", "32", "34"], isBestSeller: true },
    { name: "Relaxed Fit Mom Jeans", slug: "relaxed-fit-mom-jeans", category: "bottoms-jeans", price: 2499, image: img("photo-1604176354204-9268737828e4"), description: "Comfortable relaxed fit mom jeans.", color: "Black", material: "Denim", sizes: ["28", "30", "32", "34"], isNew: true },
    { name: "Linen Button-Down Top", slug: "linen-button-down-top", category: "tops", price: 1799, image: img("photo-1598554747436-c9293d6a588f"), description: "Breezy linen top for warm days.", color: "White", material: "Linen", sizes: LETTERS, isNew: true },
    { name: "Chunky Knit Cardigan", slug: "chunky-knit-cardigan", category: "winterwear", price: 3499, image: img("photo-1620799140408-edc6dcb6d633"), description: "Cozy chunky knit cardigan.", color: "Cream", material: "Wool", sizes: LETTERS, isFeatured: true },
    { name: "Cropped Puffer Jacket", slug: "cropped-puffer-jacket", category: "winterwear", price: 4999, originalPrice: 5999, image: img("photo-1544441893-675973e31985"), description: "Trendy cropped puffer jacket.", color: "Black", material: "Nylon", sizes: LETTERS, isNew: true, isBestSeller: true },
    { name: "Leather Tote Bag", slug: "leather-tote-bag", category: "totes", price: 3999, image: img("photo-1584916201218-f4242ceb4809"), description: "Premium tote bag with room for a laptop.", color: "Tan", material: "Leather", dimensions: "38 x 14 x 30 cm", stock: 25, isNew: true },
    { name: "Canvas Crossbody Bag", slug: "canvas-crossbody-bag", category: "crossbody", price: 1499, image: img("photo-1548036328-c9fa89d128fa"), description: "Casual canvas crossbody bag.", color: "Olive", material: "Canvas", dimensions: "24 x 8 x 18 cm", stock: 40, isFeatured: true },
    { name: "Pearl Drop Earrings", slug: "pearl-drop-earrings", category: "earrings", price: 599, originalPrice: 799, image: img("photo-1535632066927-ab7c9ab60908"), description: "Lightweight pearl drop earrings.", color: "Gold", material: "Brass", stock: 60, isNew: true, isBestSeller: true },
    { name: "Layered Chain Necklace", slug: "layered-chain-necklace", category: "necklaces", price: 899, image: img("photo-1599643478518-a784e5dc4c8f"), description: "Delicate layered chain necklace.", color: "Silver", material: "Stainless Steel", sizes: ['16"', '18"', '20"'], isFeatured: true },
    { name: "Stackable Stone Ring", slug: "stackable-stone-ring", category: "rings", price: 499, image: img("photo-1605100804763-247f67b3557e"), description: "Stackable ring with a small stone.", color: "Rose Gold", material: "Brass", sizes: ["6", "7", "8", "9"] },
    { name: "Glossy Almond Press-on Set", slug: "glossy-almond-press-on-set", category: "press-on-sets", price: 799, image: img("photo-1604654894610-df63bc536371"), description: "24 piece press-on set with glue and prep kit.", shape: "Almond", finish: "Glossy", sizes: ["XS", "S", "M", "L"], isNew: true, isBestSeller: true },
    { name: "Matte Coffin Press-on Set", slug: "matte-coffin-press-on-set", category: "press-on-sets", price: 849, image: img("photo-1519014816548-bf5fe059798b"), description: "Matte nude coffin set.", shape: "Coffin", finish: "Matte", sizes: ["XS", "S", "M", "L"] },
  ];

  const createdProducts = [];

  for (const pData of productData) {
    const sizes = pData.sizes ?? [];
    const variantStocks = sizes.map((_, i) => [10, 15, 20, 12, 8][i % 5]);
    const product = await prisma.product.create({
      data: {
        name: pData.name,
        slug: pData.slug,
        categoryId: categoryBySlug[pData.category].id,
        price: pData.price,
        originalPrice: pData.originalPrice || null,
        discount: pData.originalPrice ? Math.round(((pData.originalPrice - pData.price) / pData.originalPrice) * 100) : null,
        images: [pData.image],
        isNew: pData.isNew || false,
        isBestSeller: pData.isBestSeller || false,
        isFeatured: pData.isFeatured || false,
        hasVariants: sizes.length > 0,
        stock: sizes.length > 0 ? variantStocks.reduce((a, b) => a + b, 0) : pData.stock || 0,
        description: pData.description,
        color: pData.color || null,
        material: pData.material || null,
        shape: pData.shape || null,
        finish: pData.finish || null,
        dimensions: pData.dimensions || null,
        variants: { create: sizes.map((size, i) => ({ size, stock: variantStocks[i] })) },
      },
    });
    createdProducts.push(product);
  }
  console.log(`Created ${createdProducts.length} products across the four departments`);

  // ─── Create Sample Orders ───
  const order1 = await prisma.order.create({
    data: {
      orderNumber: "RS-10001",
      customerId: customer1.id,
      subtotal: 4999,
      total: 4999,
      status: "DELIVERED",
      customerName: customer1.name,
      customerEmail: customer1.email,
      customerPhone: customer1.phone,
      shippingAddress: { name: "Priya Sharma", street: "42 MG Road, Sector 17", city: "Gurgaon", state: "Haryana", pincode: "122001" },
      items: {
        create: {
          productId: createdProducts[0].id,
          name: createdProducts[0].name,
          quantity: 1,
          price: 4999,
          image: createdProducts[0].images[0],
          variantName: "M",
        },
      },
      payment: {
        create: {
          amount: 4999,
          method: "ONLINE",
          status: "CAPTURED",
          capturedAt: new Date(),
        },
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: "RS-10002",
      customerId: customer2.id,
      subtotal: 7499,
      total: 7499,
      status: "SHIPPED",
      customerName: customer2.name,
      customerEmail: customer2.email,
      shippingAddress: { name: "Ananya Gupta", street: "15 Park Street", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
      items: {
        create: {
          productId: createdProducts[1].id,
          name: createdProducts[1].name,
          quantity: 1,
          price: 7499,
          image: createdProducts[1].images[0],
          variantName: "L",
        },
      },
      payment: {
        create: {
          amount: 7499,
          method: "COD",
          status: "UNPAID",
        },
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      orderNumber: "RS-10003",
      customerId: customer3.id,
      subtotal: 5498,
      total: 5498,
      status: "PENDING",
      customerName: customer3.name,
      customerEmail: customer3.email,
      shippingAddress: { name: "Riya Patel", street: "8 Ashram Road", city: "Ahmedabad", state: "Gujarat", pincode: "380009" },
      items: {
        create: [
          { productId: createdProducts[2].id, name: createdProducts[2].name, quantity: 1, price: 2499, image: createdProducts[2].images[0], variantName: "S" },
          { productId: createdProducts[4].id, name: createdProducts[4].name, quantity: 1, price: 1999, image: createdProducts[4].images[0], variantName: "M" },
        ],
      },
      payment: {
        create: {
          amount: 5498,
          method: "ONLINE",
          status: "CAPTURED",
          capturedAt: new Date(),
        },
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: "RS-10004",
      customerId: customer1.id,
      subtotal: 3999,
      total: 3999,
      status: "CONFIRMED",
      customerName: customer1.name,
      customerEmail: customer1.email,
      customerPhone: customer1.phone,
      shippingAddress: { name: "Priya Sharma", street: "42 MG Road, Sector 17", city: "Gurgaon", state: "Haryana", pincode: "122001" },
      items: {
        create: { productId: createdProducts[10].id, name: createdProducts[10].name, quantity: 1, price: 3999, image: createdProducts[10].images[0] },
      },
      payment: {
        create: { amount: 3999, method: "ONLINE", status: "CAPTURED", capturedAt: new Date() },
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: "RS-10005",
      customerId: customer2.id,
      subtotal: 2799,
      total: 2799,
      status: "PROCESSING",
      customerName: customer2.name,
      customerEmail: customer2.email,
      shippingAddress: { name: "Ananya Gupta", street: "15 Park Street", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
      items: {
        create: { productId: createdProducts[5].id, name: createdProducts[5].name, quantity: 1, price: 2799, image: createdProducts[5].images[0], variantName: "30" },
      },
      payment: {
        create: { amount: 2799, method: "COD", status: "UNPAID" },
      },
    },
  });
  console.log("Created 5 sample orders");

  // ─── Create Sample Reviews ───
  await prisma.review.createMany({
    data: [
      { userId: customer1.id, productId: createdProducts[0].id, rating: 5, title: "Absolutely stunning!", comment: "The fabric is so soft and the fit is perfect. I got so many compliments!" },
      { userId: customer2.id, productId: createdProducts[1].id, rating: 4, title: "Beautiful gown", comment: "Really elegant. Just needed minor alterations but overall great quality." },
      { userId: customer3.id, productId: createdProducts[5].id, rating: 5, title: "Perfect fit!", comment: "These jeans fit like a dream. Will definitely order more." },
    ],
  });
  console.log("Created 3 sample reviews");

  console.log("Database seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
